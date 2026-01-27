const express = require('express');
const router = express.Router();
const Booking = require('../model/booking');
const authMiddleware = require('../middleware/authmiddleware');

/**
 * VENDOR → VIEW OWN BOOKINGS
 */
router.get('/vendor/:vendorId', authMiddleware , async (req, res) => {
  try {
    // vendor can see only their bookings
    if (req.user.id !== req.params.vendorId) {
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


module.exports = router;
