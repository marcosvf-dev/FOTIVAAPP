const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const mongoose = require('mongoose');

// Schema inline — sem model separado por ora
const equipmentSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true },
  category:     { type: String, default: 'camera' },
  buyValue:     { type: Number, required: true },
  usageMonths:  { type: Number, required: true },
  notes:        { type: String, default: '' },
}, { timestamps: true });

const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', equipmentSchema);

router.use(auth, requireActive);

// Listar equipamentos do usuário
router.get('/', async (req, res) => {
  const items = await Equipment.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

// Criar equipamento
router.post('/', async (req, res) => {
  const { name, category, buyValue, usageMonths, notes } = req.body;
  if (!name || !buyValue || !usageMonths)
    return res.status(400).json({ error: 'Nome, valor e tempo de uso são obrigatórios' });

  const item = await Equipment.create({
    userId: req.user._id,
    name, category: category || 'camera',
    buyValue: parseFloat(buyValue),
    usageMonths: parseInt(usageMonths),
    notes: notes || '',
  });
  res.json(item);
});

// Atualizar equipamento
router.put('/:id', async (req, res) => {
  const { name, category, buyValue, usageMonths, notes } = req.body;
  const item = await Equipment.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { name, category, buyValue: parseFloat(buyValue), usageMonths: parseInt(usageMonths), notes: notes || '' },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json(item);
});

// Deletar equipamento
router.delete('/:id', async (req, res) => {
  const item = await Equipment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!item) return res.status(404).json({ error: 'Equipamento não encontrado' });
  res.json({ ok: true });
});

module.exports = router;
