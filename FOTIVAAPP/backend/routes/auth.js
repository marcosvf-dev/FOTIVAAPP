const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const nodemailer = require('nodemailer');
const User    = require('../models/User');
const { auth } = require('../middleware/auth');

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
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Sessão expirada.', code: 'TOKEN_REVOKED' });
    }
    res.json({ token: sign(user), user: sanitize(user) });
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(sanitize(req.user)));

// PUT /api/auth/profile
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

// PUT /api/auth/password
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
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ message: 'Senha alterada com sucesso.', token: sign(user) });
});

// POST /api/auth/logout-all
router.post('/logout-all', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  res.json({ message: 'Todas as sessões foram encerradas.' });
});

// POST /api/auth/forgot-password — envia email de recuperação
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });

  // Responde sempre com sucesso para não revelar se o email existe
  res.json({ message: 'Se o email existir, você receberá as instruções em breve.' });

  // Processa em background
  try {
    const safeEmail = String(email).trim().toLowerCase();
    const user      = await User.findOne({ email: safeEmail });
    if (!user) return; // Não existe, silenciosamente ignora

    // Gera token de reset (válido por 1 hora)
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    user.resetPasswordToken   = token;
    user.resetPasswordExpires = expires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://fotivaapp-frontend.onrender.com';
    const link        = `${frontendUrl}/redefinir-senha?token=${token}`;

    const transporter = getTransporter();
    await transporter.sendMail({
      from:    `"Fotiva" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: '🔐 Fotiva — Redefinição de senha',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
          <div style="max-width:500px;margin:0 auto;padding:32px 20px;">
            <div style="background:#111;border:1px solid #222;border-radius:16px;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#E87722;margin-bottom:8px;">FOTIVA</div>
              <h2 style="color:#fff;font-size:20px;margin-bottom:16px;">Redefinição de Senha</h2>
              <p style="color:#aaa;font-size:14px;line-height:1.6;margin-bottom:24px;">
                Olá, <strong style="color:#fff;">${user.name}</strong>!<br/>
                Recebemos uma solicitação para redefinir sua senha.<br/>
                Clique no botão abaixo para criar uma nova senha.
              </p>
              <a href="${link}"
                style="display:inline-block;background:linear-gradient(135deg,#E87722,#C85A00);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">
                🔐 Redefinir minha senha
              </a>
              <p style="color:#555;font-size:12px;margin-top:24px;">
                Este link expira em <strong>1 hora</strong>.<br/>
                Se você não solicitou isso, ignore este email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (e) {
    console.error('[forgot-password]', e.message);
  }
});

// POST /api/auth/reset-password — redefine senha com token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });

  const user = await User.findOne({
    resetPasswordToken:   token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user)
    return res.status(400).json({ error: 'Token inválido ou expirado. Solicite um novo link.' });

  user.passwordHash         = await bcrypt.hash(newPassword, 12);
  user.tokenVersion         = (user.tokenVersion || 0) + 1;
  user.resetPasswordToken   = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: 'Senha redefinida com sucesso!' });
});


// POST /api/auth/contract-number — gera próximo número sequencial de contrato
router.post('/contract-number', auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $inc: { contractCounter: 1 } },
    { new: true }
  );
  const year   = new Date().getFullYear();
  const number = String(user.contractCounter).padStart(3, '0') + '/' + year;
  res.json({ number });
});

module.exports = router;
