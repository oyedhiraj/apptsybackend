# Push Notifications - Quick Reference

## File Structure
```
services/
  ├── fcm.service.js                    # Core FCM logic
  └── notification.examples.js          # Real-world use cases
controllers/
  └── notification.controller.js        # Request handlers
routes/
  └── firebasenotification.js          # Route endpoints
model/
  └── fcmDeviceToken.js                # Token storage
config/
  └── firebase.js                      # Firebase admin init
```

## Core Functions

### FCM Service ([services/fcm.service.js](services/fcm.service.js))
```javascript
sendNotificationToTokens(tokens, {title, body, data})
sendToUser(userId, message, FCMDeviceToken)
sendToMultipleUsers(userIds, message, FCMDeviceToken)
sendToTopic(topic, message)
subscribeToTopic(tokens, topic)
unsubscribeFromTopic(tokens, topic)
```

### Ready-to-Use Examples ([services/notification.examples.js](services/notification.examples.js))
```javascript
notifyNewBooking(booking, vendor)
notifyBookingConfirmed(booking, vendor)
notifyBookingCancelled(booking, reason)
notifyVendorOnline(vendor)
broadcastOffer(serviceType, offerData)
sendBookingReminder(booking)
requestReview(booking, vendorName)
notifyVendorsAboutMaintenance(vendorIds, window)
broadcastAppUpdate(version, features)
subscribeVendorToServiceTopic(vendor)
subscribeCustomerToServiceTopics(customerId, serviceTypes)
```

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/notify/register-token` | None | Register device token |
| POST | `/api/notify/send/single` | ✓ | Send to one user (all devices) |
| POST | `/api/notify/send/multiple` | ✓ | Send to multiple users |
| POST | `/api/notify/send/topic` | ✓ | Broadcast to topic subscribers |
| POST | `/api/notify/subscribe-topic` | ✓ | Subscribe device to topic |
| POST | `/api/notify/unsubscribe-topic` | ✓ | Unsubscribe device from topic |

## Usage Pattern

### Send a Notification (Minimal)
```javascript
const { sendToUser } = require('../services/fcm.service');
const FCMDeviceToken = require('../model/fcmDeviceToken');

await sendToUser(userId, {
  title: 'New Message',
  body: 'You have a new booking request',
  data: { bookingId: '123' }
}, FCMDeviceToken);
```

### Broadcast to Topic
```javascript
const { sendToTopic } = require('../services/fcm.service');

await sendToTopic('new-bookings', {
  title: 'New Opportunities',
  body: 'Check out nearby service requests',
  data: { action: 'browse' }
});
```

### Error Handling (Always!)
```javascript
try {
  const result = await sendToUser(userId, message, FCMDeviceToken);
  console.log(`Sent: ${result.successCount}, Failed: ${result.failureCount}`);
} catch (error) {
  console.error('Notification failed:', error);
  // Continue - don't break business logic
}
```

## Request/Response Examples

### Register Token
```json
POST /api/notify/register-token
{
  "userId": "user_123",
  "fcmToken": "eJxXX_K_p0E:APA91bG..."
}

Response: { "message": "Token registered successfully" }
```

### Send to User
```json
POST /api/notify/send/single
Authorization: Bearer jwt_token
{
  "userId": "vendor_123",
  "title": "New Booking",
  "body": "Customer John requested plumbing",
  "data": {
    "bookingId": "booking_456",
    "action": "view_booking"
  }
}

Response: {
  "message": "Notification sent",
  "successCount": 2,
  "failureCount": 0,
  "failureTokens": []
}
```

## Integration Checklist

- [ ] Firebase service account JSON in `config/apptsy-service-account-file.json`
- [ ] MongoDB with `FCMDeviceToken` collection
- [ ] Routes registered in [app.js](app.js#L52) with `/api/notify` prefix
- [ ] Test token registration endpoint
- [ ] Test sending notification to yourself
- [ ] Implement in booking flow (see [routes/bookings.js](routes/bookings.js))
- [ ] Set up scheduled reminders (cron job or Bull queue)
- [ ] Document in API docs/Swagger

## Data Payload Rules

✅ **Valid**:
```javascript
data: {
  bookingId: "123",           // String IDs
  title: "New Booking",       // Short keys
  count: "5",                 // Numbers as strings
  timestamp: "1707687600000"  // ISO format
}
```

❌ **Invalid**:
```javascript
data: {
  details: { nested: true },  // ✗ No nested objects
  count: 5,                   // ✗ Must be string
  image: "<binary>"           // ✗ No binary data
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tokens not registering | Check MongoDB connection, verify endpoint reachable |
| Notifications not sent | Check Firebase credentials, verify tokens valid |
| High failure rate | Tokens expire after 60 days - request new ones from client |
| "Firebase not initialized" | Verify service account JSON exists and is valid |
| Weak auth failures | Check JWT token not expired, correct Bearer format |

## Performance Tips

- Use **topics** for broadcast to >100 users
- **Batch deletes** of failed tokens to reduce DB writes
- Subscribe users to topics on registration (not per-send)
- Wrap all notification calls in try-catch to prevent blocking
- Test with real Firebase project (emulator may have limits)

## Security Notes

- Token registration = **public** (new devices can self-register)
- Send/subscribe/topic management = **auth required** (admin/service only)
- **Never send sensitive data** in notification body (use IDs + deeplinks)
- Tokens should be **regularly refreshed** from client (~weekly)
- Failed tokens are **auto-cleaned** from database

## Next Steps

1. Read [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md) for detailed setup
2. Read [CLIENT_INTEGRATION.md](CLIENT_INTEGRATION.md) for frontend integration
3. Check [services/notification.examples.js](services/notification.examples.js) for real use cases
4. Integrate into booking workflow
5. Add scheduled reminder job
