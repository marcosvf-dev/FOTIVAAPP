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

accessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const skipRoutes = ['/api/health', '/favicon.ico'];
  if (skipRoutes.includes(req.path)) return next();

  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      await AccessLog.create({
        userId:     req.user?._id || null,
        userEmail:  req.user?.email || null,
        method:     req.method,
        route:      req.path,
        ip,
        userAgent:  req.headers['user-agent'] || '',
        statusCode: res.statusCode,
        duration
      });
    } catch (err) {
      console.error('[Logger] Erro ao salvar log:', err.message);
    }
  });
  next();
};

module.exports = { loggerMiddleware, AccessLog };
