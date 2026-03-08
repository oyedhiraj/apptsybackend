const express = require('express');
const router = express.Router();
const Booking = require('../model/booking');
const User = require('../model/user');
const auth = require('../middleware/authmiddleware');
const sendSMS = require('../config/twilio');

/**
 * CUSTOMER → CREATE BOOKING
 */
router.post('/', auth, async (req, res) => {
  try {
    const { vendorId, serviceType, slotTime, location } = req.body;

    if (!vendorId || !serviceType || !slotTime || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const customer = await User.findById(req.user.userId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const existingBooking = await Booking.findOne({
      vendorId,
      slotTime,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'Slot already booked' });
    }

    const booking = await Booking.create({
      vendorId,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.number,
      serviceType,
      slotTime: new Date(slotTime),
      location,
      status: 'pending'
    });

    try {
      if (
        vendor.number &&
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      ) {
        await sendSMS(
          vendor.number,
          `📢 New Booking Request
Customer: ${customer.name}
Service: ${serviceType}
Time: ${new Date(slotTime).toLocaleString()}
Location: ${location}`
        );
      }
    } catch (smsErr) {
      console.error('Twilio SMS error:', smsErr.message);
    }

    res.status(201).json(booking);

  } catch (err) {
    console.error('BOOKING ERROR:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});


/**
 * VENDOR → GET OWN BOOKINGS
 */
router.get('/vendor/:vendorId', auth, async (req, res) => {
  try {

    const bookings = await Booking.find({
      vendorId: req.params.vendorId
    }).sort({ createdAt: -1 });

    res.json(bookings);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


/**
 * VENDOR → CONFIRM BOOKING
 */
router.put('/:id/confirm', auth, async (req, res) => {
  try {

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.vendorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status === 'confirmed') {
      return res.status(400).json({ message: 'Already confirmed' });
    }

    booking.status = 'confirmed';
    await booking.save();

    sendSMS(
      booking.customerPhone,
      `✅ Booking Confirmed
Service: ${booking.serviceType}
Time: ${booking.slotTime.toLocaleString()}
Location: ${booking.location}`
    ).catch(err => console.log(err));

    res.json({ success: true });

  } catch (err) {
    console.error('CONFIRM ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


/**
 * ❌ VENDOR → CANCEL BOOKING
 */
router.put('/:id/cancel', auth, async (req, res) => {
  try {

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.vendorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Already cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    sendSMS(
      booking.customerPhone,
      `❌ Booking Cancelled
Service: ${booking.serviceType}
Time: ${booking.slotTime.toLocaleString()}
Location: ${booking.location}`
    ).catch(err => console.log(err));

    res.json({ success: true });

  } catch (err) {
    console.error('CANCEL ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;