const { gerarParcelas } = require('./installments');
const mongoose = require('mongoose');

// ============ CLIENTS ============
const clientRouter = require('express').Router();
const { auth, requireActive, checkClientLimit } = require('../middleware/auth');
const { Client, Event, Equipment, UserSettings } = require('../models/models');

// Normaliza string removendo acentos — busca "joao" encontra "João"
function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

clientRouter.use(auth, requireActive);

// GET /api/clients?search=&page=1&limit=20
clientRouter.get('/', async (req, res) => {
  const { search = '', page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const uid  = req.user._id;

  let query = { userId: uid };

  if (search.trim()) {
    const norm = normalizar(search);
    const raw  = search.replace(/\D/g, '');
    query.$or = [
      { nameNorm: { $regex: norm, $options: 'i' } },
      { name:     { $regex: search, $options: 'i' } },
      { email:    { $regex: search, $options: 'i' } },
      ...(raw ? [{ phone: { $regex: raw, $options: 'i' } }, { cpf: { $regex: raw, $options: 'i' } }] : []),
    ];
  }

  const [clients, total] = await Promise.all([
    Client.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
    Client.countDocuments(query),
  ]);

  res.json({
    clients,
    pagination: {
      page:    parseInt(page),
      limit:   parseInt(limit),
      total,
      pages:   Math.ceil(total / parseInt(limit)),
      hasMore: skip + clients.length < total,
    },
  });
});

clientRouter.post('/', checkClientLimit, async (req, res) => {
  const { name, phone, email, cpf, address, city, state, complement, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const client = await Client.create({
    userId: req.user._id,
    name:     name.trim(),
    nameNorm: normalizar(name),
    phone:    phone      || '',
    email:    email      || '',
    cpf:      cpf        || '',
    address:  address    || '',
    city:     city       || '',
    state:    state      || '',
    complement: complement || '',
    notes:    notes      || '',
  });
  res.status(201).json(client);
});

// GET /api/clients/aniversariantes — clientes que fazem aniversario este mes
clientRouter.get('/aniversariantes', async (req, res) => {
  const mesAtual = new Date().getMonth() + 1; // 1-12
  const hoje     = new Date(); hoje.setHours(0,0,0,0);
  const fimMes   = new Date(hoje.getFullYear(), mesAtual, 0); // ultimo dia do mes

  const clientes = await Client.find({
    userId:    req.user._id,
    birthdate: { $ne: null },
  }).select('name phone email birthdate');

  // Filtra clientes que fazem aniversario este mes
  const aniversariantes = clientes
    .filter(c => {
      if (!c.birthdate) return false;
      const nasc = new Date(c.birthdate);
      return nasc.getMonth() + 1 === mesAtual;
    })
    .map(c => {
      const nasc = new Date(c.birthdate);
      const aniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
      return { ...c.toObject(), _daysUntil: Math.ceil((aniv - hoje) / 86400000) };
    })
    .sort((a, b) => {
      // Hoje primeiro, depois por proximidade
      if (a._daysUntil === 0) return -1;
      if (b._daysUntil === 0) return 1;
      return a._daysUntil - b._daysUntil;
    });

  res.json(aniversariantes);
});

clientRouter.get('/:id', async (req, res) => {
  const c = await Client.findOne({ _id: req.params.id, userId: req.user._id });
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(c);
});

clientRouter.put('/:id', async (req, res) => {
  const { name, phone, email, cpf, address, city, state, complement, notes } = req.body;
  const update = {};
  if (name       !== undefined) { update.name = name.trim(); update.nameNorm = normalizar(name); }
  if (phone      !== undefined) update.phone      = phone;
  if (email      !== undefined) update.email      = email;
  if (cpf        !== undefined) update.cpf        = cpf;
  if (address    !== undefined) update.address    = address;
  if (city       !== undefined) update.city       = city;
  if (state      !== undefined) update.state      = state;
  if (complement !== undefined) update.complement = complement;
  if (notes      !== undefined) update.notes      = notes;

  const c = await Client.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    update,
    { new: true }
  );
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
        totalValue, amountPaid, installments, paymentType, notes,
        dueDay, firstDueDate } = req.body;

  if (!clientId && clientName) {
    let c = await Client.findOne({ userId: req.user._id, name: new RegExp(clientName, 'i') });
    if (!c) c = await Client.create({ userId: req.user._id, name: clientName, nameNorm: normalizar(clientName) });
    clientId = c._id; clientName = c.name;
  }
  if (!clientId) return res.status(400).json({ error: 'Cliente obrigatório' });
  if (!eventType) return res.status(400).json({ error: 'Tipo obrigatório' });

  const event = await Event.create({
    userId: req.user._id, clientId, clientName, eventType, eventDate,
    location, status: status || 'confirmado',
    statusHistory: [{ status: status || 'confirmado', changedAt: new Date() }],
    totalValue: totalValue || 0, amountPaid: amountPaid || 0,
    installments: installments || 1, paymentType: paymentType || 'pix',
    dueDay: dueDay || null, firstDueDate: firstDueDate || null, notes,
  });

  if (event.installments > 1 && (event.dueDay || event.firstDueDate)) {
    event.installmentList = gerarParcelas(event);
    await event.save();
  }
  res.status(201).json(event);
});

