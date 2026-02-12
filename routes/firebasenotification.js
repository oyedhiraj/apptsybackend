const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const auth = require("../middleware/authmiddleware");
const firebaseAdmin = require("../config/firebase");

/**
 * Health check - verify Firebase is initialized
 * GET /notify/health
 */
router.get("/health", (req, res) => {
  const isInitialized = firebaseAdmin.isInitialized;
  const hasMessaging = firebaseAdmin && typeof firebaseAdmin.messaging === 'function';
  
  if (!isInitialized || !hasMessaging) {
    return res.status(503).json({
      status: "error",
      message: "Firebase not initialized. Check config/apptsy-service-account-file.json",
      initialized: isInitialized,
      hasMessaging: hasMessaging
    });
  }

  res.json({
    status: "ok",
    message: "Firebase is ready",
    initialized: isInitialized,
    hasMessaging: hasMessaging
  });
});

/**
 * Register FCM token for push notifications
 * POST /notify/register-token
 */
router.post("/register-token", async (req, res) => {
  await notificationController.registerToken(req, res);
});

/**
 * Send notification to single user (all their devices)
 * POST /notify/send/single
 */
router.post("/send/single", auth, async (req, res) => {
  await notificationController.sendToSingleUser(req, res);
});

/**
 * Send notification to multiple users
 * POST /notify/send/multiple
 */
router.post("/send/multiple", auth, async (req, res) => {
  await notificationController.sendToMultipleUsersHandler(req, res);
});

/**
 * Send notification to topic subscribers
 * POST /notify/send/topic
 */
router.post("/send/topic", auth, async (req, res) => {
  await notificationController.sendToTopicHandler(req, res);
});

/**
 * Send a test notification (authenticated)
 * POST /notify/send/test
 */
router.post('/send/test', async (req, res) => {
  await notificationController.sendTestNotification(req, res);
});

/**
 * Subscribe device to topic
 * POST /notify/subscribe-topic
 */
router.post("/subscribe-topic", auth, async (req, res) => {
  await notificationController.subscribeToTopicHandler(req, res);
});

/**
 * Unsubscribe device from topic
 * POST /notify/unsubscribe-topic
 */
router.post("/unsubscribe-topic", auth, async (req, res) => {
  await notificationController.unsubscribeFromTopicHandler(req, res);
});

module.exports = router;
