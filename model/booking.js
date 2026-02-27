const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    customerPhone: {
      type: String,
      required: true
    },

    serviceType: {
      type: String,
      required: true,
      trim: true
    },

    slotTime: {
      type: Date,
      required: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

bookingSchema.index({ vendorId: 1, slotTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
