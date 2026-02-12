const firebaseAdmin = require('../config/firebase');
const Notification = require('../model/notification');

/**
 * Validate Firebase is initialized
 */
const validateFirebase = () => {
  if (!firebaseAdmin || !firebaseAdmin.apps || firebaseAdmin.apps.length === 0) {
    throw new Error('Firebase Admin SDK not initialized. Check config/service-account-file.json exists and is valid.');
  }
};

/**
 * Get Firebase Messaging instance
 */
const getMessaging = () => {
  try {
    return firebaseAdmin.messaging();
  } catch (error) {
    throw new Error(`Firebase messaging not available: ${error.message}`);
  }
};

/**
 * Send notification to single or multiple FCM tokens
 * @param {string|string[]} tokens - Single token or array of tokens
 * @param {object} message - Notification message object
 * @param {string} message.title - Notification title
 * @param {string} message.body - Notification body
 * @param {object} message.data - Optional data payload (must be strings)
 * @returns {Promise<object>} Firebase response with success/failure counts
 */
exports.sendNotificationToTokens = async (tokens, message) => {
  try {
    validateFirebase();
    const messaging = getMessaging();
    
    // Normalize to array
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    if (!tokenArray.length) {
      return { successCount: 0, failureCount: 0, failureTokens: [] };
    }

    // Clean data payload - all values must be strings for FCM
    const dataPayload = {};
    if (message.data) {
      Object.keys(message.data).forEach(key => {
        dataPayload[key] = String(message.data[key]);
      });
    }

    const payload = {
      notification: {
        title: message.title,
        body: message.body
      },
      ...(Object.keys(dataPayload).length > 0 && { data: dataPayload })
    };

    // Send multicast message using sendEachForMulticast (handles up to 500 tokens per call)
    const response = await messaging.sendEachForMulticast({
      tokens: tokenArray,
      ...payload
    });

    console.log("response", response);

    // Extract failed tokens from response
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      console.log("resp", resp.error);
      if (!resp.success) {
        failedTokens.push(tokenArray[idx]);
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failureTokens: failedTokens
    };
  } catch (error) {
    console.error('FCM Send Error:', error);
    throw new Error(`Failed to send notifications: ${error.message}`);
  }
};

/**
 * Send notification to a single user (all registered devices)
 * @param {string} userId - User ID to send notification to
 * @param {object} message - Message object (title, body, data)
 * @param {object} db - Database/model reference (FCMDeviceToken model)
 * @returns {Promise<object>} Send result
 */
exports.sendToUser = async (userId, message, FCMDeviceToken, options = {}) => {
  // options: { relatedEntity, expireInHours, maxRetries }
  const maxRetries = options.maxRetries || parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10);
  try {
    // Create notification record (audit trail)
    const notif = await Notification.create({
      title: message.title,
      body: message.body,
      data: message.data || {},
      recipientType: 'user',
      recipientId: String(userId),
      recipientIds: [String(userId)],
      relatedEntity: options.relatedEntity || undefined,
      status: 'pending',
      attempts: 0,
      expireAt: options.expireInHours ? new Date(Date.now() + options.expireInHours * 3600 * 1000) : undefined
    });

    // Fetch tokens
    const tokenDocs = await FCMDeviceToken.find({ userId }).select('fcmToken');
    const tokens = tokenDocs.map(doc => doc.fcmToken);

    if (!tokens.length) {
      await Notification.findByIdAndUpdate(notif._id, { status: 'failed', $inc: { attempts: 1 }, $push: { attemptLog: { ts: new Date(), successCount: 0, failureCount: 0, failureTokens: [], error: 'No registered tokens' } } });
      return { successCount: 0, failureCount: 0, message: 'No registered tokens for user' };
    }

    // Mark sending
    await Notification.findByIdAndUpdate(notif._id, { status: 'sending', $inc: { attempts: 1 } });

    // Perform send
    const result = await exports.sendNotificationToTokens(tokens, message);

    // Log attempt
    const attemptEntry = {
      ts: new Date(),
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      failureTokens: result.failureTokens || [],
      error: result.error ? String(result.error) : undefined
    };

    // Remove failed tokens from DB
    if (attemptEntry.failureTokens.length > 0) {
      await FCMDeviceToken.deleteMany({ fcmToken: { $in: attemptEntry.failureTokens } });
    }

    // Update notification status
    let newStatus = 'failed';
    if (attemptEntry.successCount > 0 && attemptEntry.failureCount === 0) newStatus = 'sent';
    else if (attemptEntry.successCount > 0 && attemptEntry.failureCount > 0) newStatus = 'partial';
    else newStatus = 'failed';

    await Notification.findByIdAndUpdate(notif._id, { $push: { attemptLog: attemptEntry }, status: newStatus });

    // If failed and we haven't exhausted retries, leave as pending for requeueing
    if (newStatus === 'failed' && notif.attempts < maxRetries) {
      // keep status as 'failed' for now; external retry job can requeue based on attempts
    }

    return result;
  } catch (error) {
    console.error('Send to User Error:', error);
    throw error;
  }
};

/**
 * Send notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} message - Message object
 * @param {object} db - FCMDeviceToken model
 * @returns {Promise<object>} Aggregated result
 */
