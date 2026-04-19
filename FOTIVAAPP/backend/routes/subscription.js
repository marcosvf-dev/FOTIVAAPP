const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const Coupon = require('../models/Coupon');
const User   = require('../models/User');

const PLANS = {
  normal: { name: 'Fotiva Normal', price: 29.90, priceId: process.env.STRIPE_PRICE_NORMAL },
  pro:    { name: 'Fotiva PRO',    price: 39.90, priceId: process.env.STRIPE_PRICE_PRO },
};

// Lista os planos
router.get('/plans', (req, res) => {
  res.json([
    {
      id: 'normal', name: 'Normal', price: 29.90, period: 'mês',
      features: [
        'Dashboard completo', 'Agenda e calendário', 'Clientes ilimitados',
        'Controle financeiro', 'Assistente com IA', 'Notificações push',
      ],
    },
    {
      id: 'pro', name: 'PRO', price: 39.90, period: 'mês', popular: true,
      features: [
        'Tudo do plano Normal', 'Galeria de fotos', 'Link exclusivo por cliente',
        'Reconhecimento facial (em breve)', 'Suporte prioritário',
      ],
    },
  ]);
});

// Cria Checkout Session no Stripe
router.post('/create', auth, async (req, res) => {
  const { plan, couponCode } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plano inválido' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe não configurado. Adicione STRIPE_SECRET_KEY.' });

  const stripe      = require('stripe')(stripeKey);
  const planInfo    = PLANS[plan];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  let discountParams = {};
  let appliedCoupon  = null;

  // Valida e aplica cupom se fornecido
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
    const now = new Date();

    if (coupon && coupon.active &&
        (!coupon.validUntil || coupon.validUntil > now) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
        coupon.plans.includes(plan) &&
        !coupon.usedBy.includes(req.user._id)) {

      // Cria cupom no Stripe dinamicamente
      try {
        const stripeCoupon = await stripe.coupons.create({
          id: `FOTIVA_${coupon.code}_${Date.now()}`,
          name: coupon.description || coupon.code,
          ...(coupon.type === 'percent'
            ? { percent_off: coupon.value }
            : { amount_off: Math.round(coupon.value * 100), currency: 'brl' }),
          duration: 'once',
        });
        discountParams = { discounts: [{ coupon: stripeCoupon.id }] };
        appliedCoupon = coupon;
      } catch (e) {
        console.error('Stripe coupon error:', e.message);
      }
    }
  }

  try {
    // Busca ou cria customer no Stripe
    let customerId = req.user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name:  req.user.name,
        metadata: { userId: String(req.user._id) },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user._id, {
        'subscription.stripeCustomerId': customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: planInfo.priceId || undefined,
        // Se não tiver price_id configurado, cria inline
        ...(planInfo.priceId ? {} : {
          price_data: {
            currency: 'brl',
            product_data: { name: planInfo.name },
            unit_amount: Math.round(planInfo.price * 100),
            recurring: { interval: 'month' },
          },
        }),
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${frontendUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url:  `${frontendUrl}/assinatura`,
      metadata: {
        userId:     String(req.user._id),
        plan,
        couponCode: appliedCoupon?.code || '',
      },
      subscription_data: {
        metadata: {
          userId: String(req.user._id),
          plan,
        },
      },
      locale: 'pt-BR',
      ...discountParams,
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (e) {
    console.error('Stripe erro:', e.message);
    res.status(500).json({ error: 'Erro ao criar checkout: ' + e.message });
  }
});

// Status da assinatura atual
router.get('/status', auth, (req, res) => {
  const s   = req.user.subscription;
  const now = new Date();
  const isActive =
    s.status === 'active' ||
    (s.status === 'trial' && s.trialEndsAt > now);
  const trialDaysLeft = s.status === 'trial'
    ? Math.max(0, Math.ceil((s.trialEndsAt - now) / 86400000))
    : 0;

  res.json({
    plan: s.plan, status: s.status, isActive,
    trialDaysLeft, trialEndsAt: s.trialEndsAt,
    expiresAt: s.expiresAt, lastPayment: s.lastPayment,
  });
});

// Portal do cliente Stripe (gerenciar/cancelar assinatura)
router.post('/portal', auth, requireActive, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe não configurado' });

  const customerId = req.user.subscription?.stripeCustomerId;
  if (!customerId) return res.status(400).json({ error: 'Nenhuma assinatura Stripe encontrada' });

  const stripe      = require('stripe')(stripeKey);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${frontendUrl}/configuracoes`,
  });

  res.json({ portalUrl: session.url });
});

// Cancelar (via portal Stripe — mais recomendado)
router.post('/cancel', auth, requireActive, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    'subscription.status': 'cancelled',
  });
  res.json({ message: 'Assinatura cancelada. Acesso mantido até o fim do período.' });
});

module.exports = router;
