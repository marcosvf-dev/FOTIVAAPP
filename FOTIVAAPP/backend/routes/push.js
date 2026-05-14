const router   = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const User     = require('../models/User');
const axios    = require('axios');

const ONESIGNAL_APP_ID  = process.env.ONESIGNAL_APP_ID  || 'b4e7ad54-4540-4993-9e09-0f78a69389f9';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || 'os_v2_app_wtt22vcfibezhhqjb54kne4j7eqfatl4lv7usuvhukoiea5ffqnjbxlfbohrn7h5fs32u6mpyqfm3oxshcr7nfialjd5lstlcfqujeq';

async function sendPushToUser(userId, payload) {
  try {
    await axios.post('https://api.onesignal.com/notifications', {
      app_id:          ONESIGNAL_APP_ID,
      include_aliases: { external_id: [userId.toString()] },
      target_channel:  'push',
      headings:        { en: payload.title || 'Fotiva' },
      contents:        { en: payload.body  || '' },
      url:             `https://fotivaapp-frontend.onrender.com${payload.data?.url || '/'}`,
      web_push_topic:  payload.tag || 'fotiva',
    }, {
      headers: {
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    console.error('[OneSignal] Erro:', e.response?.data || e.message);
  }
}

// POST /api/push/register — salva playerId do usuário
router.post('/register', auth, async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId obrigatório' });
    await User.findByIdAndUpdate(req.user._id, { oneSignalPlayerId: playerId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/push/test
router.post('/test', auth, requireActive, async (req, res) => {
  try {
    await sendPushToUser(req.user._id, {
      title: '🎉 Fotiva — Teste',
      body:  'Notificações push funcionando perfeitamente!',
      data:  { url: '/dashboard' },
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/push/notify-events — cron-job diário
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

    // Eventos nas próximas 48h
    const eventos = await Event.find({
      eventDate: { $gte: hoje, $lte: em2 },
      status: { $ne: 'cancelado' },
    }).populate('userId');

    for (const ev of eventos) {
      const user = ev.userId;
      if (!user) continue;

      const dataEv   = new Date(ev.eventDate); dataEv.setHours(0,0,0,0);
      const diffDias = Math.round((dataEv - hoje) / 86400000);

      let msg = '';
      if (diffDias === 0)      msg = `📸 Hoje você tem ${ev.eventType} — ${ev.clientName}! Boa sorte!`;
      else if (diffDias === 1) msg = `⏰ Amanhã: ${ev.eventType} — ${ev.clientName}. Tudo preparado?`;
      else                     msg = `📅 Em ${diffDias} dias: ${ev.eventType} — ${ev.clientName}.`;

      await sendPushToUser(user._id, {
        title: 'Fotiva — Lembrete de Evento',
        body:  msg,
        data:  { url: '/eventos' },
      });
      notificados++;
    }

    // Parcelas vencendo hoje ou amanhã
    const eventosComParcelas = await Event.find({
      'installmentList.paid':    false,
      'installmentList.dueDate': { $gte: hoje, $lte: amanha },
    }).populate('userId');

    for (const ev of eventosComParcelas) {
      const user = ev.userId;
      if (!user) continue;

      for (const inst of ev.installmentList) {
        if (inst.paid) continue;
        const due      = new Date(inst.dueDate); due.setHours(0,0,0,0);
        const diffDias = Math.round((due - hoje) / 86400000);
        if (diffDias < 0 || diffDias > 1) continue;

        const msg = diffDias === 0
          ? `💰 Hoje vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`
          : `💰 Amanhã vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`;

        await sendPushToUser(user._id, {
          title: 'Fotiva — Vencimento de Parcela',
          body:  msg,
          data:  { url: '/pagamentos' },
        });
        notificados++;
      }
    }

    // Inadimplência — +3 dias de atraso
    const tresDiasAtras = new Date(hoje); tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

    const eventosAtrasados = await Event.find({
      'installmentList.paid':    false,
      'installmentList.dueDate': { $lte: tresDiasAtras },
    }).populate('userId');

    for (const ev of eventosAtrasados) {
      const user = ev.userId;
      if (!user) continue;

      for (const inst of ev.installmentList) {
        if (inst.paid) continue;
        const due      = new Date(inst.dueDate); due.setHours(0,0,0,0);
        const diffDias = Math.round((due - hoje) / 86400000);
        if (diffDias > -3) continue;

        await sendPushToUser(user._id, {
          title: '⚠️ Fotiva — Pagamento em Atraso',
          body:  `Parcela ${inst.number}/${inst.total} de ${ev.clientName} está ${Math.abs(diffDias)} dias em atraso — R$${inst.value.toFixed(2)}`,
          data:  { url: '/pagamentos' },
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
