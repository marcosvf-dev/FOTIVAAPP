const router = require('express').Router();
const prisma = require('../lib/prisma');
const { deleteGalleryFiles } = require('../lib/r2');
const { auth } = require('../middleware/auth');

router.get('/status', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { deletionRequested: true, deletionScheduledFor: true, consentAcceptedAt: true }
  });
  res.json({ exclusaoPendente: user?.deletionRequested || false, exclusaoAgendadaPara: user?.deletionScheduledFor || null, termoAceitoEm: user?.consentAcceptedAt || null });
});

router.get('/meus-dados', auth, async (req, res) => {
  const [user, clients, events, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true, studioName: true, phone: true, subPlan: true, createdAt: true } }),
    prisma.client.findMany({ where: { userId: req.user.id } }),
    prisma.event.findMany({ where: { userId: req.user.id } }),
    prisma.accessLog.findMany({ where: { userId: req.user.id }, take: 100, orderBy: { timestamp: 'desc' } }),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-fotiva.json"');
  res.json({ exportadoEm: new Date(), titular: user, clientes: clients, eventos: events, logsAcesso: logs });
});

router.post('/solicitar-exclusao', auth, async (req, res) => {
  const { motivo } = req.body;
  await prisma.user.update({
    where: { id: req.user.id },
    data:  { deletionRequested: true, deletionRequestedAt: new Date(), deletionMotivo: motivo || 'Não informado', deletionScheduledFor: new Date(Date.now() + 30*24*60*60*1000) }
  });
  res.json({ message: 'Solicitação registrada. Sua conta será excluída em 30 dias.' });
});

router.post('/cancelar-exclusao', auth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data:  { deletionRequested: false, deletionRequestedAt: null, deletionMotivo: null, deletionScheduledFor: null }
  });
  res.json({ message: 'Solicitação de exclusão cancelada.' });
});

async function excluirUsuarioCompleto(userId) {
  const galleries = await prisma.gallery.findMany({ where: { userId }, include: { photos: true } });
  for (const g of galleries) {
    try { await deleteGalleryFiles(`galleries/${g.id}/`); } catch {
      for (const p of g.photos) { try { await deleteGalleryFiles(p.originalKey); } catch {} }
    }
  }
  await prisma.user.delete({ where: { id: userId } }); // cascade deleta tudo
}

router.post('/executar-exclusoes', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  const usuarios = await prisma.user.findMany({ where: { deletionRequested: true, deletionScheduledFor: { lte: new Date() } } });
  let excluidos = 0; const erros = [];
  for (const u of usuarios) {
    try { await excluirUsuarioCompleto(u.id); excluidos++; }
    catch(e) { erros.push({ userId: u.id, erro: e.message }); }
  }
  res.json({ message: `${excluidos} conta(s) excluída(s).`, erros: erros.length ? erros : undefined });
});

module.exports = router;
module.exports.excluirUsuarioCompleto = excluirUsuarioCompleto;
