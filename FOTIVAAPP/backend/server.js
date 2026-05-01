require('express-async-errors');
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const cron     = require('node-cron');

const app = express();

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
  allowedHeaders: ['Content-Type','Authorization','stripe-signature','x-cron-secret'],
}));

app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'fotiva' })
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(e => { console.error('❌ MongoDB:', e.message); process.exit(1); });

const { loggerMiddleware } = require('./middleware/logger');
app.use(loggerMiddleware);

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/events',       require('./routes/events'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/push',         require('./routes/push'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/webhook',      require('./routes/webhook'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/coupons',      require('./routes/coupons'));
app.use('/api/installments', require('./routes/installments'));
app.use('/api/ads',          require('./routes/ads'));
app.use('/api/gallery',      require('./routes/gallery'));
app.use('/api/lgpd',         require('./routes/lgpd'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '3.0.0', time: new Date() }));
app.get('/api/',       (_, res) => res.json({ message: 'Fotiva API v3.0 — Stripe' }));

cron.schedule('0 2 * * *', async () => {
  const User = require('./models/User');
  const result = await User.updateMany(
    { 'subscription.status': 'active', 'subscription.expiresAt': { $lt: new Date() } },
    { $set: { 'subscription.status': 'expired', 'subscription.plan': 'free' } }
  );
  if (result.modifiedCount > 0)
    console.log(`⏰ Cron: ${result.modifiedCount} assinaturas expiradas`);
});

app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Fotiva API v3.0 na porta ${PORT}`));
