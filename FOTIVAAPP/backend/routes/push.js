const router   = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const User     = require('../models/User');

// VAPID keys - configure no Render
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = `mailto:${process.env.ADMIN_EMAIL || 'admin@fotiva.app'}`;

function getWebPush() {
  try {
    const wp = require('web-push');
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      wp.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    }
    return wp;
  } catch { return null; }
}

// Retorna VAPID public key para o frontend
router.get('/vapid-key', (req, res) => {
  if (!VAPID_PUBLIC) return res.json({ key: null });
  res.json({ key: VAPID_PUBLIC });
});

// Salva subscription do usuário
router.post('/subscribe', auth, requireActive, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Subscription inválida' });
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove subscription
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Envia notificação de teste
router.post('/test', auth, requireActive, async (req, res) => {
  const wp = getWebPush();
  if (!wp) return res.status(503).json({ error: 'web-push não configurado. Instale: npm install web-push' });

  const user = await User.findById(req.user._id);
  if (!user?.pushSubscription) return res.status(400).json({ error: 'Nenhuma subscription ativa. Ative as notificações primeiro.' });

  try {
    await wp.sendNotification(user.pushSubscription, JSON.stringify({
      title: '🎉 Fotiva — Teste',
      body: 'Notificações funcionando! Você receberá alertas dos seus eventos.',
      tag: 'fotiva-test',
      data: { url: '/dashboard' },
    }));
    res.json({ ok: true });
  } catch (e) {
    if (e.statusCode === 410) {
      await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
      return res.status(410).json({ error: 'Subscription expirada. Por favor, reative as notificações.' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Enviar notificação para um usuário específico (usado internamente)
async function sendPushToUser(userId, payload) {
  const wp = getWebPush();
  if (!wp) return;
  try {
    const user = await User.findById(userId).select('pushSubscription');
    if (!user?.pushSubscription) return;
    await wp.sendNotification(user.pushSubscription, JSON.stringify(payload));
  } catch (e) {
    if (e.statusCode === 410) await User.findByIdAndUpdate(userId, { pushSubscription: null });
  }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
