const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth, requireActive);

// GET /api/installments/pending
router.get('/pending', async (req, res) => {
  const installments = await prisma.installment.findMany({
    where:   { paid: false, event: { userId: req.user.id, archived: false, status: { not: 'cancelado' } } },
    include: { event: { select: { clientName: true, eventType: true, totalValue: true, amountPaid: true } } },
    orderBy: { dueDate: 'asc' },
  });

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const result = installments.map(inst => {
    const due      = new Date(inst.dueDate); due.setHours(0,0,0,0);
    const diffDays = Math.round((due - hoje) / 86400000);
    return {
      installmentId: inst.id,
      eventId:       inst.eventId,
      clientName:    inst.event.clientName,
      eventType:     inst.event.eventType,
      number:        inst.number,
      total:         inst.total,
      value:         inst.value,
      dueDate:       inst.dueDate,
      diffDays,
      status: diffDays < 0 ? 'atrasado' : diffDays === 0 ? 'vence_hoje' : diffDays <= 3 ? 'vence_em_breve' : 'pendente',
    };
  });

  res.json(result);
});

// POST /api/installments/:eventId/pay/:installmentId
router.post('/:eventId/pay/:installmentId', async (req, res) => {
  const event = await prisma.event.findFirst({
    where:   { id: req.params.eventId, userId: req.user.id },
    include: { installmentList: true },
  });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const inst = event.installmentList.find(i => i.id === req.params.installmentId);
  if (!inst) return res.status(404).json({ error: 'Parcela não encontrada' });
  if (inst.paid) return res.status(400).json({ error: 'Parcela já está paga' });

  await prisma.installment.update({
    where: { id: inst.id },
    data:  { paid: true, paidAt: new Date() },
  });

  // Recalcula amountPaid a partir de todas as parcelas pagas
  const todasPagas = await prisma.installment.findMany({
    where: { eventId: event.id, paid: true },
  });
  const amountPaid = todasPagas.reduce((sum, i) => sum + i.value, 0);
  await prisma.event.update({ where: { id: event.id }, data: { amountPaid } });

  res.json({ ok: true, paidAt: new Date(), amountPaid, saldo: Math.max(0, event.totalValue - amountPaid) });
});

// POST /api/installments/:eventId/unpay/:installmentId
router.post('/:eventId/unpay/:installmentId', async (req, res) => {
  const event = await prisma.event.findFirst({
    where:   { id: req.params.eventId, userId: req.user.id },
    include: { installmentList: true },
  });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const inst = event.installmentList.find(i => i.id === req.params.installmentId);
  if (!inst || !inst.paid) return res.status(400).json({ error: 'Parcela não estava paga' });

  await prisma.installment.update({
    where: { id: inst.id },
    data:  { paid: false, paidAt: null },
  });

  const todasPagas = await prisma.installment.findMany({
    where: { eventId: event.id, paid: true },
  });
  const amountPaid = todasPagas.reduce((sum, i) => sum + i.value, 0) - inst.value;
  await prisma.event.update({ where: { id: event.id }, data: { amountPaid: Math.max(0, amountPaid) } });

  res.json({ ok: true, amountPaid: Math.max(0, amountPaid) });
});

module.exports = router;