exports.sendToMultipleUsers = async (userIds, message, FCMDeviceToken, options = {}) => {
  // options: { relatedEntity, expireInHours, maxRetries }
  try {
    const notif = await Notification.create({
      title: message.title,
      body: message.body,
      data: message.data || {},
      recipientType: 'users',
      recipientIds: userIds.map(String),
      relatedEntity: options.relatedEntity || undefined,
      status: 'pending',
      attempts: 0,
      expireAt: options.expireInHours ? new Date(Date.now() + options.expireInHours * 3600 * 1000) : undefined
    });

    const tokenDocs = await FCMDeviceToken.find({ userId: { $in: userIds } }).select('fcmToken');
    const tokens = tokenDocs.map(doc => doc.fcmToken);

    if (!tokens.length) {
      await Notification.findByIdAndUpdate(notif._id, { status: 'failed', $inc: { attempts: 1 }, $push: { attemptLog: { ts: new Date(), successCount: 0, failureCount: 0, failureTokens: [], error: 'No registered tokens' } } });
      return { successCount: 0, failureCount: 0, message: 'No registered tokens found' };
    }

    await Notification.findByIdAndUpdate(notif._id, { status: 'sending', $inc: { attempts: 1 } });

    const result = await exports.sendNotificationToTokens(tokens, message);

    const attemptEntry = {
      ts: new Date(),
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      failureTokens: result.failureTokens || [],
      error: result.error ? String(result.error) : undefined
    };

    if (attemptEntry.failureTokens.length > 0) {
      await FCMDeviceToken.deleteMany({ fcmToken: { $in: attemptEntry.failureTokens } });
    }

    let newStatus = 'failed';
    if (attemptEntry.successCount > 0 && attemptEntry.failureCount === 0) newStatus = 'sent';
    else if (attemptEntry.successCount > 0 && attemptEntry.failureCount > 0) newStatus = 'partial';
    else newStatus = 'failed';

    await Notification.findByIdAndUpdate(notif._id, { $push: { attemptLog: attemptEntry }, status: newStatus });

    return result;
  } catch (error) {
    console.error('Send to Multiple Users Error:', error);
    throw error;
  }
};

/**
 * Send a topic-based notification (all devices subscribed to topic)
 * @param {string} topic - Topic name
 * @param {object} message - Message object
 * @returns {Promise<string>} Message ID
 */
exports.sendToTopic = async (topic, message) => {
  try {
    validateFirebase();
    const messaging = getMessaging();
    
    const dataPayload = {};
    if (message.data) {
      Object.keys(message.data).forEach(key => {
        dataPayload[key] = String(message.data[key]);
      });
    }

    const payload = {
      notification: {
        title: message.title,
        body: message.body
      },
      ...(Object.keys(dataPayload).length > 0 && { data: dataPayload })
    };

    // Create notification record for topic
    const notif = await Notification.create({
      title: message.title,
      body: message.body,
      data: message.data || {},
      recipientType: 'topic',
      recipientId: topic,
      status: 'sending',
      attempts: 1
    });

    const messageId = await messaging.send({ topic, ...payload });

    // Log success
    await Notification.findByIdAndUpdate(notif._id, { $push: { attemptLog: { ts: new Date(), successCount: 1, failureCount: 0, failureTokens: [], error: undefined } }, status: 'sent' });

    return messageId;
  } catch (error) {
    console.error('FCM Topic Send Error:', error);
    // Log failure
    try {
      await Notification.create({
        title: message.title,
        body: message.body,
        data: message.data || {},
        recipientType: 'topic',
        recipientId: topic,
        status: 'failed',
        attempts: 1,
        attemptLog: [{ ts: new Date(), successCount: 0, failureCount: 0, failureTokens: [], error: String(error.message) }]
      });
    } catch (e) {
      console.error('Failed to log topic notification failure:', e);
    }
    throw error;
  }
};

/**
 * Subscribe user tokens to a topic
 * @param {string[]} tokens - Tokens to subscribe
 * @param {string} topic - Topic name
 * @returns {Promise<void>}
 */
exports.subscribeToTopic = async (tokens, topic) => {
  try {
    validateFirebase();
    const messaging = getMessaging();
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('Tokens must be a non-empty array');
    }

    const response = await messaging.subscribeToTopic(tokens, topic);
    console.log(`Subscribed ${response.successCount} devices to topic: ${topic}`);
    return response;
  } catch (error) {
    console.error('Subscribe to Topic Error:', error);
    throw error;
  }
};

/**
 * Unsubscribe user tokens from topic
 * @param {string[]} tokens - Tokens to unsubscribe
 * @param {string} topic - Topic name
 * @returns {Promise<void>}
 */
exports.unsubscribeFromTopic = async (tokens, topic) => {
  try {
    validateFirebase();
    const messaging = getMessaging();
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('Tokens must be a non-empty array');
    }

    const response = await messaging.unsubscribeFromTopic(tokens, topic);
    console.log(`Unsubscribed ${response.successCount} devices from topic: ${topic}`);
    return response;
  } catch (error) {
    console.error('Unsubscribe from Topic Error:', error);
    throw error;
  }
};
