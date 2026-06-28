const router = require('express').Router();
const prisma = require('../lib/prisma');
const { sendPushToUser } = require('./push');

// POST /api/notifications/check-daily
router.post('/check-daily', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const counts = { parcelasHoje: 0, parcelasAtrasadas: 0, eventos7dias: 0, eventos1dia: 0 };

  // --- PARCELAS ---
  const installments = await prisma.installment.findMany({
    where: { paid: false },
    include: { event: { select: { userId: true, clientName: true } } },
  });

  for (const inst of installments) {
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((hoje - due) / 86400000);

    if (diffDays === 0) {
      try {
        await sendPushToUser(inst.event.userId, {
          title: 'Parcela vence hoje',
          body:  `Hoje vence a parcela ${inst.number} de ${inst.total} de ${inst.event.clientName}`,
          url:   '/pagamentos',
        });
        counts.parcelasHoje++;
      } catch (e) { console.error('Push parcela hoje:', e.message); }
    } else if (diffDays === 5) {
      try {
        await sendPushToUser(inst.event.userId, {
          title: 'Parcela em atraso',
          body:  `A parcela ${inst.number} de ${inst.total} de ${inst.event.clientName} está com 5 dias de atraso`,
          url:   '/pagamentos',
        });
        counts.parcelasAtrasadas++;
      } catch (e) { console.error('Push parcela atrasada:', e.message); }
    }
  }

  // --- EVENTOS ---
  const events = await prisma.event.findMany({
    where: { status: { not: 'cancelado' }, archived: false, eventDate: { not: null } },
  });

  for (const ev of events) {
    const evDate = new Date(ev.eventDate);
    const evDay  = new Date(evDate);
    evDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((evDay - hoje) / 86400000);

    if (diffDays !== 7 && diffDays !== 1) continue;

    const dataFormatada = evDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormatada = evDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 7) {
      try {
        await sendPushToUser(ev.userId, {
          title: 'Evento em 7 dias',
          body:  `Em 7 dias, ${ev.eventType} em ${dataFormatada} de ${ev.clientName}, às ${horaFormatada}, em ${ev.location}`,
          url:   `/eventos/${ev.id}`,
        });
        counts.eventos7dias++;
      } catch (e) { console.error('Push evento 7 dias:', e.message); }
    } else {
      try {
        await sendPushToUser(ev.userId, {
          title: 'Evento amanhã',
          body:  `Amanhã, ${ev.eventType} em ${dataFormatada}, de ${ev.clientName}, às ${horaFormatada}, em ${ev.location}`,
          url:   `/eventos/${ev.id}`,
        });
        counts.eventos1dia++;
      } catch (e) { console.error('Push evento amanhã:', e.message); }
    }
  }

  res.json(counts);
});

module.exports = router;
