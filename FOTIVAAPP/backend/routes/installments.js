const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const { Event } = require('../models/models');
const { sendPushToUser } = require('./push');

router.use(auth, requireActive);

// Gera lista de parcelas para um evento
function gerarParcelas(event) {
  const { totalValue, amountPaid, installments, firstDueDate, dueDay } = event;
  if (!installments || installments <= 1) return [];

  const restante = totalValue - (amountPaid || 0);
  const valorParcela = Math.round((restante / installments) * 100) / 100;
  const list = [];

  let baseDate = firstDueDate ? new Date(firstDueDate) : new Date();
  if (!firstDueDate && dueDay) {
    // Calcula próximo vencimento baseado no dueDay
    const hoje = new Date();
    baseDate = new Date(hoje.getFullYear(), hoje.getMonth(), dueDay);
    if (baseDate <= hoje) baseDate.setMonth(baseDate.getMonth() + 1);
  }

  for (let i = 0; i < installments; i++) {
    const due = new Date(baseDate);
    due.setMonth(due.getMonth() + i);
    if (dueDay) due.setDate(dueDay);
    list.push({
      number:  i + 1,
      total:   installments,
      value:   i === installments - 1
        ? Math.round((restante - valorParcela * (installments - 1)) * 100) / 100  // última parcela ajusta arredondamento
        : valorParcela,
      dueDate: due,
      paid:    false,
      paidAt:  null,
    });
  }
  return list;
}

// Listar todos os pagamentos pendentes do fotógrafo (ordenados por vencimento)
router.get('/pending', async (req, res) => {
  const events = await Event.find({ userId: req.user._id, status: { $ne: 'cancelado' } })
    .select('clientName eventType totalValue amountPaid installmentList installments dueDay');

  const pending = [];
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  for (const ev of events) {
    for (const inst of (ev.installmentList || [])) {
      if (!inst.paid) {
        const due = new Date(inst.dueDate);
        due.setHours(0,0,0,0);
        const diffDays = Math.round((due - hoje) / 86400000);
        pending.push({
          eventId:      ev._id,
          installmentId:inst._id,
          clientName:   ev.clientName,
          eventType:    ev.eventType,
          number:       inst.number,
          total:        inst.total,
          value:        inst.value,
          dueDate:      inst.dueDate,
          diffDays,
          status: diffDays < 0 ? 'atrasado' : diffDays === 0 ? 'vence_hoje' : diffDays <= 3 ? 'vence_em_breve' : 'pendente',
        });
      }
    }
  }

  pending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  res.json(pending);
});

// Marcar parcela como paga
router.post('/:eventId/pay/:installmentId', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.eventId, userId: req.user._id });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const inst = event.installmentList.id(req.params.installmentId);
  if (!inst) return res.status(404).json({ error: 'Parcela não encontrada' });

  inst.paid   = true;
  inst.paidAt = new Date();
  event.amountPaid = (event.amountPaid || 0) + inst.value;
  await event.save();

  const totalPaid = event.installmentList.filter(i => i.paid).reduce((s,i) => s + i.value, 0) + (event.amountPaid - inst.value);
  const saldo = event.totalValue - event.amountPaid;

  res.json({ ok: true, paidAt: inst.paidAt, saldo: Math.max(0, saldo) });
});

// Desmarcar pagamento
router.post('/:eventId/unpay/:installmentId', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.eventId, userId: req.user._id });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const inst = event.installmentList.id(req.params.installmentId);
  if (!inst || !inst.paid) return res.status(400).json({ error: 'Parcela não estava paga' });

  event.amountPaid = Math.max(0, (event.amountPaid || 0) - inst.value);
  inst.paid   = false;
  inst.paidAt = null;
  await event.save();
  res.json({ ok: true });
});

// Regenerar parcelas de um evento (quando edita)
router.post('/:eventId/regenerate', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.eventId, userId: req.user._id });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  // Mantém parcelas já pagas
  const paidOnes = (event.installmentList || []).filter(i => i.paid);
  const newList  = gerarParcelas(event);

  // Reaplica status das pagas
  paidOnes.forEach(p => {
    if (newList[p.number - 1]) {
      newList[p.number - 1].paid   = true;
      newList[p.number - 1].paidAt = p.paidAt;
    }
  });

  event.installmentList = newList;
  await event.save();
  res.json({ ok: true, installmentList: event.installmentList });
});

// Notificação diária de vencimentos (chamada pelo cron)
router.post('/notify-due', async (req, res) => {
  // Segurança básica — só chamada interna
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_KEY && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  const doisDias = new Date(hoje); doisDias.setDate(doisDias.getDate() + 2);

  // Busca todas as parcelas que vencem hoje ou amanhã
  const events = await Event.find({
    'installmentList.paid': false,
    'installmentList.dueDate': { $gte: hoje, $lte: doisDias },
  }).populate('userId', '_id name');

  let notified = 0;
  for (const ev of events) {
    for (const inst of ev.installmentList) {
      if (inst.paid) continue;
      const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
      const diffDays = Math.round((due - hoje) / 86400000);
      if (diffDays < 0 || diffDays > 1) continue;

      const msg = diffDays === 0
        ? `⚠️ Hoje vence a parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`
        : `📅 Amanhã vence a parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`;

      try {
        await sendPushToUser(ev.userId._id, {
          title: 'Fotiva — Vencimento de Parcela',
          body: msg,
          tag: `installment-${ev._id}-${inst._id}`,
          data: { url: '/pagamentos' },
        });
        notified++;
      } catch {}
    }
  }

  res.json({ ok: true, notified });
});

module.exports = router;
module.exports.gerarParcelas = gerarParcelas;
