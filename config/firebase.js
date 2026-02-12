const firebaseAdmin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Try to load service account from explicit path
const serviceAccountPath = path.join(__dirname, "service-account-file.json");

let isInitialized = false;

try {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account file not found at: ${serviceAccountPath}`);
  }

  // Validate JSON
  const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(fileContent);

  // Check required fields
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missing = requiredFields.filter(field => !serviceAccount[field]);
  if (missing.length > 0) {
    throw new Error(`Service account JSON missing required fields: ${missing.join(', ')}`);
  }

  // Initialize Firebase Admin only once
  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });
    isInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully");
  } else {
    isInitialized = true;
    console.log("✅ Firebase Admin SDK already initialized");
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message);
  console.error("Push notifications will NOT work until this is fixed.");
}

module.exports = firebaseAdmin;
module.exports.isInitialized = isInitialized;