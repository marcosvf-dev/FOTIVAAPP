const prisma = require('../lib/prisma');

const SKIP_ROUTES = ['/api/health','/favicon.ico','/api/dashboard','/api/events','/api/clients','/api/reports'];
const CRITICAL_ROUTES = ['/api/auth/login','/api/auth/register','/api/auth/forgot-password','/api/subscription','/api/webhook','/api/admin','/api/lgpd','/api/gallery/photographer'];

const isCritical = (path, method) => {
  if (method === 'DELETE') return true;
  return CRITICAL_ROUTES.some(r => path.startsWith(r));
};

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  if (SKIP_ROUTES.some(r => req.path.startsWith(r))) return next();

  res.on('finish', async () => {
    try {
      if (!(res.statusCode >= 400 || isCritical(req.path, req.method))) return;
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
      await prisma.accessLog.create({
        data: {
          userId:     req.user?.id    || null,
          userEmail:  req.user?.email || null,
          method:     req.method,
          route:      req.path,
          ip:         ip || null,
          userAgent:  req.headers['user-agent'] || '',
          statusCode: res.statusCode,
          duration:   Date.now() - start,
        }
      });
    } catch {}
  });
  next();
};

module.exports = { loggerMiddleware };