eventRouter.put('/:id', async (req, res) => {
  const { status } = req.body;
  const e = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!e) return res.status(404).json({ error: 'Evento não encontrado' });
  if (status && status !== e.status) {
    e.statusHistory = e.statusHistory || [];
    e.statusHistory.push({ status, changedAt: new Date() });
  }
  Object.assign(e, req.body);
  await e.save();
  res.json(e);
});

eventRouter.patch('/:id/status', async (req, res) => {
  const { status, note } = req.body;
  const STATUS_VALIDOS = ['orcamento','contrato_enviado','sinal_recebido','confirmado','realizado','fotos_entregues','concluido','cancelado'];
  if (!STATUS_VALIDOS.includes(status))
    return res.status(400).json({ error: 'Status inválido.' });
  const ev = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  ev.statusHistory = ev.statusHistory || [];
  ev.statusHistory.push({ status, changedAt: new Date(), note: note || '' });
  ev.status = status;
  await ev.save();
  res.json({ status: ev.status, statusHistory: ev.statusHistory });
});


// PATCH /api/events/:id/archive — arquiva sem perder financeiro
eventRouter.patch('/:id/archive', async (req, res) => {
  const { archived } = req.body;
  const ev = await Event.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { archived: !!archived } },
    { new: true }
  );
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ ok: true, archived: ev.archived });
});

// POST /api/events/:id/signature — salva assinatura digital do contrato
eventRouter.post('/:id/signature', async (req, res) => {
  const { signature, contractNumber, signedAt } = req.body;
  if (!signature) return res.status(400).json({ error: 'Assinatura obrigatória' });
  const ev = await Event.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: {
      'contract.signature':      signature,
      'contract.number':         contractNumber,
      'contract.signedAt':       signedAt || new Date(),
      'contract.signedByClient': true,
    }},
    { new: true }
  );
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ ok: true, signedAt: ev.contract?.signedAt });
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

  const monthRev = events.filter(e => e.createdAt >= som).reduce((s,e) => s + (e.amountPaid||0), 0);
  const pending  = events.reduce((s,e) => s + Math.max(0,(e.totalValue||0)-(e.amountPaid||0)), 0);
  const upcoming = events
    .filter(e => e.eventDate && new Date(e.eventDate) >= now)
    .sort((a,b) => new Date(a.eventDate) - new Date(b.eventDate))
    .slice(0, 5);

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

// ============ EXPENSES ============
const expenseSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
  category:    { type: String, default: 'Outro' },
  date:        { type: Date, default: Date.now },
  eventId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  eventName:   { type: String, default: '' },
  notes:       { type: String, default: '' },
}, { timestamps: true });

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);

const expenseRouter = require('express').Router();
expenseRouter.use(auth, requireActive);

expenseRouter.get('/', async (req, res) => {
  const despesas = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
  res.json(despesas);
});

