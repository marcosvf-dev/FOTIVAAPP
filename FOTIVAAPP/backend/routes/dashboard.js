const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const { Client, Event } = require('../models/models');

router.use(auth, requireActive);

router.get('/stats', async (req, res) => {
  const now = new Date();
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  const uid = req.user._id;

  const [events, clients] = await Promise.all([
    Event.find({ userId: uid }),
    Client.countDocuments({ userId: uid }),
  ]);

  const monthRev = events.filter(e => e.createdAt >= som).reduce((s,e) => s + (e.amountPaid||0), 0);
  const pending  = events.reduce((s,e) => s + Math.max(0,(e.totalValue||0)-(e.amountPaid||0)), 0);
  const upcoming = events
    .filter(e => e.eventDate && new Date(e.eventDate) >= now)
    .sort((a,b) => new Date(a.eventDate) - new Date(b.eventDate))
    .slice(0, 5);

  res.json({ totalRevenue: monthRev, totalEvents: upcoming.length, totalClients: clients, pendingPayments: pending, upcomingEvents: upcoming });
});

router.get('/extra', async (req, res) => {
  const uid   = req.user._id;
  const agora = new Date();
  const hoje  = new Date(); hoje.setHours(0,0,0,0);

  const [events, clients] = await Promise.all([
    Event.find({ userId: uid }),
    Client.find({ userId: uid }).select('createdAt'),
  ]);

  // Receita dos últimos 6 meses
  const receitaMensal = [];
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0, 23, 59, 59);
    const label = d.toLocaleDateString('pt-BR', { month:'short', year:'2-digit' });
    let total = 0;
    for (const ev of events) {
      for (const inst of (ev.installmentList || [])) {
        if (inst.paid && inst.paidAt) {
          const paidAt = new Date(inst.paidAt);
          if (paidAt >= d && paidAt <= fim) total += inst.value;
        }
      }
      if (ev.createdAt >= d && ev.createdAt <= fim && ev.amountPaid > 0 && (!ev.installmentList || ev.installmentList.length === 0))
        total += ev.amountPaid;
    }
    receitaMensal.push({ label, total });
  }

  const receitaAtual    = receitaMensal[5]?.total || 0;
  const receitaAnterior = receitaMensal[4]?.total || 0;
  const variacaoReceita = receitaAnterior > 0 ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100 : 0;

  const inicioMes      = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const novosClientesMes = clients.filter(c => new Date(c.createdAt) >= inicioMes).length;

  let parcelasAtrasadas = 0;
  for (const ev of events) {
    for (const inst of (ev.installmentList || [])) {
      if (!inst.paid) {
        const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
        if (due < hoje) parcelasAtrasadas++;
      }
    }
  }

  const eventosPorStatus = {};
  for (const ev of events) {
    if (ev.status === 'cancelado') continue;
    eventosPorStatus[ev.status] = (eventosPorStatus[ev.status] || 0) + 1;
  }

  const pagamentos = [];
  for (const ev of events) {
    for (const inst of (ev.installmentList || [])) {
      if (inst.paid && inst.paidAt) {
        pagamentos.push({ clientName: ev.clientName, eventType: ev.eventType, number: inst.number, total: inst.total, value: inst.value, paidAt: inst.paidAt });
      }
    }
  }
  const pagamentosRecentes = pagamentos.sort((a,b) => new Date(b.paidAt) - new Date(a.paidAt)).slice(0, 5);

  res.json({ receitaMensal, variacaoReceita: Math.round(variacaoReceita), novosClientesMes, parcelasAtrasadas, eventosPorStatus, pagamentosRecentes });
});

module.exports = router;
