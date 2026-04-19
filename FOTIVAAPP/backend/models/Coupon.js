const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type:        { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value:       { type: Number, required: true }, // % ou R$ fixo
  maxUses:     { type: Number, default: null },   // null = ilimitado
  usedCount:   { type: Number, default: 0 },
  validUntil:  { type: Date, default: null },     // null = sem expiração
  plans:       { type: [String], default: ['normal','pro'] }, // quais planos aceita
  active:      { type: Boolean, default: true },
  usedBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