expenseRouter.post('/', async (req, res) => {
  const { description, amount, category, date, eventId, notes } = req.body;
  if (!description) return res.status(400).json({ error: 'Descrição obrigatória.' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valor deve ser maior que zero.' });

  let eventName = '';
  if (eventId) {
    const ev = await Event.findOne({ _id: eventId, userId: req.user._id });
    if (ev) eventName = `${ev.eventType} — ${ev.clientName}`;
  }

  const despesa = await Expense.create({
    userId:      req.user._id,
    description: String(description).trim().slice(0, 200),
    amount:      parseFloat(amount),
    category:    category || 'Outro',
    date:        date     || new Date(),
    eventId:     eventId  || null,
    eventName,
    notes:       String(notes || '').trim().slice(0, 500),
  });
  res.status(201).json(despesa);
});

expenseRouter.delete('/:id', async (req, res) => {
  const d = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!d) return res.status(404).json({ error: 'Despesa não encontrada.' });
  res.json({ message: 'Despesa removida.' });
});

expenseRouter.get('/resumo', async (req, res) => {
  const agora  = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim    = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  const [despesasMes, todasDespesas, eventosDoMes] = await Promise.all([
    Expense.find({ userId: req.user._id, date: { $gte: inicio, $lte: fim } }),
    Expense.find({ userId: req.user._id }),
    Event.find({ userId: req.user._id }),
  ]);

  const receitaMes = eventosDoMes.filter(e => {
    const d = new Date(e.createdAt);
    return d >= inicio && d <= fim;
  }).reduce((s, e) => s + (e.amountPaid || 0), 0);

  const despesaMes   = despesasMes.reduce((s, d) => s + d.amount, 0);
  const despesaTotal = todasDespesas.reduce((s, d) => s + d.amount, 0);

  const porCategoria = todasDespesas.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + d.amount;
    return acc;
  }, {});

  res.json({ receitaMes, despesaMes, lucroMes: receitaMes - despesaMes, despesaTotal, porCategoria });
});

module.exports.expenseRouter = expenseRouter;
module.exports.Expense = Expense;

// ═══ EQUIPAMENTOS ═══════════════════════════════════════════════════
const equipmentRouter = require('express').Router();

equipmentRouter.get('/', async (req, res) => {
  const items = await Equipment.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

equipmentRouter.post('/', async (req, res) => {
  const { name, buyValue, usageMonths, category, notes } = req.body;
  if (!name || !buyValue || !usageMonths)
    return res.status(400).json({ error: 'Nome, valor e tempo de uso obrigatórios' });
  const item = await Equipment.create({
    userId: req.user._id,
    name: String(name).trim().slice(0, 100),
    buyValue: parseFloat(buyValue),
    usageMonths: parseInt(usageMonths),
    category: category || 'outro',
    notes: notes || '',
  });
  res.status(201).json(item);
});

equipmentRouter.put('/:id', async (req, res) => {
  const { name, buyValue, usageMonths, category, notes } = req.body;
  const item = await Equipment.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { name, buyValue: parseFloat(buyValue), usageMonths: parseInt(usageMonths), category, notes } },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json(item);
});

equipmentRouter.delete('/:id', async (req, res) => {
  const item = await Equipment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!item) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json({ ok: true });
});

// ═══ CONFIGURAÇÕES DA CALCULADORA ═══════════════════════════════════
const settingsRouter = require('express').Router();

settingsRouter.get('/calculator', async (req, res) => {
  let settings = await UserSettings.findOne({ userId: req.user._id });
  if (!settings) {
    settings = await UserSettings.create({ userId: req.user._id });
  }
  res.json(settings);
});

settingsRouter.put('/calculator', async (req, res) => {
  const { hourlyRate, editingRate, kmRate, monthlyEvents, defaultMargin } = req.body;
  const update = {};
  if (hourlyRate    !== undefined) update.hourlyRate    = parseFloat(hourlyRate);
  if (editingRate   !== undefined) update.editingRate   = parseFloat(editingRate);
  if (kmRate        !== undefined) update.kmRate        = parseFloat(kmRate);
  if (monthlyEvents !== undefined) update.monthlyEvents = parseInt(monthlyEvents);
  if (defaultMargin !== undefined) update.defaultMargin = parseFloat(defaultMargin);
  const settings = await UserSettings.findOneAndUpdate(
    { userId: req.user._id },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json(settings);
});

module.exports.equipmentRouter = equipmentRouter;
module.exports.settingsRouter  = settingsRouter;
