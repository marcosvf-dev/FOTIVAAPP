const router = require('express').Router();
const Coupon = require('../models/Coupon');
const { auth, requireAdmin } = require('../middleware/auth');

const PLAN_PRICES = { normal: 29.90, pro: 39.90 };

// ── PÚBLICO: validar cupom antes de pagar ──
router.post('/validate', auth, async (req, res) => {
  const { code, plan } = req.body;
  if (!code) return res.status(400).json({ error: 'Código obrigatório' });

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

  if (!coupon || !coupon.active)
    return res.status(404).json({ error: 'Cupom inválido ou inativo' });

  if (coupon.validUntil && coupon.validUntil < new Date())
    return res.status(400).json({ error: 'Cupom expirado' });

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    return res.status(400).json({ error: 'Cupom atingiu o limite de usos' });

  if (!coupon.plans.includes(plan))
    return res.status(400).json({ error: `Cupom não válido para o plano ${plan}` });

  // Verifica se usuário já usou esse cupom
  if (coupon.usedBy.includes(req.user._id))
    return res.status(400).json({ error: 'Você já usou este cupom' });

  const originalPrice = PLAN_PRICES[plan] || 0;
  let discountAmount = 0;
  if (coupon.type === 'percent') {
    discountAmount = (originalPrice * coupon.value) / 100;
  } else {
    discountAmount = Math.min(coupon.value, originalPrice);
  }
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  res.json({
    valid: true,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    originalPrice,
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    finalPrice: parseFloat(finalPrice.toFixed(2)),
    label: coupon.type === 'percent'
      ? `${coupon.value}% de desconto`
      : `R$${coupon.value.toFixed(2)} de desconto`,
  });
});

// ── ADMIN: listar cupons ──
router.get('/', auth, requireAdmin, async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
});

// ── ADMIN: criar cupom ──
router.post('/', auth, requireAdmin, async (req, res) => {
  const { code, description, type, value, maxUses, validUntil, plans } = req.body;
  if (!code || !value) return res.status(400).json({ error: 'code e value são obrigatórios' });

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    description,
    type: type || 'percent',
    value: parseFloat(value),
    maxUses: maxUses || null,
    validUntil: validUntil || null,
    plans: plans || ['normal','pro'],
  });
  res.status(201).json(coupon);
});

// ── ADMIN: editar cupom ──
router.put('/:id', auth, requireAdmin, async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) return res.status(404).json({ error: 'Cupom não encontrado' });
  res.json(coupon);
});

// ── ADMIN: ativar/desativar ──
router.patch('/:id/toggle', auth, requireAdmin, async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Cupom não encontrado' });
  coupon.active = !coupon.active;
  await coupon.save();
  res.json({ active: coupon.active, message: coupon.active ? 'Cupom ativado' : 'Cupom desativado' });
});

// ── ADMIN: deletar cupom ──
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ message: 'Cupom removido' });
});

module.exports = router;
