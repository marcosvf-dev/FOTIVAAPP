const router = require('express').Router();
const User   = require('../models/User');
const Coupon = require('../models/Coupon');

// Stripe webhook — recebe raw body
router.post('/stripe', async (req, res) => {
  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) return res.sendStatus(200);

  const stripe = require('stripe')(stripeKey);
  let event;

  try {
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (e) {
    console.error('❌ Webhook Stripe inválido:', e.message);
    return res.status(400).json({ error: e.message });
  }

  console.log('📦 Stripe event:', event.type);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session    = event.data.object;
        const userId     = session.metadata?.userId;
        const plan       = session.metadata?.plan;
        const couponCode = session.metadata?.couponCode;

        if (!userId || !plan) break;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 31);

        await User.findByIdAndUpdate(userId, {
          'subscription.plan':              plan,
          'subscription.status':            'active',
          'subscription.expiresAt':         expiresAt,
          'subscription.lastPayment':        new Date(),
          'subscription.stripeCustomerId':  session.customer,
          'subscription.stripeSubId':       session.subscription,
        });

        // Marca cupom como usado
        if (couponCode) {
          await Coupon.findOneAndUpdate(
            { code: couponCode.toUpperCase() },
            { $inc: { usedCount: 1 }, $addToSet: { usedBy: userId } }
          );
        }

        console.log(`✅ Checkout concluído: user=${userId} plan=${plan}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice    = event.data.object;
        const customerId = invoice.customer;

        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) break;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 31);

        await User.findByIdAndUpdate(user._id, {
          'subscription.status':      'active',
          'subscription.expiresAt':   expiresAt,
          'subscription.lastPayment': new Date(),
        });

        console.log(`🔄 Renovação: customer=${customerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object;
        const customerId = invoice.customer;

        await User.findOneAndUpdate(
          { 'subscription.stripeCustomerId': customerId },
          { 'subscription.status': 'expired' }
        );

        console.log(`❌ Pagamento falhou: customer=${customerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object;
        const customerId = sub.customer;

        await User.findOneAndUpdate(
          { 'subscription.stripeCustomerId': customerId },
          { 'subscription.status': 'cancelled', 'subscription.plan': 'free' }
        );

        console.log(`🚫 Assinatura cancelada: customer=${customerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub  = event.data.object;
        const plan = sub.metadata?.plan;
        if (!plan) break;

        await User.findOneAndUpdate(
          { 'subscription.stripeCustomerId': sub.customer },
          { 'subscription.plan': plan }
        );
        break;
      }
    }
  } catch (e) {
    console.error('❌ Erro processando evento:', e.message);
  }

  res.sendStatus(200);
});

module.exports = router;
