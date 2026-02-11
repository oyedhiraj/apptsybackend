const mongoose = require("mongoose");

const fcmTokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    fcmToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FCMDeviceToken", fcmTokenSchema);
