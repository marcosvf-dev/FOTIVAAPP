const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.use(auth);

// GET /api/subscription/status
router.get('/status', async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { subPlan: true, subStatus: true, subTrialEndsAt: true, subExpiresAt: true, stripeCustomerId: true, stripeSubId: true }
  });
  res.json(user);
});

// POST /api/subscription/checkout
router.post('/checkout', async (req, res) => {
  const { plan, couponCode } = req.body;
  if (!['normal','pro'].includes(plan)) return res.status(400).json({ error: 'Plano inválido.' });

  const priceId = plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_NORMAL;
  let customerId = req.user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: req.user.email, name: req.user.name });
    customerId = customer.id;
    await prisma.user.update({ where: { id: req.user.id }, data: { stripeCustomerId: customerId } });
  }

  // Valida e aplica cupom se informado
  let discounts = [];
  if (couponCode) {
    try {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase().trim() } });
      if (coupon && coupon.active && coupon.plans.includes(plan)) {
        const stripeCoupon = await stripe.coupons.create({
          [coupon.type === 'percent' ? 'percent_off' : 'amount_off']: coupon.type === 'percent' ? coupon.value : Math.round(coupon.value * 100),
          currency:  coupon.type === 'fixed' ? 'brl' : undefined,
          duration:  'once',
        });
        discounts = [{ coupon: stripeCoupon.id }];
        await prisma.$transaction([
          prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } }),
          prisma.couponUse.create({ data: { couponId: coupon.id, userId: req.user.id } }),
        ]);
      }
    } catch(e) { console.error('Erro ao aplicar cupom:', e.message); }
  }

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    discounts:  discounts.length ? discounts : undefined,
    success_url: `${process.env.FRONTEND_URL}/assinatura?success=true`,
    cancel_url:  `${process.env.FRONTEND_URL}/assinatura?cancelled=true`,
    metadata:   { userId: req.user.id, plan },
  });

  res.json({ url: session.url });
});

// POST /api/subscription/portal
router.post('/portal', async (req, res) => {
  if (!req.user.stripeCustomerId) return res.status(400).json({ error: 'Nenhuma assinatura ativa.' });
  const session = await stripe.billingPortal.sessions.create({
    customer:   req.user.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/assinatura`,
  });
  res.json({ url: session.url });
});

module.exports = router;
