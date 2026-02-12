# Implementation Guide - Adding Push Notifications to Existing Features

This guide shows how to integrate push notifications into your existing booking system.

## 1. Notify Vendor of New Booking

**Location**: [routes/bookings.js](routes/bookings.js) - After creating a booking

```javascript
const express = require('express');
const router = express.Router();
const Booking = require('../model/booking');
const User = require('../model/user');
const auth = require('../middleware/authmiddleware');
const { notifyNewBooking } = require('../services/notification.examples');

/**
 * CUSTOMER → CREATE BOOKING
 */
router.post('/', auth, async (req, res) => {
  try {
    const { vendorId, serviceType, slotTime, location } = req.body;

    if (!vendorId) {
      return res.status(400).json({ message: 'Vendor ID required' });
    }

    // Get logged-in customer from DB
    const customer = await User.findById(req.user.userId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Create booking
    const booking = await Booking.create({
      vendorId,
      serviceType,
      slotTime,
      location,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.number
    });

    // 🔔 SEND NOTIFICATION TO VENDOR
    const vendor = await User.findById(vendorId);
    try {
      await notifyNewBooking(booking, vendor);
    } catch (error) {
      console.error('Notification failed:', error);
      // Continue - booking should succeed even if notification fails
    }

    res.status(201).json(booking);
  } catch (err) {
    console.error('BOOKING ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
```

## 2. Notify Customer When Vendor Confirms Booking

**Location**: [routes/vendor.js](routes/vendor.js) - In booking confirmation endpoint

```javascript
const express = require('express');
const router = express.Router();
const Booking = require('../model/booking');
const User = require('../model/user');
const auth = require('../middleware/authmiddleware');
const { notifyBookingConfirmed } = require('../services/notification.examples');

/**
 * VENDOR → CONFIRM BOOKING
 */
router.patch('/:bookingId/confirm', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify vendor owns this booking
    if (booking.vendorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update booking status
    booking.status = 'confirmed';
    await booking.save();

    // 🔔 NOTIFY CUSTOMER
    const vendor = await User.findById(req.user.userId);
    try {
      await notifyBookingConfirmed(booking, vendor);
    } catch (error) {
      console.error('Notification failed:', error);
    }

    res.json({ message: 'Booking confirmed', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

## 3. Scheduled Booking Reminders

**Location**: Create new file `jobs/reminders.js`

```javascript
// jobs/reminders.js
const Booking = require('../model/booking');
const { sendBookingReminder } = require('../services/notification.examples');

/**
 * Check for bookings within 1 hour and send reminders
 * Run this every 5 minutes with node-cron or Bull
 */
