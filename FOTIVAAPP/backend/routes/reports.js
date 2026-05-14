const router     = require('express').Router();
const nodemailer = require('nodemailer');
const { auth }   = require('../middleware/auth');
const User       = require('../models/User');
const { Event }  = require('../models/models');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function gerarHTMLRelatorio({ user, mes, ano, stats }) {
  const fmtMoney = (v) => 'R$' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits:2 });
  const nomeMes  = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

  const linhasEventos = stats.eventos.map(ev => `
    <tr>
      <td style="padding:10px 14px; border-bottom:1px solid #222; color:#ccc; font-size:13px;">${ev.clientName}</td>
      <td style="padding:10px 14px; border-bottom:1px solid #222; color:#ccc; font-size:13px;">${ev.eventType}</td>
      <td style="padding:10px 14px; border-bottom:1px solid #222; color:#E87722; font-size:13px; font-weight:700;">${fmtMoney(ev.totalValue)}</td>
      <td style="padding:10px 14px; border-bottom:1px solid #222; color:#22C55E; font-size:13px;">${fmtMoney(ev.amountPaid)}</td>
      <td style="padding:10px 14px; border-bottom:1px solid #222; color:${ev.remaining > 0 ? '#EF4444' : '#22C55E'}; font-size:13px;">${fmtMoney(ev.remaining)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0; padding:0; background:#0a0a0a; font-family:Arial,sans-serif;">
  <div style="max-width:640px; margin:0 auto; padding:32px 20px;">

    <div style="background:linear-gradient(135deg,#1a1a1a,#111); border:1px solid #222; border-radius:16px; padding:28px 32px; margin-bottom:20px; text-align:center;">
      <div style="font-size:28px; font-weight:900; color:#E87722; margin-bottom:4px;">FOTIVA</div>
      <div style="color:#555; font-size:13px;">Relatório Mensal</div>
      <div style="color:#fff; font-size:20px; font-weight:700; margin-top:12px; text-transform:capitalize;">${nomeMes}</div>
      <div style="color:#666; font-size:13px; margin-top:4px;">Olá, ${user.name || 'Fotógrafo'}! Aqui está seu resumo do mês.</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="25%" style="padding:4px;">
          <div style="background:#111; border:1px solid #222; border-radius:12px; padding:18px 14px; text-align:center;">
            <div style="font-size:22px; font-weight:900; color:#E87722;">${stats.totalEventos}</div>
            <div style="color:#555; font-size:11px; margin-top:4px;">Eventos</div>
          </div>
        </td>
        <td width="25%" style="padding:4px;">
          <div style="background:#111; border:1px solid #222; border-radius:12px; padding:18px 14px; text-align:center;">
            <div style="font-size:15px; font-weight:900; color:#22C55E;">${fmtMoney(stats.receitaTotal)}</div>
            <div style="color:#555; font-size:11px; margin-top:4px;">Receitas</div>
          </div>
        </td>
        <td width="25%" style="padding:4px;">
          <div style="background:#111; border:1px solid #222; border-radius:12px; padding:18px 14px; text-align:center;">
            <div style="font-size:15px; font-weight:900; color:#EF4444;">${fmtMoney(stats.totalPendente)}</div>
            <div style="color:#555; font-size:11px; margin-top:4px;">Pendente</div>
          </div>
        </td>
        <td width="25%" style="padding:4px;">
          <div style="background:#111; border:1px solid ${stats.lucro >= 0 ? '#22C55E' : '#EF4444'}33; border-radius:12px; padding:18px 14px; text-align:center;">
            <div style="font-size:15px; font-weight:900; color:${stats.lucro >= 0 ? '#22C55E' : '#EF4444'};">${fmtMoney(stats.lucro)}</div>
            <div style="color:#555; font-size:11px; margin-top:4px;">Lucro est.</div>
          </div>
        </td>
      </tr>
    </table>

    ${stats.eventos.length > 0 ? `
    <div style="background:#111; border:1px solid #222; border-radius:12px; overflow:hidden; margin-bottom:20px;">
      <div style="padding:16px 20px; border-bottom:1px solid #222;">
        <div style="color:#E87722; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Eventos do Mês</div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#161616;">
          <th style="padding:10px 14px; text-align:left; color:#555; font-size:11px; font-weight:700; text-transform:uppercase;">Cliente</th>
          <th style="padding:10px 14px; text-align:left; color:#555; font-size:11px; font-weight:700; text-transform:uppercase;">Tipo</th>
          <th style="padding:10px 14px; text-align:left; color:#555; font-size:11px; font-weight:700; text-transform:uppercase;">Total</th>
          <th style="padding:10px 14px; text-align:left; color:#555; font-size:11px; font-weight:700; text-transform:uppercase;">Recebido</th>
          <th style="padding:10px 14px; text-align:left; color:#555; font-size:11px; font-weight:700; text-transform:uppercase;">Saldo</th>
        </tr>
        ${linhasEventos}
      </table>
    </div>
    ` : ''}

    ${stats.parcelasAtrasadas.length > 0 ? `
    <div style="background:#1a0a0a; border:1px solid #7f1d1d; border-radius:12px; padding:20px; margin-bottom:20px;">
      <div style="color:#EF4444; font-size:13px; font-weight:700; margin-bottom:12px;">⚠️ ${stats.parcelasAtrasadas.length} parcela(s) em atraso</div>
      ${stats.parcelasAtrasadas.map(p => `
        <div style="color:#ccc; font-size:13px; padding:6px 0; border-bottom:1px solid #2a0a0a;">
          ${p.clientName} — ${p.eventType} · Parcela ${p.number}/${p.total} · ${fmtMoney(p.value)}
          <span style="color:#EF4444; font-size:11px;"> (${Math.abs(p.diffDias)} dias de atraso)</span>
        </div>
      `).join('')}
    </div>
    ` : `
    <div style="background:#0a1a0a; border:1px solid #14532d; border-radius:12px; padding:16px 20px; margin-bottom:20px; text-align:center;">
      <div style="color:#22C55E; font-size:14px; font-weight:700;">✅ Nenhuma parcela em atraso!</div>
    </div>
    `}

    ${stats.proximosEventos.length > 0 ? `
    <div style="background:#111; border:1px solid #222; border-radius:12px; padding:20px; margin-bottom:20px;">
      <div style="color:#E87722; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:12px;">Próximos Eventos</div>
      ${stats.proximosEventos.map(ev => {
        const data = new Date(ev.eventDate).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
        return `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1a1a1a; color:#ccc; font-size:13px;">
          <span>${ev.eventType} — ${ev.clientName}</span>
          <span style="color:#E87722;">${data}</span>
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    <div style="text-align:center; padding:20px; color:#444; font-size:12px;">
      <div style="color:#E87722; font-weight:700; margin-bottom:4px;">FOTIVA</div>
      Este relatório foi gerado automaticamente no dia 1º de cada mês.<br/>
      Acesse o app em <a href="https://fotivaapp-frontend.onrender.com" style="color:#E87722;">fotivaapp-frontend.onrender.com</a>
    </div>
  </div>
</body>
</html>`;
}

async function calcularStats(userId, mes, ano) {
  const inicio = new Date(ano, mes - 1, 1);
  const fim    = new Date(ano, mes, 0, 23, 59, 59);
  const agora  = new Date();

  const eventos = await Event.find({ userId, eventDate: { $gte: inicio, $lte: fim } });

  const receitaTotal  = eventos.reduce((s, e) => s + (e.amountPaid || 0), 0);
  const totalPendente = eventos.reduce((s, e) => s + Math.max(0, (e.totalValue||0) - (e.amountPaid||0)), 0);

  let despesasMes = 0;
  try {
    const Expense = require('mongoose').model('Expense');
    const desp    = await Expense.find({ userId, date: { $gte: inicio, $lte: fim } });
    despesasMes   = desp.reduce((s, d) => s + d.amount, 0);
  } catch(e) {}

  const todosEventos = await Event.find({ userId });
  const parcelasAtrasadas = [];
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  for (const ev of todosEventos) {
    for (const inst of (ev.installmentList || [])) {
      if (inst.paid) continue;
      const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
      const diff = Math.round((due - hoje) / 86400000);
      if (diff < 0) {
        parcelasAtrasadas.push({
          clientName: ev.clientName,
          eventType:  ev.eventType,
          number:     inst.number,
          total:      inst.total,
          value:      inst.value,
          diffDias:   diff,
        });
      }
    }
  }

  const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);
  const proximosEventos = await Event.find({
    userId,
    eventDate: { $gte: hoje, $lte: em30 },
    status: { $ne: 'cancelado' },
  }).sort({ eventDate: 1 }).limit(5);

  return {
    totalEventos: eventos.length,
    receitaTotal,
    totalPendente,
    lucro: receitaTotal - despesasMes,
    eventos: eventos.map(e => ({
      clientName: e.clientName,
      eventType:  e.eventType,
      totalValue: e.totalValue,
      amountPaid: e.amountPaid,
      remaining:  Math.max(0, (e.totalValue||0) - (e.amountPaid||0)),
    })),
    parcelasAtrasadas,
    proximosEventos,
  };
}

// POST /api/reports/enviar-mensal — chamado pelo cron-job no dia 1
router.post('/enviar-mensal', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const agora       = new Date();
    const mesAnterior = agora.getMonth() === 0 ? 12 : agora.getMonth();
    const anoRef      = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
    const usuarios    = await User.find({ 'subscription.status': { $in: ['active','trial'] } })
      .select('name email studioName');

    let enviados      = 0;
    const transporter = getTransporter();

    for (const user of usuarios) {
      try {
        const stats = await calcularStats(user._id, mesAnterior, anoRef);
        if (stats.totalEventos === 0 && stats.parcelasAtrasadas.length === 0) continue;

        const html    = gerarHTMLRelatorio({ user, mes: mesAnterior, ano: anoRef, stats });
        const nomeMes = new Date(anoRef, mesAnterior - 1, 1)
          .toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

        await transporter.sendMail({
          from:    `"Fotiva" <${process.env.SMTP_USER}>`,
          to:      user.email,
          subject: `📊 Fotiva — Relatório de ${nomeMes}`,
          html,
        });
        enviados++;
      } catch(e) {
        console.error(`Erro ao enviar para ${user.email}:`, e.message);
      }
    }

    res.json({ ok: true, enviados, timestamp: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/reports/testar — envia relatório de teste para o usuário logado
router.post('/testar', auth, async (req, res) => {
  try {
    const agora   = new Date();
    const mes     = agora.getMonth() + 1;
    const ano     = agora.getFullYear();
    const user    = await User.findById(req.user._id);
    const stats   = await calcularStats(req.user._id, mes, ano);
    const html    = gerarHTMLRelatorio({ user, mes, ano, stats });
    const nomeMes = agora.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

    const transporter = getTransporter();
    await transporter.sendMail({
      from:    `"Fotiva" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: `📊 Fotiva — Relatório de Teste (${nomeMes})`,
      html,
    });

    res.json({ ok: true, message: `Relatório enviado para ${user.email}` });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
