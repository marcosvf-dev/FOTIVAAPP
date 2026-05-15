const router = require('express').Router();
const User   = require('../models/User');
const Coupon = require('../models/Coupon');

router.post('/stripe', async (req, res) => {
  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) return res.sendStatus(200);

  const stripe = require('stripe')(stripeKey);
  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Idempotência — evita processar o mesmo evento duas vezes
  const mongoose = require('mongoose');
  let ProcessedEvent;
  try {
    ProcessedEvent = mongoose.model('ProcessedEvent');
  } catch {
    const schema = new mongoose.Schema({
      eventId:     { type: String, required: true, unique: true },
      processedAt: { type: Date, default: Date.now },
    });
    schema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
    ProcessedEvent = mongoose.model('ProcessedEvent', schema);
  }

  try {
    await ProcessedEvent.create({ eventId: event.id });
  } catch (e) {
    if (e.code === 11000) return res.sendStatus(200); // já processado
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, plan, couponCode } = session.metadata || {};
        if (!userId || !plan) break;
        const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 31);
        await User.findByIdAndUpdate(userId, {
          'subscription.plan': plan, 'subscription.status': 'active',
          'subscription.expiresAt': expiresAt, 'subscription.lastPayment': new Date(),
          'subscription.stripeCustomerId': session.customer, 'subscription.stripeSubId': session.subscription,
        });
        if (couponCode) await Coupon.findOneAndUpdate({ code: couponCode.toUpperCase() }, { $inc: { usedCount:1 }, $addToSet: { usedBy: userId } });
        break;
      }
      case 'invoice.payment_succeeded': {
        const user = await User.findOne({ 'subscription.stripeCustomerId': event.data.object.customer });
        if (!user) break;
        const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 31);
        await User.findByIdAndUpdate(user._id, { 'subscription.status': 'active', 'subscription.expiresAt': expiresAt, 'subscription.lastPayment': new Date() });
        break;
      }
      case 'invoice.payment_failed':
        await User.findOneAndUpdate({ 'subscription.stripeCustomerId': event.data.object.customer }, { 'subscription.status': 'expired' });
        break;
      case 'customer.subscription.deleted':
        await User.findOneAndUpdate({ 'subscription.stripeCustomerId': event.data.object.customer }, { 'subscription.status': 'cancelled', 'subscription.plan': 'free' });
        break;
      case 'customer.subscription.updated': {
        const plan = event.data.object.metadata?.plan;
        if (plan) await User.findOneAndUpdate({ 'subscription.stripeCustomerId': event.data.object.customer }, { 'subscription.plan': plan });
        break;
      }
    }
  } catch (e) {
    console.error('❌ Erro no webhook Stripe:', e.message);
  }

  res.sendStatus(200);
});

module.exports = router;
