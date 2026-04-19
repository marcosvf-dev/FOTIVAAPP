const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { auth } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sanitize = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  studioName: u.studioName,
  phone: u.phone,
  profileImage: u.profileImage,
  isAdmin: u.isAdmin,
  subscription: {
    plan:      u.subscription.plan,
    status:    u.subscription.status,
    trialEndsAt: u.subscription.trialEndsAt,
    expiresAt: u.subscription.expiresAt,
  },
});

router.post('/register', async (req, res) => {
  const { name, email, password, studioName } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email e password são obrigatórios' });
  if (await User.findOne({ email }))
    return res.status(400).json({ error: 'Email já cadastrado' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, studioName: studioName || '' });
  res.status(201).json({ token: sign(user._id), user: sanitize(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  res.json({ token: sign(user._id), user: sanitize(user) });
});

router.post('/auto-login', async (req, res) => {
  try {
    const payload = jwt.verify(req.body.token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    res.json({ token: sign(user._id), user: sanitize(user) });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

router.get('/me', auth, (req, res) => res.json(sanitize(req.user)));

router.put('/profile', auth, async (req, res) => {
  const { name, studioName, phone, profileImage } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, studioName, phone, profileImage },
    { new: true }
  ).select('-passwordHash');
  res.json(sanitize(user));
});

router.put('/password', auth, async (req, res) => {
  const { current, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(current, user.passwordHash)))
    return res.status(400).json({ error: 'Senha atual incorreta' });
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Senha alterada com sucesso' });
});

module.exports = router;
