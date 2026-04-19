const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Verifica se assinatura está ativa (trial válido ou pago)
const requireActive = async (req, res, next) => {
  const s = req.user.subscription;
  const now = new Date();

  if (s.status === 'active') return next();
  if (s.status === 'trial' && s.trialEndsAt > now) return next();

  return res.status(403).json({
    error: 'Assinatura necessária',
    code: 'SUBSCRIPTION_REQUIRED',
    trialExpired: s.status === 'trial',
  });
};

// Verifica se é plano PRO
const requirePro = async (req, res, next) => {
  const s = req.user.subscription;
  if (s.plan === 'pro' && s.status === 'active') return next();
  return res.status(403).json({
    error: 'Recurso exclusivo do plano PRO',
    code: 'PRO_REQUIRED',
  });
};

// Verifica se é admin
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin)
    return res.status(403).json({ error: 'Acesso negado' });
  next();
};

module.exports = { auth, requireActive, requirePro, requireAdmin };
