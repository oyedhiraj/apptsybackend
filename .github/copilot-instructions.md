# AppTsy Backend - Copilot Instructions

## Architecture Overview

**AppTsy** is a service booking platform backend built with Express.js, MongoDB, Firebase, and Twilio. It connects customers with service vendors (a two-sided marketplace API).

### Core Components

- **Express App** ([app.js](app.js)): Routes, middleware, Swagger docs, static file serving
- **Database**: MongoDB via Mongoose ([db.js](db.js), [model/](model/))
- **Authentication**: JWT tokens with Bearer scheme ([middleware/authmiddleware.js](middleware/authmiddleware.js))
- **External Services**: Firebase (notifications) ([config/firebase.js](config/firebase.js)), Twilio (SMS) ([config/twilio.js](config/twilio.js))

## Data Model

**User** ([model/user.js](model/user.js)):
- Dual role: `customer` or `vendor`
- Vendors have `serviceType` field (plumbing, electrical, etc.)
- Status tracking: `available`/`busy` for vendors

**Booking** ([model/booking.js](model/booking.js)):
- Links `customerId` (requester) and `vendorId` (service provider)
- Denormalized fields: `customerName`, `customerPhone` stored in booking
- Status flow: `pending` → `confirmed` → `cancelled`

## Critical Patterns

### Authentication Flow
All protected routes use `auth` middleware:
```javascript
router.post('/', auth, async (req, res) => {
  const userId = req.user.userId;  // Set by middleware
  const userRole = req.user.role;
});
```
- JWT secret from `process.env.JWT_SECRET`
- Token expires in 1 hour (see [routes/auth.js](routes/auth.js#L77))
- Authorization header format: `Bearer <token>`

### Booking Authorization
Vendors access only their own bookings via userId validation:
```javascript
if (req.user.userId !== req.params.vendorId) {
  return res.status(403).json({ message: 'Unauthorized' });
}
```

### File Upload Pattern
Uses Multer with disk storage strategy ([routes/auth.js](routes/auth.js#L8-L18)):
- Profile photos → `uploads/profile/`
- Aadhaar documents → `uploads/aadhaar/`
- Filename format: `Date.now() + '-' + originalname`

## Development Workflow

**Setup**:
```bash
npm install
```

**Development** (with auto-reload):
```bash
npm run dev  # Uses nodemon
```

**Production**:
```bash
npm start    # Runs app.js
```

**Environment** (.env):
- `PORT` (default 3000)
- `MONGO_URI` (MongoDB connection string)
- `JWT_SECRET` (token signing secret)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (SMS credentials)
- `FIREBASE_*` (auto-loaded from service account JSON)

## Push Notifications Service

**Architecture**: Firebase Cloud Messaging (FCM) with device token management and multi-user broadcast support.

### Components
- **Service** ([services/fcm.service.js](services/fcm.service.js)): Core FCM logic with token cleanup
- **Controller** ([controllers/notification.controller.js](controllers/notification.controller.js)): HTTP handlers
- **Model** ([model/fcmDeviceToken.js](model/fcmDeviceToken.js)): Token storage (`userId`, `fcmToken`)
- **Routes** ([routes/firebasenotification.js](routes/firebasenotification.js)): All endpoints use `/api/notify` prefix

### Key Patterns

**1. Token Registration** (unauthenticated):
```javascript
POST /api/notify/register-token
{ "userId": "...", "fcmToken": "..." }
// Upserts token; allows device re-registration
```

**2. Send to Single User** (all their devices):
```javascript
POST /api/notify/send/single [auth]
{ "userId": "...", "title": "...", "body": "...", "data": {...} }
// Auto-removes failed tokens from DB
```

**3. Send to Multiple Users**:
```javascript
POST /api/notify/send/multiple [auth]
{ "userIds": ["...", "..."], "title": "...", "body": "..." }
```

**4. Topic-based Broadcast** (subscribe once, send to many):
```javascript
// Subscribe device to topic
POST /api/notify/subscribe-topic [auth]
{ "fcmToken": "...", "topic": "new-bookings" }

// Broadcast to all subscribers
POST /api/notify/send/topic [auth]
{ "topic": "new-bookings", "title": "...", "body": "..." }
```

### Service Exports
- `sendNotificationToTokens(tokens, {title, body, data})` - Low-level multicast (handles up to 500 tokens)
- `sendToUser(userId, message, FCMDeviceToken)` - User's all devices
- `sendToMultipleUsers(userIds, message, FCMDeviceToken)` - Multiple users
- `sendToTopic(topic, message)` - Topic broadcast
- `subscribeToTopic(tokens[], topic)` / `unsubscribeFromTopic(tokens[], topic)` - Topic management

### Critical Details
- **Data Payload**: All fields must be strings (service auto-converts with `String()`)
- **Failed Tokens**: Automatically deleted from DB after send attempt
- **Rate Limiting**: Firebase allows 500 tokens per multicast call; service handles this
- **No Auth for Registration**: Clients register tokens without JWT (public endpoint)

## Integration Points

### Firebase Admin
- Initialized in [config/firebase.js](config/firebase.js)
- Used in [routes/firebasenotification.js](routes/firebasenotification.js) for push notifications
- Requires valid `config/apptsy-service-account-file.json`

### Twilio Client
- Pre-configured singleton in [config/twilio.js](config/twilio.js)
- Import and call: `const client = require('../config/twilio'); client.messages.create(...)`

### Swagger Docs
- Defined in [swagger.js](swagger.js)
- Served at `/api-docs` with persistent auth token storage

## Project Conventions

1. **Error Handling**: Simple try-catch with status code + `{ error: message }` or `{ message: string }`
2. **Database Refs**: Use `mongoose.Schema.Types.ObjectId` with `ref: 'User'` pattern
3. **Middleware Order**: CORS → body parser → routes (see [app.js](app.js#L14-L22))
4. **No Tests**: Test script is placeholder (`npm test` exits with error)
5. **Case Sensitivity**: User emails not uniquely indexed (potential issue for future fixes)
6. **Bearer Token**: Always strip "Bearer " prefix in auth middleware

## Key Files Reference

| File | Purpose |
|------|---------|
| [routes/auth.js](routes/auth.js) | Register, login, JWT token generation |
| [routes/bookings.js](routes/bookings.js) | Core booking CRUD (customer creates, vendor retrieves) |
| [routes/vendor.js](routes/vendor.js) | Vendor profile/status management |
| [routes/member.js](routes/member.js) | Customer profile management |
| [routes/firebasenotification.js](routes/firebasenotification.js) | Push notification endpoints |
| [model/fcmDeviceToken.js](model/fcmDeviceToken.js) | Firebase token storage for push notifications |
| [services/fcm.service.js](services/fcm.service.js) | FCM business logic (sendToUser, topics, etc.) |
| [services/notification.examples.js](services/notification.examples.js) | Practical notification use cases |

## Documentation

- **[PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md)** - Complete push notification service guide with API endpoints, examples, and troubleshooting
- **[CLIENT_INTEGRATION.md](CLIENT_INTEGRATION.md)** - Frontend integration guide for iOS, Android, and Web clients
