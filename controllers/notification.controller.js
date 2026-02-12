const FCMDeviceToken = require("../model/fcmDeviceToken");
const { 
  sendToUser, 
  sendToMultipleUsers, 
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic 
} = require("../services/fcm.service");

/**
 * Register or update FCM token for a device
 * POST /notify/register-token
 * Body: { userId, fcmToken }
 */
exports.registerToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ message: "userId and fcmToken are required" });
    }

    await FCMDeviceToken.updateOne(
      { fcmToken },
      { userId, fcmToken },
      { upsert: true }
    );

    res.status(200).json({ message: "Token registered successfully" });
  } catch (error) {
    console.error("Register Token Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send notification to a single user (all their devices)
 * POST /notify/send/single
 * Body: { userId, title, body, data? }
 */
exports.sendToSingleUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        message: "userId, title, and body are required" 
      });
    }

    const result = await sendToUser(userId, { title, body, data }, FCMDeviceToken);

    res.status(200).json({
      message: "Notification sent",
      ...result
    });
  } catch (error) {
    console.error("Send Single User Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send notification to multiple users
 * POST /notify/send/multiple
 * Body: { userIds: [], title, body, data? }
 */
exports.sendToMultipleUsersHandler = async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({ 
        message: "userIds (array), title, and body are required" 
      });
    }

    const result = await sendToMultipleUsers(userIds, { title, body, data }, FCMDeviceToken);

    res.status(200).json({
      message: "Notifications sent",
      ...result
    });
  } catch (error) {
    console.error("Send Multiple Users Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send notification to all users subscribed to a topic
 * POST /notify/send/topic
 * Body: { topic, title, body, data? }
 */
exports.sendToTopicHandler = async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({ 
        message: "topic, title, and body are required" 
      });
    }

    const messageId = await sendToTopic(topic, { title, body, data });

    res.status(200).json({
      message: "Topic notification sent",
      messageId
    });
  } catch (error) {
    console.error("Send Topic Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Subscribe user token to a topic
 * POST /notify/subscribe-topic
 * Body: { fcmToken, topic }
 */
exports.subscribeToTopicHandler = async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    if (!fcmToken || !topic) {
      return res.status(400).json({ 
        message: "fcmToken and topic are required" 
      });
    }

    await subscribeToTopic([fcmToken], topic);

    res.status(200).json({ message: "Subscribed to topic successfully" });
  } catch (error) {
    console.error("Subscribe Topic Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unsubscribe user token from a topic
 * POST /notify/unsubscribe-topic
 * Body: { fcmToken, topic }
 */
exports.unsubscribeFromTopicHandler = async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    if (!fcmToken || !topic) {
      return res.status(400).json({ 
        message: "fcmToken and topic are required" 
      });
    }

    await unsubscribeFromTopic([fcmToken], topic);

    res.status(200).json({ message: "Unsubscribed from topic successfully" });
  } catch (error) {
    console.error("Unsubscribe Topic Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send a test notification to a user (self or specified)
 * POST /notify/send/test
 * Body: { userId? , title?, body?, data? }
 */
exports.sendTestNotification = async (req, res) => {
  try {
    const { userId, title = 'Test Notification', body = 'This is a test', data } = req.body;

    const targetUser = userId || (req.user && req.user.userId);
    if (!targetUser) return res.status(400).json({ message: 'userId required (or authenticate)' });

    const result = await sendToUser(targetUser, { title, body, data }, FCMDeviceToken, { relatedEntity: 'test', expireInHours: 1 });

    res.status(200).json({ message: 'Test notification sent', ...result });
  } catch (error) {
    console.error('Send Test Notification Error:', error);
    res.status(500).json({ error: error.message });
  }
};
