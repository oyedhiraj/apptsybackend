const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  successCount: Number,
  failureCount: Number,
  failureTokens: [String],
  error: String
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  title: String,
  body: String,
  data: { type: Map, of: String },
  recipientType: { type: String, enum: ['user','users','topic'], required: true },
  recipientId: String,        // single userId or topic
  recipientIds: [String],     // multiple users
  relatedEntity: String,      // e.g. bookingId
  status: { type: String, enum: ['pending','sending','sent','partial','failed','cancelled'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  attemptLog: [attemptSchema],
  expireAt: { type: Date }
}, { timestamps: true });

notificationSchema.index({ recipientId: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
