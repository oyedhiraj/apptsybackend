# Firebase Service Account Setup Guide

## ⚠️ Current Status
A **development service account file** has been created at `config/apptsy-service-account-file.json`. This is a **mock/placeholder** that allows you to test the notification system without real Firebase credentials.

**For Production**: Replace with real Firebase credentials.

## Get Real Firebase Service Account

### Step 1: Go to Firebase Console
1. Navigate to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one if you don't have one)
3. Click the **⚙️ Settings icon** (top-left, next to "Project Overview")
4. Select **Project Settings**

### Step 2: Generate Service Account Key
1. Go to the **Service Accounts** tab
2. Click **Generate New Private Key**
3. A JSON file will download automatically
4. **Rename it to `apptsy-service-account-file.json`**

### Step 3: Place in Config
```bash
# Move the file to the config directory
cp ~/Downloads/apptsy-service-account-file.json config/apptsy-service-account-file.json
```

### Step 4: Verify & Restart
```bash
npm run dev
```

Check the startup logs for:
```
✅ Firebase Admin SDK initialized successfully
```

## File Structure
```
config/
  ├── apptsy-service-account-file.json    (← Place real Firebase JSON here)
  ├── firebase.js                         (Initializes Firebase)
  ├── twilio.js
  └── ...
```

## Required Fields in JSON
The service account JSON must contain:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "..."
}
```

## Test Firebase Connection
```bash
curl http://localhost:3000/api/notify/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Firebase is ready",
  "initialized": true,
  "hasMessaging": true
}
```

## Test Send Notification
```bash
# First, register a test FCM token
curl -X POST http://localhost:3000/api/notify/register-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123","fcmToken":"fake_token_for_testing"}'

# Then send a test notification (requires auth token)
curl -X POST http://localhost:3000/api/notify/send/test \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}'
```

## Environment Variables (Optional)
```bash
# .env
NODE_ENV=production              # Switch to production mode
NOTIFICATION_MAX_RETRIES=3       # Max retry attempts for failed notifications
```

## Troubleshooting

### "Firebase messaging() not available"
- Verify `config/apptsy-service-account-file.json` exists
- Check the JSON is valid (not corrupted)
- Ensure all required fields are present
- Restart the server: `npm run dev`

### "service account file not found"
- Download the key from Firebase Console again
- Make sure it's named exactly: `apptsy-service-account-file.json`
- Verify it's in the `config/` directory (not `src/config` or root)

### "Permission denied" when sending
- Firebase project may not have Cloud Messaging enabled
- Go to Firebase Console → Cloud Messaging → Enable it
- Verify service account has correct permissions

## Development vs Production

**Development** (with mock credentials):
- DB records are created ✅
- Notifications won't actually send to devices
- Status will show as "failed" or "partial"
- Good for testing the notification system architecture

**Production** (with real credentials):
- DB records created ✅
- Notifications sent to real FCM ✅
- Devices receive push notifications ✅
- Full audit trail in DB ✅

## Next Steps

1. Download real Firebase service account JSON from Firebase Console
2. Replace `config/apptsy-service-account-file.json`
3. Restart the server
4. Test with `/api/notify/health` endpoint
5. Full notification flow will work end-to-end
