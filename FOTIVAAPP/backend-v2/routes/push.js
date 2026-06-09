const router = require('express').Router();
const prisma = require('../lib/prisma');
const webpush = require('web-push');
const { auth } = require('../middleware/auth');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(process.env.VAPID_MAILTO, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

router.get('/vapid-key', (req, res) => res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' }));

router.post('/subscribe', auth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Dados inválidos.' });
  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.json({ ok: true });
});

router.post('/unsubscribe', auth, async (req, res) => {
  const { endpoint } = req.body;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
  res.json({ ok: true });
});

async function sendPushToUser(userId, payload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    } catch (e) {
      if (e.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } });
    }
  }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
