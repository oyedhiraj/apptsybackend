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

    // ✅ Validate all fields
    if (!vendorId || !serviceType || !slotTime || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // ✅ Get logged-in customer
    const customer = await User.findById(req.user.userId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // ✅ Check vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // ✅ Prevent double booking
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
      serviceType,
      slotTime,
      location,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.number,
      status: 'pending'
    });

    // 🔥 Send SMS to vendor (non-blocking)
    sendSMS(
      vendor.number,
      `📢 New Booking Request
Customer: ${customer.name}
Service: ${serviceType}
Time: ${new Date(slotTime).toLocaleString()}
Location: ${location}`
    ).catch(err => console.log(err));

    res.status(201).json(booking);

  } catch (err) {
    console.error('BOOKING ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


/**
 * VENDOR → GET OWN BOOKINGS
 * (Safer version without param misuse)
 */
router.get('/vendor/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({
      vendorId: req.user.userId
    }).sort({ createdAt: -1 });

    res.json(bookings);

  } catch (err) {
    console.error('FETCH ERROR:', err);
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

    // 🔥 Notify customer
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

module.exports = router;
