const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  studioName:   { type: String, default: '' },
  phone:        { type: String, default: '' },
  profileImage: { type: String, default: '' },
  isAdmin:      { type: Boolean, default: false },
  document:     { type: String, default: '' },
  subscription: {
    plan:             { type: String, enum: ['free','starter','normal','pro'], default: 'free' },
    status:           { type: String, enum: ['trial','active','expired','cancelled'], default: 'trial' },
    trialEndsAt:      { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) },
    expiresAt:        { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubId:      { type: String, default: null },
    lastPayment:      { type: Date, default: null },
  },
  pushSubscription: { type: Object, default: null },
  whatsappPhone:    { type: String, default: '' },
  whatsappApiKey:   { type: String, default: '' },
  studioLogo:       { type: String, default: '' },
  // LGPD
  consentAcceptedAt:    { type: Date,    default: null },
  deletionRequested:    { type: Boolean, default: false },
  deletionRequestedAt:  { type: Date,    default: null },
  deletionScheduledFor: { type: Date,    default: null },
  deletionMotivo:       { type: String,  default: null },
}, { timestamps: true });

userSchema.virtual('isActive').get(function() {
  const s = this.subscription;
  if (s.status === 'active') return true;
  if (s.status === 'trial' && s.trialEndsAt > new Date()) return true;
  return false;
});

module.exports = mongoose.model('User', userSchema);
