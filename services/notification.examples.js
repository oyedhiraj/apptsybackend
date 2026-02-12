/**
 * AppTsy Push Notification Service - Practical Examples & Utilities
 * 
 * This file demonstrates real-world usage patterns for the FCM notification system.
 * Copy and adapt these patterns for your specific use cases.
 */

const FCMDeviceToken = require('../model/fcmDeviceToken');
const { 
  sendToUser, 
  sendToMultipleUsers, 
  sendToTopic 
} = require('./fcm.service');

// ============================================================
// BOOKING NOTIFICATIONS
// ============================================================

/**
 * Notify vendor when customer creates a booking
 * Call this after booking is created in routes/bookings.js
 */
exports.notifyNewBooking = async (booking, vendorUser) => {
  try {
    await sendToUser(
      booking.vendorId.toString(),
      {
        title: '📅 New Booking Request',
        body: `${booking.customerName} requested ${booking.serviceType}`,
        data: {
          bookingId: booking._id.toString(),
          action: 'view_booking',
          type: 'new_booking'
        }
      },
      FCMDeviceToken
    );
    console.log('New booking notification sent');
  } catch (error) {
    console.error('Failed to notify vendor:', error.message);
    // Don't throw - booking creation should succeed even if notification fails
  }
};

/**
 * Notify customer when vendor confirms booking
 */
exports.notifyBookingConfirmed = async (booking, vendorUser) => {
  try {
    await sendToUser(
      booking.customerId.toString(),
      {
        title: '✅ Booking Confirmed',
        body: `${vendorUser.name} confirmed your booking for ${booking.serviceType}`,
        data: {
          bookingId: booking._id.toString(),
          vendorId: booking.vendorId.toString(),
          action: 'view_booking',
          type: 'booking_confirmed'
        }
      },
      FCMDeviceToken
    );
    console.log('Booking confirmed notification sent to customer');
  } catch (error) {
    console.error('Failed to notify customer:', error.message);
  }
};

/**
 * Notify customer when booking is cancelled
 */
exports.notifyBookingCancelled = async (booking, reason = '') => {
  try {
    await sendToUser(
      booking.customerId.toString(),
      {
        title: '❌ Booking Cancelled',
        body: reason || `Your booking for ${booking.serviceType} has been cancelled`,
        data: {
          bookingId: booking._id.toString(),
          action: 'view_bookings',
          type: 'booking_cancelled'
        }
      },
      FCMDeviceToken
    );
  } catch (error) {
    console.error('Failed to notify cancellation:', error.message);
  }
};

// ============================================================
// VENDOR STATUS NOTIFICATIONS
// ============================================================

/**
 * Notify users in a city/area when vendor comes online
 * Use topic: 'vendors-{serviceType}-{city}' for geographic targeting
 */
exports.notifyVendorOnline = async (vendor) => {
  try {
    const topic = `vendors-${vendor.serviceType}-online`;
    
    await sendToTopic(topic, {
      title: `⭐ ${vendor.name} is Online`,
      body: `${vendor.serviceType} service now available`,
      data: {
        vendorId: vendor._id.toString(),
        serviceType: vendor.serviceType,
        action: 'browse_vendor',
        type: 'vendor_online'
      }
    });
    console.log('Vendor online notification broadcast');
  } catch (error) {
    console.error('Failed to broadcast vendor online:', error.message);
  }
};

// ============================================================
// PROMOTIONAL/MARKETING NOTIFICATIONS
// ============================================================

/**
 * Send promotional offer to users of a specific service type
 * Requires customers to be subscribed to topic: 'offers-{serviceType}'
 */
exports.broadcastOffer = async (serviceType, offerData) => {
  try {
    const topic = `offers-${serviceType.toLowerCase()}`;
    
    await sendToTopic(topic, {
      title: '🎉 Special Offer Available',
      body: offerData.description,
      data: {
        offerId: offerData.offerId,
        discount: String(offerData.discount),
        validUntil: offerData.expiryDate,
        action: 'view_offers',
        type: 'promotional_offer'
      }
    });
    console.log(`Offer broadcast to ${serviceType} subscribers`);
  } catch (error) {
    console.error('Failed to broadcast offer:', error.message);
  }
};

// ============================================================
// CUSTOMER ENGAGEMENT
// ============================================================

/**
 * Send reminder to customer about upcoming booking
 * Call this with a scheduled job (e.g., cron) 1 hour before slot
 */
