# Push Notification Service Setup Guide

## Quick Start

### 1. Firebase Setup
```bash
# Place your Firebase service account JSON file here:
config/apptsy-service-account-file.json

# The file structure should match:
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### 2. Database Model
The `FCMDeviceToken` model automatically stores tokens:
```javascript
{
  userId: String,        // Customer/Vendor ID
  fcmToken: String,      // Unique FCM device token
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Environment Variables
```env
# .env file
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```
(Auto-loaded from service account JSON via config/firebase.js)

## API Endpoints

### Register Device Token
**POST** `/api/notify/register-token`
- **Auth**: None (public endpoint)
- **Body**:
  ```json
  {
    "userId": "63f7d8c4a1b2c3d4e5f6g7h8",
    "fcmToken": "firebase_token_from_client"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Token registered successfully"
  }
  ```

### Send Single User Notification
**POST** `/api/notify/send/single`
- **Auth**: Required (JWT Bearer token)
- **Body**:
  ```json
  {
    "userId": "63f7d8c4a1b2c3d4e5f6g7h8",
    "title": "New Booking",
    "body": "You have a new service request",
    "data": {
      "bookingId": "12345",
      "action": "view_booking"
    }
  }
  ```
- **Response**:
  ```json
  {
    "message": "Notification sent",
    "successCount": 2,
    "failureCount": 0,
    "failureTokens": []
  }
  ```

### Send Multiple Users Notifications
**POST** `/api/notify/send/multiple`
- **Auth**: Required
- **Body**:
  ```json
  {
    "userIds": ["id1", "id2", "id3"],
    "title": "System Update",
    "body": "App maintenance scheduled",
    "data": {
      "action": "info",
      "type": "maintenance"
    }
  }
  ```

### Topic-Based Broadcast
**POST** `/api/notify/send/topic`
- **Auth**: Required
- **Body**:
  ```json
  {
    "topic": "new-bookings",
    "title": "New Opportunities",
    "body": "Check out these nearby requests",
    "data": {
      "action": "browse"
    }
  }
  ```

### Subscribe to Topic
**POST** `/api/notify/subscribe-topic`
- **Auth**: Required
- **Body**:
  ```json
  {
    "fcmToken": "firebase_token",
    "topic": "new-bookings"
  }
  ```

### Unsubscribe from Topic
**POST** `/api/notify/unsubscribe-topic`
- **Auth**: Required
- **Body**:
  ```json
  {
    "fcmToken": "firebase_token",
    "topic": "new-bookings"
  }
  ```

## Usage Examples

### Example 1: Notify Vendor of New Booking
```javascript
// In routes/bookings.js after creating booking
const { notifyNewBooking } = require('../services/notification.examples');

router.post('/', auth, async (req, res) => {
  // ... booking creation logic
  const booking = await Booking.create({...});
  
  // Send notification
  await notifyNewBooking(booking, vendor);
  
  res.status(201).json(booking);
});
```

### Example 2: Broadcast Offer to Service Type Subscribers
```javascript
// Endpoint to send promotional offers
const { broadcastOffer } = require('../services/notification.examples');

router.post('/api/admin/offers', auth, async (req, res) => {
  const { serviceType, description, discount, expiryDate } = req.body;
  
  await broadcastOffer(serviceType, {
    offerId: new Date().getTime(),
    description,
    discount,
    expiryDate
  });
  
  res.json({ message: 'Offer broadcast sent' });
});
```

### Example 3: Send Booking Reminder (Scheduled Job)
```javascript
// Using node-cron or Bull queue
const { sendBookingReminder } = require('../services/notification.examples');

// Every 5 minutes, check bookings within 1 hour
setInterval(async () => {
  const upcomingBookings = await Booking.find({
    slotTime: {
      $gte: Date.now(),
      $lte: Date.now() + 1.5 * 60 * 60 * 1000 // 1.5 hours
    },
    reminderSent: { $ne: true }
  });
  
  for (const booking of upcomingBookings) {
    await sendBookingReminder(booking);
    await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
  }
}, 5 * 60 * 1000);
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Client App (iOS/Android)        │
│      (Receives FCM notifications)       │
└──────────────┬──────────────────────────┘
               │
        POST /api/notify/register-token
        { userId, fcmToken }
               │
               ▼
┌─────────────────────────────────────────┐
│        FCMDeviceToken Collection        │
│     (MongoDB - Stores Device Tokens)    │
└──────────────┬──────────────────────────┘
               │
               │ (Lookup tokens)
               ▼
┌─────────────────────────────────────────┐
│    notification.controller.js           │
│     (HTTP Request Handlers)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       fcm.service.js                    │
│  (Core FCM Logic & Token Management)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Firebase Admin SDK                   │
│   (messaging.sendMulticast,             │
│    messaging.send, topic ops)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Google Firebase Services             │
│    (FCM Backend Infrastructure)         │
└─────────────────────────────────────────┘
```

## Best Practices

### 1. Handle Failed Tokens
The service automatically removes invalid tokens from the database. Always check the response:
```javascript
const result = await sendToUser(userId, message, FCMDeviceToken);
if (result.failureCount > 0) {
  console.log('Some devices failed:', result.failureTokens);
}
```

### 2. Data Payload Limits
- Max 4KB total message size
- All data values must be strings (service auto-converts)
- Use short keys: `"b"` instead of `"bookingId"`

### 3. Rate Limiting
Firebase allows 500 tokens per multicast. Service handles this automatically, but:
- Avoid sending >500 tokens at once in loops
- Batch large audiences by topic subscription

### 4. Never Throw on Notification Failure
Always wrap notification calls in try-catch to prevent disrupting business logic:
```javascript
try {
  await notifyNewBooking(booking);
} catch (error) {
  console.error('Notification failed:', error);
  // Continue - booking should succeed even if notification fails
}
```

### 5. Topic Naming Convention
Use semantic topic names:
- `vendors-{serviceType}-online` - Vendor status updates
- `offers-{serviceType}` - Promotional offers
- `bookings-{vendorId}` - Vendor-specific updates
- `app-update` - Global announcements

## Troubleshooting

### Tokens Not Registering
- Check client is sending `userId` and `fcmToken` to `/register-token`
- Ensure MongoDB connection is working
- Verify FCMDeviceToken schema in [model/fcmDeviceToken.js](../model/fcmDeviceToken.js)

### Notifications Not Received
- Confirm Firebase service account JSON is valid
- Check `fcmToken` values are correct from client
- Verify app has notification permissions on client device
- Check Firebase console for delivery status

### High Failure Rates
- Tokens expire after ~60 days of inactivity
- Request fresh tokens from client periodically
- Uninstall/reinstall client app generates new tokens

### Firebase Authentication Error
```
Error: Failed to initialize default credentials
```
- Verify `config/apptsy-service-account-file.json` exists
- Check file has correct Firebase project credentials
- Ensure file is not corrupted (validate JSON)

## Performance Considerations

- **Token Lookup**: Indexed by `userId` for fast retrieval
- **Batch Sending**: Use `sendMulticast` (handles 500 tokens per request)
- **Database Cleanup**: Failed tokens auto-deleted to prevent accumulation
- **Async Operations**: All API handlers are async, safe for concurrent requests

## Security

- **Registration**: Public endpoint (no auth required) - allows new devices to register
- **Sending**: Auth required - only authenticated admins/services can send
- **Topics**: Anyone can subscribe, but control who sends via auth middleware
- **Data Privacy**: Avoid sending sensitive data in notifications (use IDs + deeplinks)
