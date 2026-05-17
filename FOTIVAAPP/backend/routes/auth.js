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

  // Email de boas-vindas (em background)
  try {
    const trialDias = 7;
    const frontendUrl = process.env.FRONTEND_URL || 'https://fotivaapp-frontend.onrender.com';
    await getTransporter().sendMail({
      from:    `"Fotiva" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: `Bem-vindo ao Fotiva, ${safeName.split(' ')[0]}! 🎉`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:32px;font-weight:900;color:#E87722;letter-spacing:-1px;">FOTIVA</div>
      <div style="color:#555;font-size:13px;margin-top:4px;">Seu estudio na palma da mao</div>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#E87722,#C85A00);border-radius:20px;padding:36px 28px;text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:16px;">🎉</div>
      <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 12px;">Bem-vindo, ${safeName.split(' ')[0]}!</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:15px;line-height:1.6;margin:0;">
        Voce tem <strong>${trialDias} dias gratis</strong> para explorar tudo que o Fotiva oferece.
        Nao precisa de cartao de credito agora.
      </p>
    </div>

    <!-- Funcionalidades -->
    <div style="background:#111;border:1px solid #222;border-radius:16px;padding:24px;margin-bottom:20px;">
      <h2 style="color:#fff;font-size:16px;font-weight:800;margin:0 0 20px;">O que voce pode fazer com o Fotiva:</h2>
      ${[
        ['📅', 'Gerenciar eventos', 'Casamentos, ensaios, aniversarios e muito mais com controle total de status'],
        ['💰', 'Controle financeiro', 'Parcelas, pagamentos, inadimplencia e relatorios de receita'],
        ['📄', 'Contratos digitais', 'Gere e assine contratos com seu cliente sem sair do app'],
        ['📸', 'Galeria de fotos PRO', 'Deixe seu cliente escolher as fotos favoritas online'],
        ['🔔', 'Notificacoes push', 'Alertas de eventos e pagamentos para nao perder nenhum compromisso'],
        ['💡', 'Calculadora de preco', 'Descubra o valor justo para cada servico'],
      ].map(([icon, title, desc]) => `
        <div style="display:flex;gap:14px;margin-bottom:16px;align-items:flex-start;">
          <div style="width:36px;height:36px;background:rgba(232,119,34,0.12);border:1px solid rgba(232,119,34,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${icon}</div>
          <div>
            <div style="color:#fff;font-size:13px;font-weight:700;margin-bottom:3px;">${title}</div>
            <div style="color:#666;font-size:12px;line-height:1.5;">${desc}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${frontendUrl}/dashboard"
        style="display:inline-block;background:linear-gradient(135deg,#E87722,#C85A00);color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:800;">
        Acessar o Fotiva →
      </a>
    </div>

    <!-- Trial info -->
    <div style="background:#1a1a1a;border:1px solid rgba(232,119,34,0.2);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
      <div style="color:#E87722;font-size:13px;font-weight:700;margin-bottom:4px;">⏰ Seu periodo gratuito</div>
      <div style="color:#888;font-size:12px;line-height:1.6;">
        Voce tem <strong style="color:#fff;">${trialDias} dias</strong> para testar gratuitamente.
        Apos esse periodo, escolha o plano ideal para o seu negocio.
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#444;font-size:11px;line-height:1.7;">
      <div>Duvidas? Responda este email que te ajudamos.</div>
      <div style="margin-top:8px;">© 2026 Fotiva · <a href="${frontendUrl}/termos" style="color:#555;">Termos de uso</a></div>
    </div>

  </div>
</body></html>`,
    });
  } catch(emailErr) { console.error('[register] Email boas-vindas:', emailErr.message); }
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

// POST /api/auth/trial-alert — cron-job: envia alerta 2 dias antes do trial expirar
router.post('/trial-alert', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const hoje    = new Date(); hoje.setHours(0,0,0,0);
    const em2dias = new Date(hoje); em2dias.setDate(em2dias.getDate() + 2);
    const em3dias = new Date(hoje); em3dias.setDate(em3dias.getDate() + 3);

    const users = await User.find({
      'subscription.status':      'trial',
      'subscription.trialEndsAt': { $gte: em2dias, $lt: em3dias },
    });

    let enviados = 0;
    const frontendUrl = process.env.FRONTEND_URL || 'https://fotivaapp-frontend.onrender.com';

    for (const user of users) {
      try {
        await getTransporter().sendMail({
          from:    `"Fotiva" <${process.env.SMTP_USER}>`,
          to:      user.email,
          subject: `⏰ Seu trial do Fotiva termina em 2 dias`,
          html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:32px;font-weight:900;color:#E87722;">FOTIVA</div>
    </div>

    <div style="background:#111;border:1px solid #333;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;margin-bottom:16px;">⏰</div>
      <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">Seu periodo gratuito termina em 2 dias</h1>
      <p style="color:#888;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Ola, <strong style="color:#fff;">${user.name.split(' ')[0]}</strong>! Seu trial do Fotiva termina em breve.<br/>
        Assine agora para continuar gerenciando seu estudio sem interrupcao.
      </p>
      <a href="${frontendUrl}/assinatura"
        style="display:inline-block;background:linear-gradient(135deg,#E87722,#C85A00);color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:800;">
        Ver planos e assinar →
      </a>
    </div>

    <div style="background:#111;border:1px solid #222;border-radius:14px;padding:20px;margin-bottom:20px;">
      <div style="color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;">O que voce perde se nao assinar:</div>
      ${['Acesso a todos os eventos e clientes','Galerias de fotos para seus clientes','Contratos digitais com assinatura','Notificacoes de lembretes de eventos','Calculadora de precificacao','Historico financeiro completo'].map(item =>
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span style="color:#EF4444;font-size:16px;">✗</span><span style="color:#aaa;font-size:13px;">${item}</span></div>`
      ).join('')}
    </div>

    <div style="text-align:center;color:#444;font-size:11px;">
      © 2026 Fotiva · <a href="${frontendUrl}/termos" style="color:#555;">Termos de uso</a>
    </div>

  </div>
</body></html>`,
        });
        enviados++;
      } catch(e) { console.error('[trial-alert] email error:', e.message); }
    }

    res.json({ ok: true, enviados, total: users.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
