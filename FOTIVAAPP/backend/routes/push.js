const router   = require('express').Router();
const webpush  = require('web-push');
const { auth, requireActive } = require('../middleware/auth');
const User     = require('../models/User');

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:marcosvf557@gmail.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

async function sendPushToUser(userId, payload) {
  try {
    const user = await User.findById(userId).select('pushSubscription');
    if (!user?.pushSubscription) return;
    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify({
        title: payload.title || 'Fotiva',
        body:  payload.body  || '',
        url:   payload.data?.url || '/',
        tag:   payload.tag || 'fotiva',
      })
    );
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      await User.findByIdAndUpdate(userId, { pushSubscription: null });
      console.log('[push] Subscription expirada removida:', userId);
    } else {
      console.error('[push] Erro:', e.message);
    }
  }
}

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  if (!VAPID_PUBLIC) return res.status(500).json({ error: 'VAPID nao configurado' });
  res.json({ key: VAPID_PUBLIC });
});

// POST /api/push/subscribe
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription obrigatoria' });
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/push/test
router.post('/test', auth, requireActive, async (req, res) => {
  try {
    await sendPushToUser(req.user._id, {
      title: '🎉 Fotiva — Teste',
      body:  'Notificacoes push funcionando perfeitamente!',
      data:  { url: '/dashboard' },
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/push/notify-events — cron-job diario
router.post('/notify-events', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const Event = require('../models/models').Event;

    const hoje   = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const em2    = new Date(hoje); em2.setDate(em2.getDate() + 2);
    let notificados = 0;

    // Eventos nas proximas 48h
    const eventos = await Event.find({
      eventDate: { $gte: hoje, $lte: em2 },
      status: { $ne: 'cancelado' },
      archived: { $ne: true },
    }).populate('userId');

    for (const ev of eventos) {
      const user = ev.userId;
      if (!user?.pushSubscription) continue;
      const dataEv   = new Date(ev.eventDate); dataEv.setHours(0,0,0,0);
      const diffDias = Math.round((dataEv - hoje) / 86400000);
      let msg = '';
      if (diffDias === 0)      msg = `📸 Hoje voce tem ${ev.eventType} — ${ev.clientName}! Boa sorte!`;
      else if (diffDias === 1) msg = `⏰ Amanha: ${ev.eventType} — ${ev.clientName}. Tudo preparado?`;
      else                     msg = `📅 Em ${diffDias} dias: ${ev.eventType} — ${ev.clientName}.`;
      await sendPushToUser(user._id, {
        title: 'Fotiva — Lembrete de Evento',
        body: msg, data: { url: '/eventos' },
      });
      notificados++;
    }

    // Parcelas vencendo hoje ou amanha
    const eventosComParcelas = await Event.find({
      'installmentList.paid':    false,
      'installmentList.dueDate': { $gte: hoje, $lte: amanha },
    }).populate('userId');

    for (const ev of eventosComParcelas) {
      const user = ev.userId;
      if (!user?.pushSubscription) continue;
      for (const inst of ev.installmentList) {
        if (inst.paid) continue;
        const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
        const diff = Math.round((due - hoje) / 86400000);
        if (diff < 0 || diff > 1) continue;
        const msg = diff === 0
          ? `💰 Hoje vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`
          : `💰 Amanha vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`;
        await sendPushToUser(user._id, {
          title: 'Fotiva — Vencimento de Parcela',
          body: msg, data: { url: '/pagamentos' },
        });
        notificados++;
      }
    }

    // Inadimplencia — +3 dias de atraso
    const tresDiasAtras = new Date(hoje); tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    const atrasados = await Event.find({
      'installmentList.paid':    false,
      'installmentList.dueDate': { $lte: tresDiasAtras },
    }).populate('userId');

    for (const ev of atrasados) {
      const user = ev.userId;
      if (!user?.pushSubscription) continue;
      for (const inst of ev.installmentList) {
        if (inst.paid) continue;
        const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
        const diff = Math.round((due - hoje) / 86400000);
        if (diff > -3) continue;
        await sendPushToUser(user._id, {
          title: '⚠️ Fotiva — Pagamento em Atraso',
          body: `Parcela ${inst.number}/${inst.total} de ${ev.clientName} esta ${Math.abs(diff)} dias em atraso — R$${inst.value.toFixed(2)}`,
          data: { url: '/pagamentos' },
        });
        notificados++;
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
