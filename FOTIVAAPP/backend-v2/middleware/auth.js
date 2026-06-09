const jwt    = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true, name: true, email: true, studioName: true, phone: true,
        profileImage: true, studioLogo: true, isAdmin: true, tokenVersion: true,
        subPlan: true, subStatus: true, subTrialEndsAt: true, subExpiresAt: true,
        stripeCustomerId: true, stripeSubId: true,
      }
    });

    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion)
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_REVOKED' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

const requireActive = (req, res, next) => {
  const now = new Date();
  const u   = req.user;
  if (u.subStatus === 'active') return next();
  if (u.subStatus === 'trial' && new Date(u.subTrialEndsAt) > now) return next();
  return res.status(403).json({ error: 'Assinatura necessária', code: 'SUBSCRIPTION_REQUIRED', trialExpired: u.subStatus === 'trial' });
};

const requirePro = (req, res, next) => {
  const now      = new Date();
  const u        = req.user;
  const isActive = u.subStatus === 'active' || (u.subStatus === 'trial' && new Date(u.subTrialEndsAt) > now);
  if (isActive && u.subPlan === 'pro') return next();
  return res.status(403).json({ error: 'Recurso exclusivo do plano PRO', code: 'PRO_REQUIRED' });
};

const requireNormalOrPro = (req, res, next) => {
  const now      = new Date();
  const u        = req.user;
  const isActive = u.subStatus === 'active' || (u.subStatus === 'trial' && new Date(u.subTrialEndsAt) > now);
  if (isActive && (u.subPlan === 'normal' || u.subPlan === 'pro')) return next();
  if (u.subStatus === 'trial' && new Date(u.subTrialEndsAt) > now) return next();
  return res.status(403).json({ error: 'Recurso disponível nos planos Normal e PRO', code: 'NORMAL_REQUIRED', upgrade: true });
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso negado' });
  next();
};

const checkClientLimit = async (req, res, next) => {
  try {
    if (req.user.subStatus === 'active' && req.user.subPlan === 'starter') {
      const count = await prisma.client.count({ where: { userId: req.user.id } });
      if (count >= 20)
        return res.status(403).json({ error: 'Limite de 20 clientes atingido. Faça upgrade para o Normal.', code: 'CLIENT_LIMIT', upgrade: true });
    }
    next();
  } catch { next(); }
};

module.exports = { auth, requireActive, requirePro, requireNormalOrPro, requireAdmin, checkClientLimit };
