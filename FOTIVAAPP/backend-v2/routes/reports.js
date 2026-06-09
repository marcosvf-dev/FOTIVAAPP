const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth, requireActive);

router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = { userId: req.user.id };
  if (startDate || endDate) {
    where.eventDate = {};
    if (startDate) where.eventDate.gte = new Date(startDate);
    if (endDate)   where.eventDate.lte = new Date(endDate);
  }

  const [events, expenses] = await Promise.all([
    prisma.event.findMany({ where, include: { installmentList: true }, orderBy: { eventDate: 'desc' } }),
    prisma.expense.findMany({ where: { userId: req.user.id }, orderBy: { date: 'desc' } }),
  ]);

  const totalReceita = events.reduce((s, e) => s + e.totalValue, 0);
  const totalRecebido = events.reduce((s, e) => s + e.amountPaid, 0);
  const totalDespesas = expenses.reduce((s, e) => s + e.amount, 0);

  res.json({ events, expenses, summary: { totalReceita, totalRecebido, totalDespesas, lucro: totalRecebido - totalDespesas } });
});

module.exports = router;
