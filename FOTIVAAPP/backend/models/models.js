const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:     { type: String, required: true },
  phone:    { type: String, default: '' },
  email:    { type: String, default: '' },
  cpf:      { type: String, default: '' },
  address:  { type: String, default: '' },
  city:     { type: String, default: '' },
  notes:    { type: String, default: '' },
}, { timestamps: true });

// Schema de parcela individual
const installmentSchema = new mongoose.Schema({
  number:    { type: Number, required: true },      // nº da parcela (1, 2, 3...)
  total:     { type: Number, required: true },       // qtd total de parcelas
  value:     { type: Number, required: true },       // valor desta parcela
  dueDate:   { type: Date, required: true },         // data de vencimento
  paidAt:    { type: Date, default: null },           // data em que foi pago
  paid:      { type: Boolean, default: false },
}, { _id: true });

const eventSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName:   { type: String, default: '' },
  eventType:    { type: String, required: true },
  eventDate:    { type: Date },
  location:     { type: String, default: '' },
  status:       { type: String, enum: ['confirmado','pendente','cancelado','concluido'], default: 'confirmado' },

  // Financeiro
  totalValue:      { type: Number, default: 0 },
  amountPaid:      { type: Number, default: 0 },      // entrada paga
  installments:    { type: Number, default: 1, min:1, max:48 },
  paymentType:     { type: String, enum: ['dinheiro','pix','transferencia','credito','debito'], default: 'pix' },
  dueDay:          { type: Number, default: null },    // dia do mês para vencimento (1-31)
  firstDueDate:    { type: Date,   default: null },    // data da 1ª parcela

  // Parcelas geradas automaticamente
  installmentList: [installmentSchema],

  notes:        { type: String, default: '' },
}, { timestamps: true });

// Virtual: saldo restante
eventSchema.virtual('balance').get(function() {
  const paid = this.installmentList?.filter(i => i.paid).reduce((s,i) => s + i.value, 0) || 0;
  return this.totalValue - this.amountPaid - paid;
});

module.exports.Client = mongoose.model('Client', clientSchema);
module.exports.Event  = mongoose.model('Event',  eventSchema);
