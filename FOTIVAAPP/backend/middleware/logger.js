const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail:  { type: String, default: null },
  method:     { type: String },
  route:      { type: String },
  ip:         { type: String },
  userAgent:  { type: String },
  statusCode: { type: Number },
  duration:   { type: Number },
  timestamp:  { type: Date, default: Date.now }
});

// TTL de 90 dias — apaga automaticamente
accessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

// Rotas que NUNCA precisam ser logadas
const SKIP_ROUTES = [
  '/api/health',
  '/favicon.ico',
  '/api/dashboard',
  '/api/events',
  '/api/clients',
  '/api/reports',
];

// Só logamos erros (>=400) e ações críticas
const CRITICAL_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/subscription',
  '/api/webhook',
  '/api/admin',
  '/api/lgpd',
  '/api/gallery/photographer',
];

const isCritical = (path, method) => {
  if (method === 'DELETE') return true;
  return CRITICAL_ROUTES.some(r => path.startsWith(r));
};

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  if (SKIP_ROUTES.some(r => req.path.startsWith(r))) return next();

  res.on('finish', async () => {
    try {
      const shouldLog = res.statusCode >= 400 || isCritical(req.path, req.method);
      if (!shouldLog) return;

      const duration = Date.now() - start;
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
      await AccessLog.create({
        userId:     req.user?._id || null,
        userEmail:  req.user?.email || null,
        method:     req.method,
        route:      req.path,
        ip,
        userAgent:  req.headers['user-agent'] || '',
        statusCode: res.statusCode,
        duration,
      });
    } catch {
      // erro de log nunca trava a aplicação
    }
  });

  next();
};

module.exports = { loggerMiddleware, AccessLog };