exports.sendBookingReminder = async (booking) => {
  try {
    const timeUntil = new Date(booking.slotTime);
    const hours = Math.round((timeUntil - Date.now()) / (1000 * 60 * 60));
    
    await sendToUser(
      booking.customerId.toString(),
      {
        title: '⏰ Booking Reminder',
        body: `Your ${booking.serviceType} appointment is in ${hours} hour(s)`,
        data: {
          bookingId: booking._id.toString(),
          action: 'view_booking',
          type: 'booking_reminder',
          hoursUntil: String(hours)
        }
      },
      FCMDeviceToken
    );
  } catch (error) {
    console.error('Failed to send booking reminder:', error.message);
  }
};

/**
 * Request rating/review after service is completed
 */
exports.requestReview = async (booking, vendorName) => {
  try {
    await sendToUser(
      booking.customerId.toString(),
      {
        title: '⭐ Rate Your Experience',
        body: `How was your service with ${vendorName}?`,
        data: {
          bookingId: booking._id.toString(),
          vendorId: booking.vendorId.toString(),
          action: 'rate_service',
          type: 'review_request'
        }
      },
      FCMDeviceToken
    );
  } catch (error) {
    console.error('Failed to request review:', error.message);
  }
};

// ============================================================
// SYSTEM NOTIFICATIONS
// ============================================================

/**
 * Notify specific vendors about system maintenance
 */
exports.notifyVendorsAboutMaintenance = async (vendorIds, maintenanceWindow) => {
  try {
    const result = await sendToMultipleUsers(
      vendorIds.map(id => id.toString()),
      {
        title: '🔧 Scheduled Maintenance',
        body: `App maintenance on ${maintenanceWindow}. You may not receive bookings.`,
        data: {
          action: 'info',
          type: 'system_maintenance',
          duration: maintenanceWindow
        }
      },
      FCMDeviceToken
    );
    console.log(`Maintenance notification sent: ${result.successCount} succeeded, ${result.failureCount} failed`);
  } catch (error) {
    console.error('Failed to notify vendors:', error.message);
  }
};

/**
 * Broadcast app update notification to all users
 */
exports.broadcastAppUpdate = async (version, features) => {
  try {
    // Use topic subscription for all-users broadcast
    await sendToTopic('app-update', {
      title: `✨ AppTsy v${version} Available`,
      body: `Update now to enjoy new features`,
      data: {
        version,
        features: JSON.stringify(features),
        action: 'open_store',
        type: 'app_update'
      }
    });
  } catch (error) {
    console.error('Failed to broadcast app update:', error.message);
  }
};

// ============================================================
// HELPER: INITIALIZE TOPIC SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe new vendor to their service type updates
 * Call this in vendor registration/profile setup
 */
exports.subscribeVendorToServiceTopic = async (vendor) => {
  try {
    const { subscribeToTopic } = require('./fcm.service');
    
    // Get vendor's device tokens
    const tokenDocs = await FCMDeviceToken.find({ userId: vendor._id.toString() });
    const tokens = tokenDocs.map(doc => doc.fcmToken);
    
    if (tokens.length === 0) return; // No tokens yet
    
    // Subscribe to their service type topic
    const topic = `vendors-${vendor.serviceType.toLowerCase()}-updates`;
    await subscribeToTopic(tokens, topic);
    
    console.log(`Vendor ${vendor.name} subscribed to ${topic}`);
  } catch (error) {
    console.error('Failed to subscribe vendor to topic:', error.message);
  }
};

/**
 * Subscribe customer to their preferred service types
 * Call this during customer setup/preferences update
 */
exports.subscribeCustomerToServiceTopics = async (customerId, serviceTypes) => {
  try {
    const { subscribeToTopic } = require('./fcm.service');
    
    const tokenDocs = await FCMDeviceToken.find({ userId: customerId.toString() });
    const tokens = tokenDocs.map(doc => doc.fcmToken);
    
    if (tokens.length === 0) return;
    
    // Subscribe to each service type topic
    for (const serviceType of serviceTypes) {
      const topic = `offers-${serviceType.toLowerCase()}`;
      await subscribeToTopic(tokens, topic);
    }
    
    console.log(`Customer subscribed to ${serviceTypes.length} service topics`);
  } catch (error) {
    console.error('Failed to subscribe customer:', error.message);
  }
};
