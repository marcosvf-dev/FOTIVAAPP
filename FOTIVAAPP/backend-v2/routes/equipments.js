const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth, requireActive);

router.get('/', async (req, res) => {
  const items = await prisma.equipment.findMany({ where: { userId: req.user.id }, orderBy: { name: 'asc' } });
  res.json(items);
});

router.post('/', async (req, res) => {
  const { name, buyValue, usageMonths, category, notes } = req.body;
  if (!name || !buyValue || !usageMonths) return res.status(400).json({ error: 'Nome, valor e meses são obrigatórios.' });
  const item = await prisma.equipment.create({
    data: { userId: req.user.id, name, buyValue: parseFloat(buyValue), usageMonths: parseInt(usageMonths), category: category || 'outro', notes: notes || '' }
  });
  res.status(201).json(item);
});

router.patch('/:id', async (req, res) => {
  const item = await prisma.equipment.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!item) return res.status(404).json({ error: 'Equipamento não encontrado' });
  const { name, buyValue, usageMonths, category, notes } = req.body;
  const updated = await prisma.equipment.update({
    where: { id: req.params.id },
    data: {
      ...(name        && { name }),
      ...(buyValue    !== undefined && { buyValue: parseFloat(buyValue) }),
      ...(usageMonths !== undefined && { usageMonths: parseInt(usageMonths) }),
      ...(category    && { category }),
      ...(notes       !== undefined && { notes }),
    }
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const item = await prisma.equipment.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!item) return res.status(404).json({ error: 'Equipamento não encontrado' });
  await prisma.equipment.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
