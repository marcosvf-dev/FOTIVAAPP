const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');
const { Event, Client } = require('../models/models');

function gerarParcelas(totalValue, amountPaid, installments, firstDueDate, dueDay) {
  if (!installments || installments <= 1) return [];
  const saldo = totalValue - amountPaid;
  if (saldo <= 0) return [];
  const valorParcela = saldo / installments;
  const parcelas = [];
  for (let i = 0; i < installments; i++) {
    let due;
    if (firstDueDate) {
      due = new Date(firstDueDate);
      due.setMonth(due.getMonth() + i);
    } else if (dueDay) {
      due = new Date();
      due.setDate(dueDay);
      due.setMonth(due.getMonth() + i);
    } else {
      due = new Date();
      due.setMonth(due.getMonth() + i + 1);
    }
    parcelas.push({
      number: i + 1,
      total:  installments,
      value:  parseFloat(valorParcela.toFixed(2)),
      dueDate: due,
      paid: false,
      paidAt: null,
    });
  }
  return parcelas;
}

// GET /api/events
router.get('/', auth, async (req, res) => {
  const events = await Event.find({ userId: req.user._id }).sort({ eventDate: 1 });
  res.json(events);
});

// GET /api/events/:id
router.get('/:id', auth, async (req, res) => {
  const ev = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(ev);
});

// POST /api/events
router.post('/', auth, async (req, res) => {
  const { clientId, clientName, eventType, eventDate, location, status,
          totalValue, amountPaid, installments, paymentType, dueDay,
          firstDueDate, notes } = req.body;

  if (!eventType) return res.status(400).json({ error: 'Tipo de evento obrigatório' });

  let finalClientId   = clientId;
  let finalClientName = clientName;

  if (!clientId && clientName) {
    let client = await Client.findOne({ userId: req.user._id, name: { $regex: new RegExp(`^${clientName}$`, 'i') } });
    if (!client) client = await Client.create({ userId: req.user._id, name: clientName });
    finalClientId   = client._id;
    finalClientName = client.name;
  } else if (clientId) {
    const client = await Client.findById(clientId);
    if (client) finalClientName = client.name;
  }

  const installmentList = gerarParcelas(
    parseFloat(totalValue) || 0,
    parseFloat(amountPaid) || 0,
    parseInt(installments) || 1,
    firstDueDate,
    dueDay
  );

  const ev = await Event.create({
    userId:      req.user._id,
    clientId:    finalClientId,
    clientName:  finalClientName,
    eventType,
    eventDate:   eventDate   || null,
    location:    location    || '',
    status:      status      || 'confirmado',
    statusHistory: [{ status: status || 'confirmado', changedAt: new Date() }],
    totalValue:   parseFloat(totalValue)   || 0,
    amountPaid:   parseFloat(amountPaid)   || 0,
    installments: parseInt(installments)   || 1,
    paymentType:  paymentType || 'pix',
    dueDay:       parseInt(dueDay)         || null,
    firstDueDate: firstDueDate             || null,
    installmentList,
    notes: notes || '',
  });

  res.status(201).json(ev);
});

// PUT /api/events/:id
router.put('/:id', auth, async (req, res) => {
  const ev = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });

  const { clientId, clientName, eventType, eventDate, location, status,
          totalValue, amountPaid, installments, paymentType, dueDay,
          firstDueDate, notes } = req.body;

  if (status && status !== ev.status) {
    ev.statusHistory = ev.statusHistory || [];
    ev.statusHistory.push({ status, changedAt: new Date() });
  }

  ev.eventType    = eventType    || ev.eventType;
  ev.eventDate    = eventDate    || ev.eventDate;
  ev.location     = location     !== undefined ? location    : ev.location;
  ev.status       = status       || ev.status;
  ev.totalValue   = parseFloat(totalValue)   || ev.totalValue;
  ev.amountPaid   = parseFloat(amountPaid)   || ev.amountPaid;
  ev.installments = parseInt(installments)   || ev.installments;
  ev.paymentType  = paymentType  || ev.paymentType;
  ev.dueDay       = parseInt(dueDay)         || ev.dueDay;
  ev.firstDueDate = firstDueDate             || ev.firstDueDate;
  ev.notes        = notes        !== undefined ? notes       : ev.notes;

  if (clientId) {
    ev.clientId = clientId;
    const client = await Client.findById(clientId);
    if (client) ev.clientName = client.name;
  } else if (clientName) {
    ev.clientName = clientName;
  }

  if (installments && parseInt(installments) > 1) {
    const existingPaid = ev.installmentList?.filter(i => i.paid) || [];
    if (existingPaid.length === 0) {
      ev.installmentList = gerarParcelas(
        parseFloat(totalValue) || ev.totalValue,
        parseFloat(amountPaid) || ev.amountPaid,
        parseInt(installments) || ev.installments,
        firstDueDate || ev.firstDueDate,
        parseInt(dueDay) || ev.dueDay
      );
    }
  }

  await ev.save();
  res.json(ev);
});

// PATCH /api/events/:id/status
router.patch('/:id/status', auth, async (req, res) => {
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

// PATCH /api/events/:id/installments/:installmentId
router.patch('/:id/installments/:installmentId', auth, async (req, res) => {
  const ev = await Event.findOne({ _id: req.params.id, userId: req.user._id });
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });

  const installment = ev.installmentList.id(req.params.installmentId);
  if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });

  const { paid } = req.body;
  installment.paid   = paid;
  installment.paidAt = paid ? new Date() : null;

  await ev.save();
  res.json(ev);
});

// POST /api/events/:id/signature — salva assinatura digital do contrato
router.post('/:id/signature', auth, async (req, res) => {
  const { signature, contractNumber, signedAt } = req.body;
  if (!signature) return res.status(400).json({ error: 'Assinatura obrigatória' });

  const ev = await Event.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    {
      $set: {
        'contract.signature':      signature,
        'contract.number':         contractNumber,
        'contract.signedAt':       signedAt || new Date(),
        'contract.signedByClient': true,
      },
    },
    { new: true }
  );

  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ ok: true, signedAt: ev.contract?.signedAt });
});

// DELETE /api/events/:id
router.delete('/:id', auth, async (req, res) => {
  await Event.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: 'Evento removido' });
});

module.exports = router;