exports.sendUpcomingBookingReminders = async () => {
  try {
    // Find bookings happening in next 1.5 hours
    const oneHourFromNow = Date.now() + 1 * 60 * 60 * 1000;
    const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;

    const upcomingBookings = await Booking.find({
      slotTime: {
        $gte: oneHourFromNow,
        $lte: twoHoursFromNow
      },
      status: 'confirmed',
      reminderSent: { $ne: true }
    });

    console.log(`Found ${upcomingBookings.length} bookings for reminders`);

    for (const booking of upcomingBookings) {
      try {
        await sendBookingReminder(booking);
        
        // Mark reminder as sent
        await Booking.findByIdAndUpdate(
          booking._id,
          { reminderSent: true }
        );
      } catch (error) {
        console.error(`Reminder failed for booking ${booking._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Reminder job failed:', error);
  }
};
```

**Setup with node-cron** - Add to [app.js](app.js):

```javascript
const cron = require('node-cron');
const { sendUpcomingBookingReminders } = require('./jobs/reminders');

// Run reminder job every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running booking reminder job...');
  sendUpcomingBookingReminders();
});
```

**Or setup with Bull queue**:

```javascript
const Queue = require('bull');
const { sendUpcomingBookingReminders } = require('./jobs/reminders');

const reminderQueue = new Queue('booking-reminders', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Process jobs
reminderQueue.process(async () => {
  await sendUpcomingBookingReminders();
});

// Schedule to run every 5 minutes
setInterval(() => {
  reminderQueue.add({}, { repeat: { every: 5 * 60 * 1000 } });
}, 5 * 60 * 1000);
```

## 4. Customer Review Request After Booking Complete

**Location**: [routes/bookings.js](routes/bookings.js) - After marking complete

```javascript
const { requestReview } = require('../services/notification.examples');

/**
 * CUSTOMER → MARK BOOKING COMPLETE
 */
router.patch('/:bookingId/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    
    if (booking.customerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'completed';
    await booking.save();

    // 🔔 REQUEST REVIEW
    const vendor = await User.findById(booking.vendorId);
    try {
      await requestReview(booking, vendor.name);
    } catch (error) {
      console.error('Review request failed:', error);
    }

    res.json({ message: 'Booking completed', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## 5. Subscribe to Topics on Login

**Location**: [routes/auth.js](routes/auth.js) - After successful login

```javascript
const { subscribeCustomerToServiceTopics } = require('../services/notification.examples');

/**
 * LOGIN
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 🔔 SUBSCRIBE TO TOPICS (Optional)
    if (user.role === 'customer') {
      try {
        // Subscribe to preferred service types
        await subscribeCustomerToServiceTopics(user._id, [
          'plumbing',
          'electrical',
          'carpentry'
        ]);
      } catch (error) {
        console.error('Topic subscription failed:', error);
        // Non-critical - continue with login
      }
    }

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## 6. Broadcast Offers/Promotions

**Location**: Create new endpoint in [routes/admin.js](routes/admin.js) (or existing route)

```javascript
const { broadcastOffer } = require('../services/notification.examples');

/**
 * ADMIN → BROADCAST OFFER
 */
router.post('/offers/broadcast', auth, adminOnly, async (req, res) => {
  try {
    const { serviceType, description, discount, expiryDate } = req.body;

    if (!serviceType || !description || !discount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await broadcastOffer(serviceType, {
      offerId: `offer_${Date.now()}`,
      description,
      discount,
      expiryDate
    });

    res.json({ message: `Offer broadcast to ${serviceType} subscribers` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper middleware
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}
```

## 7. Testing Notifications

**Quick Test Script** - Create `scripts/test-notification.js`:

```javascript
const mongoose = require('mongoose');
const { sendToUser } = require('../services/fcm.service');
const FCMDeviceToken = require('../model/fcmDeviceToken');
const User = require('../model/user');

require('dotenv').config();

async function testNotification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Get first user with tokens
    const tokenDoc = await FCMDeviceToken.findOne();
    if (!tokenDoc) {
      console.log('No tokens registered. Register a token first.');
      process.exit(1);
    }

    const user = await User.findById(tokenDoc.userId);
    console.log(`Sending test notification to ${user.name}...`);

    // Send test notification
    const result = await sendToUser(user._id.toString(), {
      title: '🧪 Test Notification',
      body: 'This is a test from AppTsy backend',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    }, FCMDeviceToken);

    console.log('✅ Notification sent!', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testNotification();
```

**Run with**:
```bash
node scripts/test-notification.js
```

## 8. Database Schema Update (if needed)

Add `reminderSent` field to Booking model:

```javascript
// In model/booking.js - Add to schema
const bookingSchema = new mongoose.Schema({
  // ... existing fields
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });
```

## Deployment Checklist

- [ ] Firebase service account JSON loaded in production
- [ ] MongoDB with FCMDeviceToken collection created
- [ ] All route endpoints registered in [app.js](app.js)
- [ ] Booking creation sends notification
- [ ] Booking confirmation sends notification
- [ ] Scheduled reminder job running (cron or Bull)
- [ ] Test with real Firebase project (not emulator)
- [ ] Monitor logs for notification failures
- [ ] Document endpoints in Swagger/Postman
- [ ] Add environment variables to deployment config

## Monitoring & Debugging

**Check token registrations**:
```javascript
db.fcmdevicetokens.find({}).pretty()
```

**Check for failed notifications** in logs:
```bash
tail -f logs/app.log | grep "FCM\|notification\|token"
```

**Test single token send**:
```bash
curl -X POST http://localhost:3000/api/notify/send/single \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_id","title":"Test","body":"Test message"}'
```

---

For more details, see:
- [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md)
- [CLIENT_INTEGRATION.md](CLIENT_INTEGRATION.md)
- [NOTIFICATIONS_QUICKREF.md](NOTIFICATIONS_QUICKREF.md)
