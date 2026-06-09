const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive, checkClientLimit } = require('../middleware/auth');

router.use(auth, requireActive);

// GET /api/clients
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const where = { userId: req.user.id };
  if (search) where.OR = [
    { name:  { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } },
  ];

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip:  (page - 1) * limit,
      take:  Number(limit),
    }),
    prisma.client.count({ where }),
  ]);

  res.json({ clients, total });
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  const client = await prisma.client.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(client);
});

// POST /api/clients
router.post('/', checkClientLimit, async (req, res) => {
  const { name, phone, email, cpf, address, city, state, complement, notes, birthdate } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

  const client = await prisma.client.create({
    data: {
      userId: req.user.id,
      name,
      nameNorm: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      phone: phone || '', email: email || '', cpf: cpf || '',
      address: address || '', city: city || '', state: state || '',
      complement: complement || '', notes: notes || '',
      birthdate: birthdate ? new Date(birthdate) : null,
    }
  });
  res.status(201).json(client);
});

// PATCH /api/clients/:id
router.patch('/:id', async (req, res) => {
  const client = await prisma.client.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const { name, phone, email, cpf, address, city, state, complement, notes, birthdate } = req.body;
  const updated = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      ...(name        && { name, nameNorm: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }),
      ...(phone       !== undefined && { phone }),
      ...(email       !== undefined && { email }),
      ...(cpf         !== undefined && { cpf }),
      ...(address     !== undefined && { address }),
      ...(city        !== undefined && { city }),
      ...(state       !== undefined && { state }),
      ...(complement  !== undefined && { complement }),
      ...(notes       !== undefined && { notes }),
      ...(birthdate   !== undefined && { birthdate: birthdate ? new Date(birthdate) : null }),
    }
  });
  res.json(updated);
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  const client = await prisma.client.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
