const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  id:           { type: String, required: true },
  filename:     { type: String, default: '' },
  b2FileId:     { type: String, default: '' },
  b2FileName:   { type: String, default: '' },
  b2ThumbKey:   { type: String, default: '' },
  b2OriginalKey:{ type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  url:          { type: String, default: '' },
  selected:     { type: Boolean, default: false },
  size:         { type: Number, default: 0 },
  width:        { type: Number, default: 0 },
  height:       { type: Number, default: 0 },
  uploadedAt:   { type: Date, default: Date.now },
}, { _id: false });

const gallerySchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:            { type: String, required: true },
  description:      { type: String, default: '' },
  clientName:       { type: String, required: true },
  clientEmail:      { type: String, required: true },
  password:         { type: String, required: true },

  status:           { type: String, enum: ['active','closed'], default: 'active' },

  faceEnabled:      { type: Boolean, default: false },
  downloadEnabled:  { type: Boolean, default: false },
  downloadLimit:    { type: Number, default: null },
  extraPhotoPrice:  { type: Number, default: 0 },
  watermarkEnabled: { type: Boolean, default: false },
  watermarkText:    { type: String, default: '' },

  photos:           { type: [photoSchema], default: [] },

  selectionSentAt:  { type: Date, default: null },
  expiresAt:        { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);
