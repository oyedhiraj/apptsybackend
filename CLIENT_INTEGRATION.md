# AppTsy Push Notification - Client Integration Guide

## Overview
This guide helps frontend developers (iOS/Android/Web) integrate with the AppTsy push notification service.

## Token Registration Flow

### Step 1: Get FCM Token from Firebase
```javascript
// React Native (Firebase Cloud Messaging)
import messaging from '@react-native-firebase/messaging';

const getFcmToken = async () => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
  }
};
```

### Step 2: Register Token with Backend
```javascript
const registerPushToken = async (userId, fcmToken) => {
  try {
    const response = await fetch('https://api.appTsy.com/api/notify/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        fcmToken
      })
    });
    
    const data = await response.json();
    console.log('Token registered:', data.message);
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Call on app startup
const userId = getUserIdFromLocalStorage();
const token = await getFcmToken();
await registerPushToken(userId, token);
```

### Step 3: Handle Incoming Notifications
```javascript
import { NotificationHandler } from '@react-native-firebase/messaging';

// Handle notification when app is in foreground
messaging().onMessage(async (remoteMessage) => {
  console.log('Notification received:', remoteMessage);
  
  const { title, body, data } = remoteMessage;
  
  // Show local notification
  showLocalNotification({
    title,
    body,
    payload: data
  });
});

// Handle notification when user taps it
messaging().onNotificationOpenedApp(remoteMessage => {
  if (remoteMessage) {
    const { data } = remoteMessage;
    
    // Navigate based on data.action
    switch(data?.action) {
      case 'view_booking':
        navigate('BookingDetails', { bookingId: data.bookingId });
        break;
      case 'view_bookings':
        navigate('MyBookings');
        break;
      case 'browse_vendor':
        navigate('VendorProfile', { vendorId: data.vendorId });
        break;
      default:
        navigate('Home');
    }
  }
});
```

## Topic Subscription (for Broadcast Notifications)

### Subscribe to Vendor Updates
```javascript
import messaging from '@react-native-firebase/messaging';

const subscribeToVendorUpdates = async (serviceType) => {
  try {
    const token = await messaging().getToken();
    
    await fetch('https://api.appTsy.com/api/notify/subscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        fcmToken: token,
        topic: `vendors-${serviceType.toLowerCase()}-online`
      })
    });
    
    console.log(`Subscribed to ${serviceType} vendor updates`);
  } catch (error) {
    console.error('Subscription failed:', error);
  }
};

// Call after vendor selection
subscribeToVendorUpdates('plumbing');
```

### Subscribe to Promotional Offers
```javascript
const subscribeToOffers = async (serviceTypes) => {
  const token = await messaging().getToken();
  
  for (const serviceType of serviceTypes) {
    await fetch('https://api.appTsy.com/api/notify/subscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        fcmToken: token,
        topic: `offers-${serviceType.toLowerCase()}`
      })
    });
  }
};

// Call during customer preferences setup
subscribeToOffers(['plumbing', 'electrical', 'carpentry']);
```

## Notification Payload Reference

### New Booking Notification
```json
{
  "notification": {
    "title": "📅 New Booking Request",
    "body": "John Doe requested plumbing service"
  },
  "data": {
    "bookingId": "63f7d8c4a1b2c3d4e5f6g7h8",
    "action": "view_booking",
    "type": "new_booking"
  }
}
```

### Booking Confirmed Notification
```json
{
  "notification": {
    "title": "✅ Booking Confirmed",
    "body": "Mike confirmed your plumbing booking"
  },
  "data": {
    "bookingId": "63f7d8c4a1b2c3d4e5f6g7h8",
    "vendorId": "64g8e9d5b2c3d4e5f6g7h8i9",
    "action": "view_booking",
    "type": "booking_confirmed"
  }
}
```

### Booking Reminder
```json
{
  "notification": {
    "title": "⏰ Booking Reminder",
    "body": "Your plumbing appointment is in 1 hour"
  },
  "data": {
    "bookingId": "63f7d8c4a1b2c3d4e5f6g7h8",
    "action": "view_booking",
    "type": "booking_reminder",
    "hoursUntil": "1"
  }
}
```

### Review Request
```json
{
  "notification": {
    "title": "⭐ Rate Your Experience",
    "body": "How was your service with Mike?"
  },
  "data": {
    "bookingId": "63f7d8c4a1b2c3d4e5f6g7h8",
    "vendorId": "64g8e9d5b2c3d4e5f6g7h8i9",
    "action": "rate_service",
    "type": "review_request"
  }
}
```

