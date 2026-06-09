const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth, requireActive);

router.get('/', async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where:   { userId: req.user.id },
    orderBy: { date: 'desc' },
  });
  res.json(expenses);
});

router.post('/', async (req, res) => {
  const { description, amount, category, date, eventId, notes } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'Descrição e valor são obrigatórios.' });

  const expense = await prisma.expense.create({
    data: {
      userId: req.user.id,
      description,
      amount:   parseFloat(amount),
      category: category || 'Outro',
      date:     date ? new Date(date) : new Date(),
      eventId:  eventId || null,
      notes:    notes || '',
    }
  });
  res.status(201).json(expense);
});

router.delete('/:id', async (req, res) => {
  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!expense) return res.status(404).json({ error: 'Despesa não encontrada' });
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
