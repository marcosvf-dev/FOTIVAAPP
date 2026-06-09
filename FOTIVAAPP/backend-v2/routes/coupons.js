const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireAdmin, requireActive } = require('../middleware/auth');

// Validar cupom (público para uso no checkout)
router.post('/validate', auth, async (req, res) => {
  const { code, plan } = req.body;
  if (!code) return res.status(400).json({ error: 'Código é obrigatório.' });

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (!coupon || !coupon.active) return res.status(404).json({ error: 'Cupom inválido.' });
  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return res.status(400).json({ error: 'Cupom expirado.' });
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Cupom esgotado.' });
  if (plan && !coupon.plans.includes(plan)) return res.status(400).json({ error: 'Cupom não válido para este plano.' });

  const jaUsou = await prisma.couponUse.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId: req.user.id } }
  });
  if (jaUsou) return res.status(400).json({ error: 'Você já utilizou este cupom.' });

  res.json({ valid: true, type: coupon.type, value: coupon.value, description: coupon.description });
});

// Rotas admin
router.get('/', auth, requireAdmin, async (req, res) => {
  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { uses: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(coupons);
});

router.post('/', auth, requireAdmin, async (req, res) => {
  const { code, description, type, value, maxUses, validUntil, plans, active } = req.body;
  if (!code || !value) return res.status(400).json({ error: 'Código e valor são obrigatórios.' });

  const coupon = await prisma.coupon.create({
    data: {
      code:        code.toUpperCase().trim(),
      description: description || '',
      type:        type || 'percent',
      value:       parseFloat(value),
      maxUses:     maxUses ? parseInt(maxUses) : null,
      validUntil:  validUntil ? new Date(validUntil) : null,
      plans:       plans || ['normal','pro'],
      active:      active !== false,
    }
  });
  res.status(201).json(coupon);
});

router.patch('/:id', auth, requireAdmin, async (req, res) => {
  const { description, active, maxUses, validUntil, plans, value } = req.body;
  const updated = await prisma.coupon.update({
    where: { id: req.params.id },
    data: {
      ...(description !== undefined && { description }),
      ...(active      !== undefined && { active: Boolean(active) }),
      ...(maxUses     !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
      ...(validUntil  !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      ...(plans       !== undefined && { plans }),
      ...(value       !== undefined && { value: parseFloat(value) }),
    }
  });
  res.json(updated);
});

module.exports = router;
