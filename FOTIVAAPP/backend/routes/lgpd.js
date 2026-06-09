const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const User     = require('../models/User');
const { deleteGalleryFiles } = require('../lib/b2');
const { AccessLog } = require('../middleware/logger');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const jwt  = require('jsonwebtoken');
    const data = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.user   = data;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
}

// GET /api/lgpd/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
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

// GET /api/lgpd/meus-dados
router.get('/meus-dados', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user   = await User.findById(userId).select('-passwordHash');
    const logs   = await AccessLog.find({ userId }).limit(100).sort({ timestamp: -1 }).catch(() => []);

    let clients = [], events = [];
    try { clients = await mongoose.model('Client').find({ userId }); } catch(e) {}
    try { events  = await mongoose.model('Event').find({ userId }); }  catch(e) {}

    const dados = {
      exportadoEm: new Date().toISOString(),
      titular: {
        nome:       user?.name,
        email:      user?.email,
        estudio:    user?.studioName,
        telefone:   user?.phone,
        documento:  user?.document,
        plano:      user?.subscription?.plan,
        cadastroEm: user?.createdAt
      },
      clientes:   clients,
      eventos:    events,
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

// POST /api/lgpd/solicitar-exclusao
router.post('/solicitar-exclusao', requireAuth, async (req, res) => {
  try {
    const { motivo } = req.body;
    await User.findByIdAndUpdate(req.user._id || req.user.id, {
      deletionRequested:    true,
      deletionRequestedAt:  new Date(),
      deletionMotivo:       motivo || 'Não informado',
      deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    res.json({
      message: 'Solicitação registrada.',
      info: 'Sua conta será excluída em 30 dias. Você pode cancelar em Configurações → Privacidade.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar solicitação.' });
  }
});

// POST /api/lgpd/cancelar-exclusao
router.post('/cancelar-exclusao', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id || req.user.id, {
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

/**
 * Função central de exclusão de um usuário e todos os seus dados.
 * Usada tanto pelo cron de LGPD quanto pelo admin.
 * Ordem: R2 → Galerias → Eventos → Clientes → Logs → Usuário
 */
async function excluirUsuarioCompleto(userId) {
  const Gallery = mongoose.model('Gallery');

  // 1. Apaga arquivos do R2 para cada galeria do usuário
  const galerias = await Gallery.find({ userId }).select('_id photos').lean();
  for (const galeria of galerias) {
    try {
      // Tenta deletar pelo prefixo da galeria (mais eficiente)
      await deleteGalleryFiles(`galleries/${galeria._id}/`);
    } catch (e) {
      // Fallback: deleta foto por foto
      for (const foto of (galeria.photos || [])) {
        const keys = [foto.b2OriginalKey, foto.originalKey, foto.fullKey, foto.thumbKey]
          .filter(Boolean)
          .filter((v, i, arr) => arr.indexOf(v) === i); // remove duplicatas
        for (const key of keys) {
          try { await deleteGalleryFiles(key); } catch {}
        }
      }
    }
  }

  // 2. Apaga galerias do banco
  await Gallery.deleteMany({ userId });

  // 3. Apaga eventos
  try { await mongoose.model('Event').deleteMany({ userId }); } catch(e) {}

  // 4. Apaga clientes
  try { await mongoose.model('Client').deleteMany({ userId }); } catch(e) {}

  // 5. Apaga logs de acesso
  await AccessLog.deleteMany({ userId });

  // 6. Apaga o usuário por último
  await User.findByIdAndDelete(userId);
}

// POST /api/lgpd/executar-exclusoes — chamado pelo cron-job
router.post('/executar-exclusoes', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  try {
    const agora    = new Date();
    const usuarios = await User.find({
      deletionRequested:    true,
      deletionScheduledFor: { $lte: agora }
    });

    let excluidos = 0;
    const erros   = [];

    for (const user of usuarios) {
      try {
        await excluirUsuarioCompleto(user._id);
        excluidos++;
      } catch(e) {
        erros.push({ userId: user._id, erro: e.message });
      }
    }

    res.json({
      message:  `${excluidos} conta(s) excluída(s).`,
      erros:    erros.length ? erros : undefined
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.excluirUsuarioCompleto = excluirUsuarioCompleto;
