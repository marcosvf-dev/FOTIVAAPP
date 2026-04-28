const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const User = require('../models/User');

// VAPID keys
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = `mailto:${process.env.ADMIN_EMAIL || 'admin@fotiva.app'}`;

function getWebPush() {
  try {
    const wp = require('web-push');
    if (VAPID_PUBLIC && VAPID_PRIVATE) wp.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    return wp;
  } catch { return null; }
}

// Retorna VAPID public key
router.get('/vapid-key', (req, res) => res.json({ key: VAPID_PUBLIC || null }));

// Salva subscription push
router.post('/subscribe', auth, requireActive, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Subscription inválida' });
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

// Teste de notificação push
router.post('/test', auth, requireActive, async (req, res) => {
  const wp = getWebPush();
  if (!wp) return res.status(503).json({ error: 'web-push não configurado no servidor' });
  try {
    const user = await User.findById(req.user._id);
    if (!user?.pushSubscription) return res.status(400).json({ error: 'Nenhuma subscription ativa. Ative as notificações primeiro.' });
    await wp.sendNotification(user.pushSubscription, JSON.stringify({
      title: '🎉 Fotiva — Teste',
      body: 'Notificações push funcionando perfeitamente!',
      tag: 'fotiva-test',
      data: { url: '/dashboard' },
    }));
    res.json({ ok: true });
  } catch (e) {
    if (e.statusCode === 410) await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
    res.status(500).json({ error: e.message });
  }
});

// Enviar push para um usuário específico (uso interno)
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

// Notificação diária — chamada pelo cron-job.org todo dia 00:08
router.post('/notify-events', async (req, res) => {
  try {
    const wp = getWebPush();
    const Event = require('../models/models').Event;

    const hoje   = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const em2    = new Date(hoje); em2.setDate(em2.getDate() + 2);

    let notificados = 0;

    // Eventos nas próximas 48h
    const eventos = await Event.find({
      eventDate: { $gte: hoje, $lte: em2 },
      status: { $ne: 'cancelado' },
    }).populate('userId');

    for (const ev of eventos) {
      const user = ev.userId;
      if (!user?.pushSubscription || !wp) continue;

      const dataEv = new Date(ev.eventDate); dataEv.setHours(0,0,0,0);
      const diffDias = Math.round((dataEv - hoje) / 86400000);

      let msg = '';
      if (diffDias === 0)      msg = `📸 Hoje você tem ${ev.eventType} — ${ev.clientName}! Boa sorte!`;
      else if (diffDias === 1) msg = `⏰ Amanhã: ${ev.eventType} — ${ev.clientName}. Tudo preparado?`;
      else                     msg = `📅 Em ${diffDias} dias: ${ev.eventType} — ${ev.clientName}.`;

      try {
        await wp.sendNotification(user.pushSubscription, JSON.stringify({
          title: 'Fotiva — Lembrete de Evento',
          body: msg,
          tag: `event-${ev._id}`,
          data: { url: '/eventos' },
        }));
        notificados++;
      } catch (e) {
        if (e.statusCode === 410) await User.findByIdAndUpdate(user._id, { pushSubscription: null });
      }
    }

    // Parcelas vencendo hoje ou amanhã
    const eventosComParcelas = await Event.find({
      'installmentList.paid': false,
      'installmentList.dueDate': { $gte: hoje, $lte: amanha },
    }).populate('userId');

    for (const ev of eventosComParcelas) {
      const user = ev.userId;
      if (!user?.pushSubscription || !wp) continue;

      for (const inst of ev.installmentList) {
        if (inst.paid) continue;
        const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
        const diffDias = Math.round((due - hoje) / 86400000);
        if (diffDias < 0 || diffDias > 1) continue;

        const msg = diffDias === 0
          ? `💰 Hoje vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`
          : `💰 Amanhã vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`;

        try {
          await wp.sendNotification(user.pushSubscription, JSON.stringify({
            title: 'Fotiva — Vencimento de Parcela',
            body: msg,
            tag: `inst-${ev._id}-${inst._id}`,
            data: { url: '/pagamentos' },
          }));
          notificados++;
        } catch (e) {
          if (e.statusCode === 410) await User.findByIdAndUpdate(user._id, { pushSubscription: null });
        }
      }
    }

    res.json({ ok: true, notificados, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('notify-events error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
