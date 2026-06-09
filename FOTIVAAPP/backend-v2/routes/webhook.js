const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).json({ error: `Webhook inválido: ${e.message}` });
  }

  const planFromPriceId = (priceId) => {
    if (priceId === process.env.STRIPE_PRICE_PRO)    return 'pro';
    if (priceId === process.env.STRIPE_PRICE_NORMAL) return 'normal';
    return 'normal';
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId  = session.metadata?.userId;
      if (!userId) break;
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const plan = planFromPriceId(sub.items.data[0]?.price?.id);
      await prisma.user.update({
        where: { id: userId },
        data: {
          subStatus:  'active',
          subPlan:    plan,
          stripeSubId: sub.id,
          subExpiresAt: new Date(sub.current_period_end * 1000),
          subLastPayment: new Date(),
        }
      });
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const customer = await prisma.user.findFirst({ where: { stripeCustomerId: invoice.customer } });
      if (!customer) break;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const plan = planFromPriceId(sub.items.data[0]?.price?.id);
      await prisma.user.update({
        where: { id: customer.id },
        data: { subStatus: 'active', subPlan: plan, subExpiresAt: new Date(sub.current_period_end * 1000), subLastPayment: new Date() }
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await prisma.user.updateMany({
        where: { stripeSubId: sub.id },
        data:  { subStatus: 'cancelled', subPlan: 'free', stripeSubId: null }
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await prisma.user.updateMany({
        where: { stripeCustomerId: invoice.customer },
        data:  { subStatus: 'expired' }
      });
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
