const router = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { Client, Event } = require('../models/models');
const { auth, requireAdmin } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

// Login do admin (email/senha separados)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL)
    return res.status(401).json({ error: 'Credenciais inválidas' });

  const user = await User.findOne({ email, isAdmin: true });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Credenciais inválidas' });

  res.json({ token: sign(user._id), isAdmin: true });
});

// Criar conta admin (rode uma vez para criar o admin)
router.post('/setup', async (req, res) => {
  const { secret, email, password, name } = req.body;
  if (secret !== process.env.JWT_SECRET)
    return res.status(403).json({ error: 'Secret inválido' });

  const exists = await User.findOne({ isAdmin: true });
  if (exists) return res.status(400).json({ error: 'Admin já existe' });

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({ name, email, passwordHash, isAdmin: true,
    subscription: { plan: 'pro', status: 'active' } });
  res.json({ message: 'Admin criado', id: admin._id });
});

// Stats gerais
router.get('/stats', auth, requireAdmin, async (req, res) => {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    activeUsers,
    trialUsers,
    expiredUsers,
    newUsersMonth,
    normalPlan,
    proPlan,
  ] = await Promise.all([
    User.countDocuments({ isAdmin: false }),
    User.countDocuments({ isAdmin: false, 'subscription.status': 'active' }),
    User.countDocuments({ isAdmin: false, 'subscription.status': 'trial', 'subscription.trialEndsAt': { $gt: now } }),
    User.countDocuments({ isAdmin: false, 'subscription.status': { $in: ['expired','cancelled'] } }),
    User.countDocuments({ isAdmin: false, createdAt: { $gte: startMonth } }),
    User.countDocuments({ isAdmin: false, 'subscription.plan': 'normal', 'subscription.status': 'active' }),
    User.countDocuments({ isAdmin: false, 'subscription.plan': 'pro', 'subscription.status': 'active' }),
  ]);

  const mrr = (normalPlan * 29.90) + (proPlan * 39.90);

  res.json({
    totalUsers,
    activeUsers,
    trialUsers,
    expiredUsers,
    newUsersMonth,
    normalPlan,
    proPlan,
    mrr: mrr.toFixed(2),
    arr: (mrr * 12).toFixed(2),
  });
});

// Lista todos os fotógrafos
router.get('/users', auth, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const filter = { isAdmin: false };

  if (status && status !== 'all') filter['subscription.status'] = status;
  if (search) filter.$or = [
    { name:      { $regex: search, $options: 'i' } },
    { email:     { $regex: search, $options: 'i' } },
    { studioName:{ $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({ users, total, pages: Math.ceil(total / limit) });
});

// Detalhe de um fotógrafo
router.get('/users/:id', auth, requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const [clients, events] = await Promise.all([
    Client.countDocuments({ userId: user._id }),
    Event.countDocuments({ userId: user._id }),
  ]);

  res.json({ ...user.toObject(), _counts: { clients, events } });
});

// Alterar plano manualmente (ex: dar acesso grátis)
router.patch('/users/:id/plan', auth, requireAdmin, async (req, res) => {
  const { plan, status, days } = req.body;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (days || 31));

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      'subscription.plan':      plan,
      'subscription.status':    status || 'active',
      'subscription.expiresAt': expiresAt,
    },
    { new: true }
  ).select('-passwordHash');

  res.json({ message: 'Plano atualizado', subscription: user.subscription });
});

// Bloquear / desbloquear usuário
router.patch('/users/:id/block', auth, requireAdmin, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { 'subscription.status': 'cancelled', 'subscription.plan': 'free' },
    { new: true }
  );
  res.json({ message: 'Usuário bloqueado' });
});

module.exports = router;
