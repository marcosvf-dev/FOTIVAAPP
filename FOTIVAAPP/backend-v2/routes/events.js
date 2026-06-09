const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth, requireActive);

function gerarParcelas(totalValue, amountPaid, installments, firstDueDate, dueDay) {
  if (!installments || installments <= 1) return [];
  const restante    = totalValue - (amountPaid || 0);
  const valorParc   = Math.round((restante / installments) * 100) / 100;
  const list        = [];
  let baseDate      = firstDueDate ? new Date(firstDueDate) : new Date();
  if (!firstDueDate && dueDay) {
    const hoje = new Date();
    baseDate   = new Date(hoje.getFullYear(), hoje.getMonth(), dueDay);
    if (baseDate <= hoje) baseDate.setMonth(baseDate.getMonth() + 1);
  }
  for (let i = 0; i < installments; i++) {
    const due = new Date(baseDate);
    due.setMonth(due.getMonth() + i);
    if (dueDay) due.setDate(dueDay);
    list.push({
      number:  i + 1,
      total:   installments,
      value:   i === installments - 1 ? Math.round((restante - valorParc * (installments - 1)) * 100) / 100 : valorParc,
      dueDate: due,
      paid:    false,
      paidAt:  null,
    });
  }
  return list;
}

// GET /api/events
router.get('/', async (req, res) => {
  const { status, archived, search, page = 1, limit = 50 } = req.query;
  const where = { userId: req.user.id };
  if (status)   where.status   = status;
  if (archived !== undefined) where.archived = archived === 'true';
  if (search)   where.OR = [
    { clientName: { contains: search, mode: 'insensitive' } },
    { eventType:  { contains: search, mode: 'insensitive' } },
  ];

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include:  { installmentList: { orderBy: { number: 'asc' } }, statusHistory: true },
      orderBy:  { eventDate: 'desc' },
      skip:     (page - 1) * limit,
      take:     Number(limit),
    }),
    prisma.event.count({ where }),
  ]);
  res.json(events);
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  const event = await prisma.event.findFirst({
    where:   { id: req.params.id, userId: req.user.id },
    include: { installmentList: { orderBy: { number: 'asc' } }, statusHistory: true },
  });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(event);
});

// POST /api/events
router.post('/', async (req, res) => {
  const {
    clientId, clientName, clientEmail, eventType, eventDate, location,
    status, totalValue, amountPaid, installments, paymentType,
    dueDay, firstDueDate, notes,
  } = req.body;

  if (!clientId || !eventType) return res.status(400).json({ error: 'Cliente e tipo de evento são obrigatórios.' });

  const parcelas = gerarParcelas(
    parseFloat(totalValue || 0), parseFloat(amountPaid || 0),
    parseInt(installments || 1), firstDueDate, dueDay
  );

  const event = await prisma.event.create({
    data: {
      userId:       req.user.id,
      clientId,
      clientName:   clientName || '',
      clientEmail:  clientEmail || '',
      eventType,
      eventDate:    eventDate ? new Date(eventDate) : null,
      location:     location || '',
      status:       status || 'confirmado',
      totalValue:   parseFloat(totalValue || 0),
      amountPaid:   parseFloat(amountPaid || 0),
      installments: parseInt(installments || 1),
      paymentType:  paymentType || 'pix',
      dueDay:       dueDay ? parseInt(dueDay) : null,
      firstDueDate: firstDueDate ? new Date(firstDueDate) : null,
      notes:        notes || '',
      installmentList: { create: parcelas },
    },
    include: { installmentList: { orderBy: { number: 'asc' } } },
  });
  res.status(201).json(event);
});

// PATCH /api/events/:id
router.patch('/:id', async (req, res) => {
  const event = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const { eventType, eventDate, location, status, notes, archived,
    totalValue, amountPaid, installments, paymentType, dueDay, firstDueDate } = req.body;

  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      ...(eventType    && { eventType }),
      ...(eventDate    !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
      ...(location     !== undefined && { location }),
      ...(status       && { status }),
      ...(notes        !== undefined && { notes }),
      ...(archived     !== undefined && { archived: Boolean(archived) }),
      ...(totalValue   !== undefined && { totalValue: parseFloat(totalValue) }),
      ...(amountPaid   !== undefined && { amountPaid: parseFloat(amountPaid) }),
      ...(installments !== undefined && { installments: parseInt(installments) }),
      ...(paymentType  && { paymentType }),
      ...(dueDay       !== undefined && { dueDay: dueDay ? parseInt(dueDay) : null }),
      ...(firstDueDate !== undefined && { firstDueDate: firstDueDate ? new Date(firstDueDate) : null }),
    },
    include: { installmentList: { orderBy: { number: 'asc' } } },
  });
  res.json(updated);
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  const event = await prisma.event.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
