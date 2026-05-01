const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { AccessLog } = require('../middleware/logger');
const mongoose = require('mongoose');
const User = require('../models/User');

// GET /api/lgpd/meus-dados — exportar todos os dados do usuário
router.get('/meus-dados', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password');
    const logs = await AccessLog.find({ userId }).limit(100).sort({ timestamp: -1 }).catch(() => []);

    let clients = [], events = [];
    try { clients = await mongoose.model('Client').find({ userId }); } catch(e) {}
    try { events  = await mongoose.model('Event').find({ userId }); } catch(e) {}

    const dados = {
      exportadoEm: new Date().toISOString(),
      titular: {
        nome:       user?.name,
        email:      user?.email,
        estudio:    user?.studioName,
        telefone:   user?.phone,
        documento:  user?.document,
        plano:      user?.plan,
        cadastroEm: user?.createdAt
      },
      clientes:  clients,
      eventos:   events,
      logsAcesso: logs.map(l => ({
        data:   l.timestamp,
        rota:   l.route,
        ip:     l.ip,
        status: l.statusCode
      }))
    };

    res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-fotiva.json"');
    res.json(dados);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao exportar dados.' });
  }
});

// GET /api/lgpd/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('deletionRequested deletionScheduledFor consentAcceptedAt');
    res.json({
      exclusaoPendente:     user?.deletionRequested || false,
      exclusaoAgendadaPara: user?.deletionScheduledFor || null,
      termoAceitoEm:        user?.consentAcceptedAt || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar status.' });
  }
});

// POST /api/lgpd/solicitar-exclusao
router.post('/solicitar-exclusao', requireAuth, async (req, res) => {
  try {
    const { motivo } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      deletionRequested:    true,
      deletionRequestedAt:  new Date(),
      deletionMotivo:       motivo || 'Não informado',
      deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    res.json({
      message: 'Solicitação registrada.',
      info: 'Sua conta será excluída em 30 dias. Você pode cancelar em Configurações.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar solicitação.' });
  }
});

// POST /api/lgpd/cancelar-exclusao
router.post('/cancelar-exclusao', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      deletionRequested:    false,
      deletionRequestedAt:  null,
      deletionMotivo:       null,
      deletionScheduledFor: null
    });
    res.json({ message: 'Solicitação de exclusão cancelada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar.' });
  }
});

// POST /api/lgpd/executar-exclusoes — chamado pelo cron-job
router.post('/executar-exclusoes', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  try {
    const agora = new Date();
    const usuarios = await User.find({
      deletionRequested:    true,
      deletionScheduledFor: { $lte: agora }
    });
    let excluidos = 0;
    for (const user of usuarios) {
      const uid = user._id;
      try { await mongoose.model('Client').deleteMany({ userId: uid }); } catch(e) {}
      try { await mongoose.model('Event').deleteMany({ userId: uid }); } catch(e) {}
      await AccessLog.deleteMany({ userId: uid });
      await User.findByIdAndDelete(uid);
      excluidos++;
    }
    res.json({ message: `${excluidos} conta(s) excluída(s).` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
