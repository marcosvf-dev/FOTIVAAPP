const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hourlyRate:    { type: Number, default: 38 },
  editingRate:   { type: Number, default: 28 },
  kmRate:        { type: Number, default: 1.5 },
  monthlyEvents: { type: Number, default: 4 },
  defaultMargin: { type: Number, default: 40 },
}, { timestamps: true });

const Settings = mongoose.models.CalculatorSettings || mongoose.model('CalculatorSettings', settingsSchema);

router.use(auth, requireActive);

// Buscar configurações da calculadora
router.get('/calculator', async (req, res) => {
  let s = await Settings.findOne({ userId: req.user._id });
  if (!s) s = { hourlyRate:38, editingRate:28, kmRate:1.5, monthlyEvents:4, defaultMargin:40 };
  res.json(s);
});

// Salvar configurações da calculadora
router.put('/calculator', async (req, res) => {
  const { hourlyRate, editingRate, kmRate, monthlyEvents, defaultMargin } = req.body;
  const s = await Settings.findOneAndUpdate(
    { userId: req.user._id },
    { hourlyRate, editingRate, kmRate, monthlyEvents, defaultMargin },
    { new: true, upsert: true }
  );
  res.json(s);
});

module.exports = router;
