const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../lib/prisma');
const { auth, requireAdmin } = require('../middleware/auth');

const sign = (user) => jwt.sign({ id: user.id, tokenVersion: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL) return res.status(401).json({ error: 'Credenciais inválidas' });
  const user = await prisma.user.findFirst({ where: { email, isAdmin: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Credenciais inválidas' });
  res.json({ token: sign(user), isAdmin: true });
});

router.post('/setup', async (req, res) => {
  const { secret, email, password, name } = req.body;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: 'Secret inválido' });
  const exists = await prisma.user.findFirst({ where: { isAdmin: true } });
  if (exists) return res.status(400).json({ error: 'Admin já existe' });
  const admin = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), isAdmin: true, subPlan: 'pro', subStatus: 'active' }
  });
  res.json({ message: 'Admin criado', id: admin.id });
});

router.get('/stats', auth, requireAdmin, async (req, res) => {
  const now      = new Date();
  const iniMes   = new Date(now.getFullYear(), now.getMonth(), 1);
  const [total, active, trial, expired, newMonth, normal, pro] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.user.count({ where: { isAdmin: false, subStatus: 'active' } }),
    prisma.user.count({ where: { isAdmin: false, subStatus: 'trial', subTrialEndsAt: { gt: now } } }),
    prisma.user.count({ where: { isAdmin: false, subStatus: { in: ['expired','cancelled'] } } }),
    prisma.user.count({ where: { isAdmin: false, createdAt: { gte: iniMes } } }),
    prisma.user.count({ where: { isAdmin: false, subPlan: 'normal', subStatus: 'active' } }),
    prisma.user.count({ where: { isAdmin: false, subPlan: 'pro',    subStatus: 'active' } }),
  ]);
  const mrr = (normal * 39.90) + (pro * 69.90);
  res.json({ total, active, trial, expired, newMonth, normal, pro, mrr: mrr.toFixed(2), arr: (mrr * 12).toFixed(2) });
});

router.get('/users', auth, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const where = { isAdmin: false };
  if (status && status !== 'all') where.subStatus = status;
  if (search) where.OR = [
    { name:       { contains: search, mode: 'insensitive' } },
    { email:      { contains: search, mode: 'insensitive' } },
    { studioName: { contains: search, mode: 'insensitive' } },
  ];
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, studioName: true, subPlan: true, subStatus: true, subTrialEndsAt: true, subExpiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    Number(limit),
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ users, total, pages: Math.ceil(total / limit) });
});

router.patch('/users/:id/plan', auth, requireAdmin, async (req, res) => {
  const { plan, status, days } = req.body;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (days || 31));
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data:  { subPlan: plan, subStatus: status || 'active', subExpiresAt: expiresAt },
    select: { id: true, subPlan: true, subStatus: true, subExpiresAt: true },
  });
  res.json({ message: 'Plano atualizado', ...user });
});

router.patch('/users/:id/block', auth, requireAdmin, async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { subStatus: 'cancelled', subPlan: 'free' } });
  res.json({ message: 'Usuário bloqueado' });
});

module.exports = router;
