const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, enum: ['equipamentos','studios','laboratorios','software','cursos','outros'], default: 'outros' },
  image:       { type: String, default: '' },   // base64 ou URL
  link:        { type: String, default: '' },
  whatsapp:    { type: String, default: '' },
  contactName: { type: String, default: '' },
  active:      { type: Boolean, default: true },
  featured:    { type: Boolean, default: false }, // destaque no topo
  views:       { type: Number, default: 0 },
  clicks:      { type: Number, default: 0 },
  expiresAt:   { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);