### Vendor Online Notification
```json
{
  "notification": {
    "title": "⭐ Mike is Online",
    "body": "Plumbing service now available"
  },
  "data": {
    "vendorId": "64g8e9d5b2c3d4e5f6g7h8i9",
    "serviceType": "plumbing",
    "action": "browse_vendor",
    "type": "vendor_online"
  }
}
```

### Promotional Offer
```json
{
  "notification": {
    "title": "🎉 Special Offer Available",
    "body": "50% off plumbing services this weekend"
  },
  "data": {
    "offerId": "offer_123",
    "discount": "50",
    "validUntil": "2026-02-14",
    "action": "view_offers",
    "type": "promotional_offer"
  }
}
```

## React Native Implementation (Full Example)

```javascript
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

export function setupPushNotifications(userId) {
  // Request notification permission
  messaging()
    .requestPermission()
    .then(authStatus => {
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Notification permission denied');
        return;
      }
      
      // Get token and register
      registerToken(userId);
    });

  // Handle foreground notifications
  const unsubscribeForeground = messaging().onMessage(
    async remoteMessage => {
      showLocalNotification(remoteMessage.notification);
    }
  );

  // Handle background tap
  const unsubscribeBackground = messaging().onNotificationOpenedApp(
    remoteMessage => {
      handleNotificationTap(remoteMessage);
    }
  );

  return () => {
    unsubscribeForeground();
    unsubscribeBackground();
  };
}

async function registerToken(userId) {
  try {
    const token = await messaging().getToken();
    
    await fetch('https://api.appTsy.com/api/notify/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fcmToken: token })
    });
  } catch (error) {
    console.error('Token registration failed:', error);
  }
}

function showLocalNotification(notification) {
  PushNotification.localNotification({
    title: notification.title,
    message: notification.body,
    channelId: 'default',
    priority: 'high'
  });
}

function handleNotificationTap(remoteMessage) {
  const navigation = useNavigation();
  const data = remoteMessage.notification.android?.data || 
               remoteMessage.notification.data;

  switch(data?.action) {
    case 'view_booking':
      navigation.navigate('BookingDetails', { 
        bookingId: data.bookingId 
      });
      break;
    case 'rate_service':
      navigation.navigate('ReviewBooking', { 
        bookingId: data.bookingId,
        vendorId: data.vendorId
      });
      break;
    default:
      navigation.navigate('Home');
  }
}
```

## Web Implementation (Firebase Cloud Messaging)

```javascript
// service-worker.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID',
  appId: 'YOUR_APP_ID',
  // ... other config
});

const messaging = firebase.messaging();

// Handle notification when app is closed
messaging.onBackgroundMessage(remoteMessage => {
  console.log('Background notification:', remoteMessage);
  
  self.registration.showNotification(
    remoteMessage.notification.title,
    {
      body: remoteMessage.notification.body,
      data: remoteMessage.data
    }
  );
});
```

```javascript
// Main app.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseApp = initializeApp({
  apiKey: 'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID',
  appId: 'YOUR_APP_ID'
});

const messaging = getMessaging(firebaseApp);

// Register token
getToken(messaging, { 
  vapidKey: 'YOUR_VAPID_KEY' 
})
.then(token => {
  fetch('/api/notify/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: getUserId(),
      fcmToken: token
    })
  });
})
.catch(err => console.error('Token error:', err));

// Handle foreground notifications
onMessage(messaging, remoteMessage => {
  console.log('Message received:', remoteMessage);
  showNotification(remoteMessage.notification);
});
```

## Troubleshooting

### Token Not Registering
- Check backend is reachable at `/api/notify/register-token`
- Ensure `userId` is correct and consistent
- Verify FCM token is valid (test with a known good token)

### Notifications Not Showing
- Request notification permission from user explicitly
- Check notification channel is configured (Android)
- Verify app has `INTERNET` permission (Android)
- Enable notifications in app settings

### Unsubscribe from Topic
```javascript
const unsubscribeFromOffers = async (serviceType) => {
  const token = await messaging().getToken();
  
  await fetch('https://api.appTsy.com/api/notify/unsubscribe-topic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fcmToken: token,
      topic: `offers-${serviceType.toLowerCase()}`
    })
  });
};
```

## Key Points

✅ **Do**:
- Register token on every app launch (Firebase may rotate tokens)
- Handle notification taps to navigate correctly
- Validate user permissions before showing notifications
- Test with real devices (emulators may have limited FCM support)

❌ **Don't**:
- Hardcode tokens (they expire/rotate)
- Ignore notification permission requests
- Store sensitive data in notification body
- Send notifications without user opt-in

