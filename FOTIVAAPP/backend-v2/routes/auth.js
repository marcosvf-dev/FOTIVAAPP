const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const sign = (user) => jwt.sign(
  { id: user.id, tokenVersion: user.tokenVersion ?? 0 },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, studioName, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      studioName: studioName || '',
      phone:      phone || '',
      subStatus:  'trial',
      subPlan:    'free',
      subTrialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });

  res.status(201).json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Email ou senha incorretos.' });

  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, studioName: true, phone: true,
      profileImage: true, studioLogo: true, isAdmin: true,
      subPlan: true, subStatus: true, subTrialEndsAt: true, subExpiresAt: true,
      stripeCustomerId: true, createdAt: true,
    }
  });
  res.json(user);
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data:  { tokenVersion: { increment: 1 } }
  });
  res.json({ ok: true });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase().trim() } });

  // Sempre retorna 200 para não revelar se o email existe
  if (!user) return res.json({ message: 'Se o email existir, você receberá as instruções.' });

  const token   = require('crypto').randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.user.update({
    where: { id: user.id },
    data:  { resetPasswordToken: token, resetPasswordExpires: expires }
  });

  // Envio de email
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from:    `"Fotiva" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: 'Redefinição de senha — Fotiva',
      html:    `<p>Clique no link para redefinir sua senha (válido por 1 hora):</p>
                <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Redefinir senha</a>`
    });
  } catch (e) {
    console.error('Erro ao enviar email:', e.message);
  }

  res.json({ message: 'Se o email existir, você receberá as instruções.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });

  const user = await prisma.user.findFirst({
    where: { resetPasswordToken: token, resetPasswordExpires: { gt: new Date() } }
  });
  if (!user) return res.status(400).json({ error: 'Token inválido ou expirado.' });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash:        await bcrypt.hash(password, 12),
      tokenVersion:        { increment: 1 },
      resetPasswordToken:  null,
      resetPasswordExpires: null,
    }
  });

  res.json({ message: 'Senha redefinida com sucesso.' });
});

module.exports = router;
