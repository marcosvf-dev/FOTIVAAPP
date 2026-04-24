const { gerarParcelas } = require('./installments');
// ============ CLIENTS ============
const clientRouter = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const { Client, Event } = require('../models/models');

clientRouter.use(auth, requireActive);

clientRouter.get('/', async (req, res) => {
  res.json(await Client.find({ userId: req.user._id }).sort({ name: 1 }));
});
clientRouter.post('/', require('../middleware/auth').checkClientLimit, async (req, res) => {
  const { name, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  res.status(201).json(await Client.create({ userId: req.user._id, name, phone, email, notes }));
});
clientRouter.get('/:id', async (req, res) => {
  const c = await Client.findOne({ _id: req.params.id, userId: req.user._id });
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(c);
});
clientRouter.put('/:id', async (req, res) => {
  const c = await Client.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(c);
});
clientRouter.delete('/:id', async (req, res) => {
  const c = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ message: 'Cliente removido' });
});

module.exports.clientRouter = clientRouter;

// ============ EVENTS ============
const eventRouter = require('express').Router();
eventRouter.use(auth, requireActive);

eventRouter.get('/', async (req, res) => {
  res.json(await Event.find({ userId: req.user._id }).sort({ eventDate: 1 }));
});
eventRouter.get('/:id', async (req, res) => {
  const e = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!e) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(e);
});
eventRouter.post('/', async (req, res) => {
  let { clientId, clientName, eventType, eventDate, location, status,
        totalValue, amountPaid, installments, paymentType, notes } = req.body;

  if (!clientId && clientName) {
    let c = await Client.findOne({ userId: req.user._id, name: new RegExp(clientName, 'i') });
    if (!c) c = await Client.create({ userId: req.user._id, name: clientName });
    clientId = c._id; clientName = c.name;
  }
  if (!clientId) return res.status(400).json({ error: 'Cliente obrigatório' });
  if (!eventType) return res.status(400).json({ error: 'Tipo obrigatório' });

  const { dueDay, firstDueDate } = req.body;
  const event = await Event.create({
    userId: req.user._id, clientId, clientName, eventType, eventDate,
    location, status, totalValue: totalValue || 0, amountPaid: amountPaid || 0,
    installments: installments || 1, paymentType: paymentType || 'pix',
    dueDay: dueDay || null, firstDueDate: firstDueDate || null, notes,
  });
  // Gera parcelas automáticas
  if (event.installments > 1 && (event.dueDay || event.firstDueDate)) {
    event.installmentList = gerarParcelas(event);
    await event.save();
  }
  res.status(201).json(event);
});
eventRouter.put('/:id', async (req, res) => {
  const e = await Event.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
  if (!e) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(e);
});
eventRouter.delete('/:id', async (req, res) => {
  const e = await Event.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!e) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ message: 'Evento removido' });
});

module.exports.eventRouter = eventRouter;

// ============ PAYMENTS ============
const payRouter = require('express').Router();
payRouter.use(auth, requireActive);

payRouter.get('/', async (req, res) => {
  const events = await Event.find({ userId: req.user._id }).sort({ eventDate: 1 });
  res.json(events.map(e => ({
    id: e._id, clientName: e.clientName, eventType: e.eventType,
    eventDate: e.eventDate, totalValue: e.totalValue, amountPaid: e.amountPaid,
    remaining: Math.max(0, e.totalValue - e.amountPaid),
    installments: e.installments, paymentType: e.paymentType,
    status: e.amountPaid >= e.totalValue ? 'pago' : e.amountPaid > 0 ? 'parcial' : 'pendente',
  })));
});
payRouter.patch('/:id/pay', async (req, res) => {
  const { amount } = req.body;
  const e = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!e) return res.status(404).json({ error: 'Evento não encontrado' });
  e.amountPaid = Math.min(e.totalValue, (e.amountPaid || 0) + (amount || 0));
  await e.save();
  res.json(e);
});

module.exports.payRouter = payRouter;

// ============ DASHBOARD ============
const dashRouter = require('express').Router();
dashRouter.use(auth, requireActive);

dashRouter.get('/stats', async (req, res) => {
  const now  = new Date();
  const som  = new Date(now.getFullYear(), now.getMonth(), 1);
  const uid  = req.user._id;

  const [events, clients] = await Promise.all([
    Event.find({ userId: uid }),
    Client.countDocuments({ userId: uid }),
  ]);

  const monthRev  = events.filter(e => e.createdAt >= som).reduce((s,e) => s + (e.amountPaid||0), 0);
  const pending   = events.reduce((s,e) => s + Math.max(0,(e.totalValue||0)-(e.amountPaid||0)), 0);
  const upcoming  = events.filter(e => e.eventDate && new Date(e.eventDate) >= now)
    .sort((a,b) => new Date(a.eventDate) - new Date(b.eventDate)).slice(0,5);

  res.json({ totalRevenue: monthRev, totalEvents: upcoming.length,
    totalClients: clients, pendingPayments: pending, upcomingEvents: upcoming });
});

module.exports.dashRouter = dashRouter;

// ============ PUSH ============
const pushRouter = require('express').Router();
const User = require('../models/User');

pushRouter.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(500).json({ error: 'VAPID não configurado' });
  res.json({ publicKey: key });
});
pushRouter.post('/subscribe', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { pushSubscription: req.body.subscription });
  res.json({ message: 'OK' });
});
pushRouter.delete('/subscribe', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
  res.json({ message: 'OK' });
});

module.exports.pushRouter = pushRouter;
