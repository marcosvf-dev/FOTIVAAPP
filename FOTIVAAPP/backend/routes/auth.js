const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { auth } = require('../middleware/auth');

// JWT agora inclui tokenVersion para permitir invalidação
const sign = (user) => jwt.sign(
  { id: user._id, tokenVersion: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

const sanitize = (u) => ({
  id:          u._id,
  name:        u.name,
  email:       u.email,
  studioName:  u.studioName,
  phone:       u.phone,
  profileImage:u.profileImage,
  studioLogo:  u.studioLogo,
  document:    u.document,
  isAdmin:     u.isAdmin,
  subscription: {
    plan:        u.subscription.plan,
    status:      u.subscription.status,
    trialEndsAt: u.subscription.trialEndsAt,
    expiresAt:   u.subscription.expiresAt,
  },
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

router.post('/auto-login', async (req, res) => {
  try {
    const payload = jwt.verify(req.body.token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Sessão expirada.', code: 'TOKEN_REVOKED' });
    }
    res.json({ token: sign(user), user: sanitize(user) });
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

router.get('/me', auth, (req, res) => res.json(sanitize(req.user)));

router.put('/profile', auth, async (req, res) => {
  const { name, studioName, phone, profileImage, studioLogo, document } = req.body;
  const update = {};
  if (name        !== undefined) update.name         = String(name).trim().slice(0, 100);
  if (studioName  !== undefined) update.studioName   = String(studioName).trim().slice(0, 100);
  if (phone       !== undefined) update.phone        = String(phone).trim().slice(0, 20);
  if (document    !== undefined) update.document     = String(document).trim().slice(0, 20);
  if (profileImage !== undefined) update.profileImage = profileImage;
  if (studioLogo  !== undefined) update.studioLogo   = studioLogo;
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-passwordHash');
  res.json(sanitize(user));
});

router.put('/password', auth, async (req, res) => {
  const { current, newPassword } = req.body;
  if (!current || !newPassword)
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });

  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(current, user.passwordHash)))
    return res.status(400).json({ error: 'Senha atual incorreta.' });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalida todos os tokens antigos
  await user.save();

  res.json({ message: 'Senha alterada com sucesso.', token: sign(user) });
});

// Encerra todas as sessões ativas
router.post('/logout-all', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  res.json({ message: 'Todas as sessões foram encerradas.' });
});

module.exports = router;
