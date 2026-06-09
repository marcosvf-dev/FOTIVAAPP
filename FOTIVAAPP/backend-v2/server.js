require('express-async-errors');
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cron       = require('node-cron');
const prisma     = require('./lib/prisma');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const origins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes('*') || origins.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqueado: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','stripe-signature','x-cron-secret','x-internal-key'],
}));

// Rate limits
const rl = (max, windowMs = 15*60*1000) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
app.use('/api/',                     rl(100));
app.use('/api/auth/login',           rl(10));
app.use('/api/auth/register',        rl(10));
app.use('/api/auth/forgot-password', rl(5, 60*60*1000));
app.use('/api/admin',                rl(20));

// Webhook precisa de raw body
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
const { loggerMiddleware } = require('./middleware/logger');
app.use(loggerMiddleware);

// Rotas
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/events',       require('./routes/events'));
app.use('/api/installments', require('./routes/installments'));
app.use('/api/expenses',     require('./routes/expenses'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/gallery',      require('./routes/gallery'));
app.use('/api/equipments',   require('./routes/equipments'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/push',         require('./routes/push'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/webhook',      require('./routes/webhook'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/coupons',      require('./routes/coupons'));
app.use('/api/lgpd',         require('./routes/lgpd'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '2.0.0', time: new Date() }));

// Cron: expira assinaturas vencidas todo dia às 2h
cron.schedule('0 2 * * *', async () => {
  const result = await prisma.user.updateMany({
    where: { subStatus: 'active', subExpiresAt: { lt: new Date() } },
    data:  { subStatus: 'expired', subPlan: 'free' },
  });
  if (result.count > 0) console.log(`⏰ ${result.count} assinaturas expiradas`);
});

// Cron: limpa tokens de reset expirados todo dia às 4h
cron.schedule('0 4 * * *', async () => {
  const result = await prisma.user.updateMany({
    where: { resetPasswordExpires: { lt: new Date() }, NOT: { resetPasswordToken: null } },
    data:  { resetPasswordToken: null, resetPasswordExpires: null },
  });
  if (result.count > 0) console.log(`🧹 ${result.count} tokens de reset limpos`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'campo';
    return res.status(400).json({ error: `${field} já está em uso.` });
  }
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Fotiva API v2.0 na porta ${PORT}`));
