const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:   { type: String, required: true },
  phone:  { type: String, default: '' },
  email:  { type: String, default: '' },
  notes:  { type: String, default: '' },
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName:   { type: String, default: '' },
  eventType:    { type: String, required: true },
  eventDate:    { type: Date },
  location:     { type: String, default: '' },
  status:       { type: String, enum: ['confirmado','pendente','cancelado','concluido'], default: 'confirmado' },
  totalValue:   { type: Number, default: 0 },
  amountPaid:   { type: Number, default: 0 },
  installments: { type: Number, default: 1, min: 1, max: 12 },
  paymentType:  { type: String, enum: ['dinheiro','pix','transferencia','credito','debito'], default: 'pix' },
  notes:        { type: String, default: '' },
}, { timestamps: true });

module.exports.Client = mongoose.model('Client', clientSchema);
module.exports.Event  = mongoose.model('Event',  eventSchema);
