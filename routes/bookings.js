const express = require('express');
const router = express.Router();
const Booking = require('../model/booking');
const User = require('../model/user');
const auth = require('../middleware/authmiddleware');

/**
 * CUSTOMER → CREATE BOOKING
 */
router.post('/', auth, async (req, res) => {
  try {
    const { vendorId, serviceType, slotTime, location } = req.body;

    if (!vendorId) {
      return res.status(400).json({ message: 'Vendor ID required' });
    }

    // ✅ Get logged-in customer from DB
    const customer = await User.findById(req.user.userId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const booking = await Booking.create({
      vendorId,
      serviceType,
      slotTime,
      location,

      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.number
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error('BOOKING ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * VENDOR → GET OWN BOOKINGS
 */
router.get('/vendor/:vendorId', auth, async (req, res) => {
  try {
    if (req.user.userId !== req.params.vendorId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bookings = await Booking.find({
      vendorId: req.params.vendorId
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
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

    booking.status = 'confirmed';
    await booking.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
