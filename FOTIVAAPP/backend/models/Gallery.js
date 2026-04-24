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
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  clientName:  { type: String, required: true },
  clientEmail: { type: String, required: true },
  password:    { type: String, required: true },
  photos:      [photoSchema],
  status:      { type: String, enum: ['active','closed'], default: 'active' },
  faceEnabled: { type: Boolean, default: false },
  selectedPhotos: [{ type: String }],
  selectionSentAt: { type: Date },
  expiresAt:   { type: Date },
  createdAt:   { type: Date, default: Date.now },
  closedAt:    { type: Date },
});

module.exports = mongoose.model('Gallery', gallerySchema);
