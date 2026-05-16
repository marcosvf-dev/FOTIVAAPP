const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, required: true },
  nameNorm:   { type: String, default: '' },
  phone:      { type: String, default: '' },
  email:      { type: String, default: '' },
  cpf:        { type: String, default: '' },
  address:    { type: String, default: '' },
  city:       { type: String, default: '' },
  state:      { type: String, default: '' },
  complement: { type: String, default: '' },
  notes:      { type: String, default: '' },
  birthdate:  { type: Date,   default: null },
}, { timestamps: true });

clientSchema.index({ userId: 1, name: 1 });
clientSchema.index({ userId: 1, nameNorm: 1 });
clientSchema.index({ userId: 1, email: 1 });
clientSchema.index({ userId: 1, createdAt: -1 });

const installmentSchema = new mongoose.Schema({
  number:  { type: Number, required: true },
  total:   { type: Number, required: true },
  value:   { type: Number, required: true },
  dueDate: { type: Date,   required: true },
  paidAt:  { type: Date,   default: null },
  paid:    { type: Boolean, default: false },
}, { _id: true });

const eventSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName:  { type: String, default: '' },
  clientEmail: { type: String, default: '' },
  eventType:   { type: String, required: true },
  eventDate:   { type: Date },
  location:    { type: String, default: '' },
  status: {
    type: String,
    enum: ['orcamento','contrato_enviado','sinal_recebido','confirmado','realizado','fotos_entregues','concluido','cancelado'],
    default: 'confirmado'
  },
  statusHistory: [{
    status:    { type: String },
    changedAt: { type: Date, default: Date.now },
    note:      { type: String, default: '' },
  }],
  totalValue:      { type: Number, default: 0 },
  amountPaid:      { type: Number, default: 0 },
  installments:    { type: Number, default: 1, min: 1, max: 48 },
  paymentType:     { type: String, enum: ['dinheiro','pix','transferencia','credito','debito'], default: 'pix' },
  dueDay:          { type: Number, default: null },
  firstDueDate:    { type: Date,   default: null },
  installmentList: [installmentSchema],
  notes:           { type: String, default: '' },
  archived:        { type: Boolean, default: false },
  contract: {
    number:         { type: String,  default: null },
    signature:      { type: String,  default: null },
    signedAt:       { type: Date,    default: null },
    signedByClient: { type: Boolean, default: false },
  },
}, { timestamps: true });

eventSchema.index({ userId: 1, eventDate: 1 });
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ userId: 1, clientName: 1 });
eventSchema.index({ userId: 1, archived: 1 });
eventSchema.index({ 'installmentList.paid': 1, 'installmentList.dueDate': 1 });
eventSchema.index({ userId: 1, createdAt: -1 });

module.exports.Client = mongoose.model('Client', clientSchema);
module.exports.Event  = mongoose.model('Event',  eventSchema);
