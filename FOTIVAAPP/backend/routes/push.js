const router   = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const User     = require('../models/User');
const { sendWhatsApp } = require('../lib/whatsapp');

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
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Subscription inválida' });
  await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
  res.json({ ok: true });
});

// Remove subscription
router.post('/unsubscribe', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
  res.json({ ok: true });
});

// Salva número WhatsApp do usuário
router.post('/whatsapp-config', auth, requireActive, async (req, res) => {
  const { whatsappPhone, whatsappApiKey } = req.body;
  if (!whatsappPhone) return res.status(400).json({ error: 'Número obrigatório' });
  await User.findByIdAndUpdate(req.user._id, { whatsappPhone, whatsappApiKey: whatsappApiKey || '' });
  res.json({ ok: true });
});

// Teste de notificação push
router.post('/test-push', auth, requireActive, async (req, res) => {
  const wp = getWebPush();
  if (!wp) return res.status(503).json({ error: 'web-push não instalado no servidor' });
  const user = await User.findById(req.user._id);
  if (!user?.pushSubscription) return res.status(400).json({ error: 'Nenhuma subscription ativa' });
  try {
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

// Teste de WhatsApp
router.post('/test-whatsapp', auth, requireActive, async (req, res) => {
  const user = await User.findById(req.user._id);
  const phone  = user?.whatsappPhone  || process.env.CALLMEBOT_PHONE;
  const apiKey = user?.whatsappApiKey || process.env.CALLMEBOT_API_KEY;

  if (!phone || !apiKey) return res.status(400).json({ error: 'Configure seu WhatsApp nas configurações' });

  const msg = `🎉 *Fotiva — Teste*\n\nSeu WhatsApp está conectado!\nVocê receberá alertas dos seus eventos aqui. 📸`;

  const { ok, reason } = await sendWhatsAppDirect(phone, apiKey, msg);
  if (!ok) return res.status(500).json({ error: reason || 'Erro ao enviar WhatsApp' });
  res.json({ ok: true });
});

// Função interna para enviar WA com chave personalizada
async function sendWhatsAppDirect(phone, apiKey, message) {
  const fetch = require('node-fetch');
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedMsg}&apikey=${apiKey}`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    return { ok: res.status < 400 };
  } catch (e) { return { ok: false, reason: e.message }; }
}

// Enviar notificação completa (push + WhatsApp)
async function sendFullNotification(userId, { title, body, url = '/eventos' }) {
  const user = await User.findById(userId).select('pushSubscription whatsappPhone whatsappApiKey name');
  if (!user) return;

  // Push notification
  const wp = getWebPush();
  if (wp && user.pushSubscription) {
    try {
      await wp.sendNotification(user.pushSubscription, JSON.stringify({ title, body, tag: 'fotiva-event', data: { url } }));
    } catch (e) {
      if (e.statusCode === 410) await User.findByIdAndUpdate(userId, { pushSubscription: null });
    }
  }

  // WhatsApp
  const phone  = user.whatsappPhone  || process.env.CALLMEBOT_PHONE;
  const apiKey = user.whatsappApiKey || process.env.CALLMEBOT_API_KEY;
  if (phone && apiKey) {
    await sendWhatsAppDirect(phone, apiKey, `*${title}*\n\n${body}`);
  }
}

module.exports = router;
module.exports.sendFullNotification = sendFullNotification;

// ── Notificação diária de eventos (chamada pelo cron-job.org) ──
router.post('/notify-events', async (req, res) => {
  const wp = getWebPush();
  const User  = require('../models/User');
  const Event = require('../models/models').Event;

  const agora  = new Date();
  const hoje   = new Date(agora); hoje.setHours(0,0,0,0);
  const amanha = new Date(hoje);  amanha.setDate(amanha.getDate() + 1);
  const em2    = new Date(hoje);  em2.setDate(em2.getDate() + 2);

  // Busca eventos nas próximas 48h
  const eventos = await Event.find({
    eventDate: { $gte: hoje, $lte: em2 },
    status: { $ne: 'cancelado' },
  }).populate('userId');

  let notificados = 0;

  for (const ev of eventos) {
    const user = ev.userId;
    if (!user?.pushSubscription) continue;

    const dataEv = new Date(ev.eventDate);
    dataEv.setHours(0,0,0,0);
    const diffDias = Math.round((dataEv - hoje) / 86400000);

    let msg = '';
    if (diffDias === 0) msg = `📸 Hoje você tem ${ev.eventType} — ${ev.clientName}! Boa sorte!`;
    else if (diffDias === 1) msg = `⏰ Amanhã: ${ev.eventType} — ${ev.clientName}. Tudo preparado?`;
    else msg = `📅 Em ${diffDias} dias: ${ev.eventType} — ${ev.clientName}.`;

    try {
      if (wp) {
        await wp.sendNotification(user.pushSubscription, JSON.stringify({
          title: 'Fotiva — Lembrete de Evento',
          body:  msg,
          tag:   `event-${ev._id}`,
          data:  { url: '/eventos' },
        }));
      }
      notificados++;
    } catch (e) {
      if (e.statusCode === 410) await User.findByIdAndUpdate(user._id, { pushSubscription: null });
    }
  }

  // Também verifica parcelas vencendo
  const { Event: Ev } = require('../models/models');
  const eventosComParcelas = await Event.find({
    'installmentList.paid': false,
    'installmentList.dueDate': { $gte: hoje, $lte: amanha },
  }).populate('userId');

  for (const ev of eventosComParcelas) {
    const user = ev.userId;
    if (!user?.pushSubscription) continue;

    for (const inst of ev.installmentList) {
      if (inst.paid) continue;
      const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
      const diffDias = Math.round((due - hoje) / 86400000);
      if (diffDias < 0 || diffDias > 1) continue;

      const msg = diffDias === 0
        ? `💰 Hoje vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`
        : `💰 Amanhã vence parcela ${inst.number}/${inst.total} de ${ev.clientName} — R$${inst.value.toFixed(2)}`;

      try {
        if (wp) {
          await wp.sendNotification(user.pushSubscription, JSON.stringify({
            title: 'Fotiva — Vencimento',
            body:  msg,
            tag:   `inst-${ev._id}-${inst._id}`,
            data:  { url: '/pagamentos' },
          }));
          notificados++;
        }
      } catch (e) {
        if (e.statusCode === 410) await User.findByIdAndUpdate(user._id, { pushSubscription: null });
      }
    }
  }

  res.json({ ok: true, notificados, timestamp: new Date().toISOString() });
});
