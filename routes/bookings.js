// routes/bookings.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const twilioClient = require('../config/twilio');

// Booking Schema
const bookingSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  serviceType: String,
  slotTime: Date,
  vendorId: String,
  location:String,
  status: { type: String, default: 'pending' }
});

const Booking = mongoose.model('Booking', bookingSchema);

// POST /api/bookings - create a booking
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ message: 'Booking created', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/vendor/:vendorId - get bookings for vendor
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const bookings = await Booking.find({ vendorId: req.params.vendorId });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id/confirm - confirm booking

router.put('/:id/confirm', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed' },
      { new: true }
    );

    // 📞 CALL CUSTOMER
    await twilioClient.calls.create({
      to: booking.customerPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `
        <Response>
          <Say voice="alice">
            Hello ${booking.customerName}.
            Your service booking for ${booking.serviceType}
            has been confirmed. The vendor will contact you shortly.
          </Say>
        </Response>
      `
    });

    res.json({ message: 'Booking confirmed & call triggered', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
