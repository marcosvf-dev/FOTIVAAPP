const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth, requireActive);

router.get('/', async (req, res) => {
  const userId = req.user.id;
  const hoje   = new Date(); hoje.setHours(0,0,0,0);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0);
  const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [
    totalClients, totalEvents, activeEvents,
    pendingInstallments, overdueInstallments,
    monthExpenses, recentEvents,
  ] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.event.count({ where: { userId } }),
    prisma.event.count({ where: { userId, status: { in: ['confirmado','sinal_recebido','contrato_enviado'] }, archived: false } }),
    prisma.installment.findMany({
      where:   { paid: false, event: { userId, archived: false } },
      include: { event: { select: { clientName: true, eventType: true } } },
      orderBy: { dueDate: 'asc' },
      take:    10,
    }),
    prisma.installment.count({
      where: { paid: false, dueDate: { lt: hoje }, event: { userId, archived: false } }
    }),
    prisma.expense.aggregate({ where: { userId, date: { gte: iniMes, lte: fimMes } }, _sum: { amount: true } }),
    prisma.event.findMany({
      where:   { userId, archived: false },
      include: { installmentList: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take:    5,
    }),
  ]);

  const totalPending = pendingInstallments.reduce((s, i) => s + i.value, 0);

  res.json({
    totalClients,
    totalEvents,
    activeEvents,
    overdueInstallments,
    totalPending,
    monthExpenses: monthExpenses._sum.amount || 0,
    pendingInstallments: pendingInstallments.map(inst => ({
      installmentId: inst.id,
      eventId:       inst.eventId,
      clientName:    inst.event.clientName,
      eventType:     inst.event.eventType,
      value:         inst.value,
      dueDate:       inst.dueDate,
      diffDays:      Math.round((new Date(inst.dueDate) - hoje) / 86400000),
    })),
    recentEvents,
  });
});

module.exports = router;
