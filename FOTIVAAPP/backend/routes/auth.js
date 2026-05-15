const router     = require('express').Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const User       = require('../models/User');
const { auth }   = require('../middleware/auth');

const sign = (user) => jwt.sign(
  { id: user._id, tokenVersion: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

const sanitize = (u) => ({
  id:           u._id,
  name:         u.name,
  email:        u.email,
  studioName:   u.studioName,
  phone:        u.phone,
  profileImage: u.profileImage,
  studioLogo:   u.studioLogo,
  document:     u.document,
  isAdmin:      u.isAdmin,
  subscription: {
    plan:        u.subscription.plan,
    status:      u.subscription.status,
    trialEndsAt: u.subscription.trialEndsAt,
    expiresAt:   u.subscription.expiresAt,
  },
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, studioName, consentAcceptedAt } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  if (!isValidEmail(email))
    return res.status(400).json({ error: 'Email inválido.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  if (!consentAcceptedAt)
    return res.status(400).json({ error: 'Aceite dos termos é obrigatório.' });

  const safeName   = String(name).trim().slice(0, 100);
  const safeEmail  = String(email).trim().toLowerCase().slice(0, 200);
  const safeStudio = String(studioName || '').trim().slice(0, 100);

  if (await User.findOne({ email: safeEmail }))
    return res.status(400).json({ error: 'Email já cadastrado.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: safeName, email: safeEmail, passwordHash,
    studioName: safeStudio, tokenVersion: 0,
    consentAcceptedAt: consentAcceptedAt || new Date(),
    consentVersion: '2.0',
  });

  res.status(201).json({ token: sign(user), user: sanitize(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });

  const safeEmail = String(email).trim().toLowerCase();
  const user      = await User.findOne({ email: safeEmail });

  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attack.on.user.enumeration';
  const valid     = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !valid)
    return res.status(401).json({ error: 'Email ou senha incorretos.' });

  res.json({ token: sign(user), user: sanitize(user) });
});

// POST /api/auth/auto-login
router.post('/auto-login', async (req, res) => {
  try {
    const payload = jwt.verify(req.body.token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion)
      return res.status(401).json({ error: 'Sessão expirada.', code: 'TOKEN_REVOKED' });
    res.json({
