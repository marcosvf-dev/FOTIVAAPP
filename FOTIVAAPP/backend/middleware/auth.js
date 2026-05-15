const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Client = require('../models/models').Client;

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    // Invalida token se tokenVersion não bater
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_REVOKED' });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

const requireActive = async (req, res, next) => {
  const s   = req.user.subscription;
  const now = new Date();
  if (s.status === 'active') return next();
  if (s.status === 'trial' && s.trialEndsAt > now) return next();
  return res.status(403).json({ error: 'Assinatura necessária', code: 'SUBSCRIPTION_REQUIRED', trialExpired: s.status === 'trial' });
};

const requirePro = async (req, res, next) => {
  const s        = req.user.subscription;
  const isActive = s.status === 'active' || (s.status === 'trial' && s.trialEndsAt > new Date());
  if (isActive && s.plan === 'pro') return next();
  return res.status(403).json({ error: 'Recurso exclusivo do plano PRO', code: 'PRO_REQUIRED' });
};

const requireNormalOrPro = async (req, res, next) => {
  const s        = req.user.subscription;
  const isActive = s.status === 'active' || (s.status === 'trial' && s.trialEndsAt > new Date());
  if (isActive && (s.plan === 'normal' || s.plan === 'pro')) return next();
  if (s.status === 'trial' && s.trialEndsAt > new Date()) return next();
  return res.status(403).json({ error: 'Recurso disponível nos planos Normal e PRO', code: 'NORMAL_REQUIRED', upgrade: true });
};

const checkClientLimit = async (req, res, next) => {
  const s = req.user.subscription;
  if (s.status === 'active' && s.plan === 'starter') {
    const count = await Client.countDocuments({ userId: req.user._id });
    if (count >= 20) {
      return res.status(403).json({ error: 'Limite de 20 clientes atingido. Faça upgrade para o Normal.', code: 'CLIENT_LIMIT', upgrade: true });
    }
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso negado' });
  next();
};

module.exports = { auth, requireActive, requirePro, requireNormalOrPro, requireAdmin, checkClientLimit };
