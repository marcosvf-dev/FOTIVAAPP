const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  id:          { type: String, required: true },
  filename:    { type: String, required: true },
  b2FileId:    { type: String, required: true },
  b2FileName:  { type: String, required: true },
  url:         { type: String },
  thumbnailUrl:{ type: String },
  size:        { type: Number },
  width:       { type: Number },
  height:      { type: Number },
  selected:    { type: Boolean, default: false },
}, { _id: false });

const gallerySchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  title:           { type: String, required: true },
  description:     { type: String, default: '' },
  clientName:      { type: String, required: true },
  clientEmail:     { type: String, default: '' },
  password:        { type: String, required: true, select: false },
  photos:          [photoSchema],
  status:          { type: String, enum: ['active','closed'], default: 'active' },
  faceEnabled:     { type: Boolean, default: false },
  downloadEnabled: { type: Boolean, default: false },
  watermarkEnabled:{ type: Boolean, default: false },
  watermarkText:   { type: String,  default: '' },
  selectedPhotos:  [{ type: String }],
  selectionSentAt: { type: Date },
  expiresAt:       { type: Date, default: null },
  createdAt:       { type: Date, default: Date.now },
  closedAt:        { type: Date },
});

gallerySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
gallerySchema.index({ userId: 1 });
gallerySchema.index({ eventId: 1 });

module.exports = mongoose.model('Gallery', gallerySchema);
