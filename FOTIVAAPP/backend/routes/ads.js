const router  = require('express').Router();
const { auth, requireAdmin } = require('../middleware/auth');
const Ad = require('../models/Ad');

// Público — lista anúncios ativos
router.get('/', async (req, res) => {
  const { category } = req.query;
  const filter = { active: true };
  if (filter.expiresAt) filter.expiresAt = { $gt: new Date() };
  if (category && category !== 'todos') filter.category = category;

  const ads = await Ad.find({
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  }).sort({ featured: -1, createdAt: -1 });

  // Incrementa views
  if (ads.length) await Ad.updateMany({ _id: { $in: ads.map(a => a._id) } }, { $inc: { views: 1 } });

  res.json(ads);
});

// Público — registra clique
router.post('/:id/click', async (req, res) => {
  await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
  res.json({ ok: true });
});

// Admin — criar anúncio
router.post('/', auth, requireAdmin, async (req, res) => {
  const ad = await Ad.create(req.body);
  res.status(201).json(ad);
});

// Admin — atualizar
router.put('/:id', auth, requireAdmin, async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(ad);
});

// Admin — deletar
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  await Ad.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Admin — listar todos
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  const ads = await Ad.find().sort({ createdAt: -1 });
  res.json(ads);
});

module.exports = router;
