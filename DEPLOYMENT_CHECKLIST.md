# Push Notification Service - Deployment Checklist

## Pre-Deployment Setup

### Firebase Configuration
- [ ] Obtain Firebase project service account JSON from Firebase Console
- [ ] Save to `config/apptsy-service-account-file.json`
- [ ] Verify file contains all required fields:
  - `type`, `project_id`, `private_key_id`, `private_key`
  - `client_email`, `client_id`, `auth_uri`, `token_uri`
  - `auth_provider_x509_cert_url`, `client_x509_cert_url`
- [ ] Test Firebase connectivity with `npm test` (create test script)

### Database Preparation
- [ ] MongoDB connection working (`MONGO_URI` env variable set)
- [ ] Collection auto-created on first token registration
- [ ] Verify `FCMDeviceToken` model indexed on `userId`
- [ ] Test connection: `db.fcmdevicetokens.find({}).pretty()`

### Code Integration
- [ ] Verify `/services/fcm.service.js` exists and has no syntax errors
- [ ] Verify `/controllers/notification.controller.js` created
- [ ] Verify `/routes/firebasenotification.js` updated
- [ ] Verify `app.js` line 52 has: `app.use('/api/notify', notificationRoutes);`
- [ ] All imports are correct (no missing modules)

### Dependencies
- [ ] `firebase-admin` >= 13.6.0 in package.json ✓ (already installed)
- [ ] `express` >= 5.2.1 ✓
- [ ] `mongoose` >= 9.1.5 ✓
- [ ] Run `npm install` to ensure all packages up to date

## Testing Checklist

### Unit Tests
- [ ] Test FCM service exports all functions
- [ ] Test controller validation (missing userId, token)
- [ ] Test Firebase token format validation
- [ ] Test data payload conversion to strings
- [ ] Test failed token cleanup logic

### Integration Tests
- [ ] Register a test FCM token
- [ ] Verify token stored in MongoDB
- [ ] Send notification to registered token
- [ ] Verify notification received on test device
- [ ] Check response includes success/failure counts
- [ ] Subscribe to test topic
- [ ] Send topic notification
- [ ] Verify all topic subscribers receive it

### End-to-End Test
- [ ] Create a test booking
- [ ] Verify vendor receives notification
- [ ] Update booking status
- [ ] Verify customer receives confirmation
- [ ] Complete booking
- [ ] Verify review request sent

## Performance Tests

- [ ] Test with 10 concurrent token registrations
- [ ] Test sending to 100 users (creates 10 Firebase calls)
- [ ] Test topic broadcast with 1000+ subscribers
- [ ] Verify no memory leaks in long-running tests
- [ ] Check database indexes working (token lookup < 50ms)

## Security Audit

- [ ] Token registration endpoint accepts unauthenticated requests ✓
- [ ] Send endpoints require valid JWT token
- [ ] userId validation in authorization checks
- [ ] No sensitive data logged in notification payloads
- [ ] Rate limiting in place for token registration (TODO: Add if needed)
- [ ] Firebase credentials not exposed in error messages
- [ ] Database connection string secured in environment

## Documentation Review

- [ ] [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md) - Complete
- [ ] [CLIENT_INTEGRATION.md](CLIENT_INTEGRATION.md) - Complete
- [ ] [NOTIFICATIONS_IMPLEMENTATION.md](NOTIFICATIONS_IMPLEMENTATION.md) - Complete
- [ ] [NOTIFICATIONS_QUICKREF.md](NOTIFICATIONS_QUICKREF.md) - Complete
- [ ] [.github/copilot-instructions.md](.github/copilot-instructions.md) - Updated
- [ ] Code examples are accurate and tested
- [ ] API endpoint documentation matches implementation

## Deployment Steps

### Development Environment
```bash
# 1. Install dependencies
npm install

# 2. Set environment variables in .env
MONGO_URI=mongodb://...
JWT_SECRET=your_secret_here
PORT=3000

# 3. Copy Firebase service account
cp /path/to/firebase-account.json config/apptsy-service-account-file.json

# 4. Start development server
npm run dev

# 5. Test endpoint
curl -X POST http://localhost:3000/api/notify/register-token \
  -d '{"userId":"test123","fcmToken":"test_token"}' \
  -H "Content-Type: application/json"
```

### Staging Environment
- [ ] Deploy code with new files to staging
- [ ] Set `MONGO_URI` to staging database
- [ ] Upload Firebase service account JSON
- [ ] Run integration tests against staging
- [ ] Verify notifications work end-to-end
- [ ] Check logs for errors

### Production Environment
- [ ] All pre-deployment checks passed
- [ ] Database backups taken
- [ ] Rollback plan documented
- [ ] Deploy code changes
- [ ] Upload Firebase credentials
- [ ] Run smoke tests
- [ ] Monitor error logs for first hour
- [ ] Gradual rollout (if using canary/blue-green)

## Monitoring & Alerting

### Logs to Monitor
- [ ] `"FCM Send Error"` - Firebase API failures
- [ ] `"Token registered"` - Track registration volume
- [ ] `"Failed tokens: X"` - Track token health
- [ ] `"Notification sent"` - Success logs
- [ ] Database errors related to `FCMDeviceToken`

### Metrics to Track
- [ ] Token registration rate (per minute/hour)
- [ ] Notification send success rate (target: >95%)
- [ ] Failed token removal rate
- [ ] Average send latency (target: <500ms)
- [ ] Database size growth (token collection)

### Alerts to Configure
- [ ] Firebase API response time > 1s
- [ ] Success rate drops below 90%
- [ ] MongoDB connection failures
- [ ] Token collection size > 1GB
- [ ] Service memory usage > 500MB

## Post-Deployment

### Week 1
- [ ] Monitor error logs daily
- [ ] Check notification delivery rates
- [ ] Gather user feedback
- [ ] Document any issues

### Week 2-4
- [ ] Analyze notification engagement metrics
- [ ] Optimize topic naming if needed
- [ ] Add more notification types based on feedback
- [ ] Implement scheduled reminder job (if not done)

### Ongoing
- [ ] Monthly review of failure rates
- [ ] Clean up old tokens (archive or delete)
- [ ] Update documentation with learnings
- [ ] Plan for new notification types
- [ ] Monitor Firebase billing

## Rollback Plan

If issues occur:

1. **Stop notification sending**:
   - Comment out notification calls in routes
   - Deploy patch

2. **Revert to previous version**:
   - Roll back database migrations (if any)
   - Roll back code changes
   - Restart services

3. **Preserve data**:
   - Keep `FCMDeviceToken` collection intact
   - Document what failed
   - Plan fix for next deployment

## Common Issues & Solutions

### Issue: "Firebase not initialized"
- **Solution**: Verify service account JSON path and content
- **Prevention**: Test Firebase connection on startup

### Issue: Tokens not registering
- **Solution**: Check MongoDB connection, verify endpoint reachable
- **Prevention**: Add health check endpoint

### Issue: High failure rate on notifications
- **Solution**: Tokens may be expired, request refresh from clients
- **Prevention**: Track token age, implement expiry handling

### Issue: Database growing too large
- **Solution**: Failed tokens auto-cleaned; check indexes
- **Prevention**: Monitor collection size, add cleanup job

## Support & Escalation

**For technical issues**:
1. Check logs: `tail -f logs/app.log`
2. Test with curl/Postman
3. Verify Firebase console shows correct project
4. Check MongoDB connection

**For Firebase issues**:
1. Check Firebase Cloud Messaging quotas
2. Verify service account has correct permissions
3. Check Firebase console for delivery status
4. Contact Firebase support if quota exceeded

**For database issues**:
1. Check MongoDB connection string
2. Verify indexes are created
3. Check disk space
4. Monitor connection pool

## Sign-Off Checklist

- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Team trained on system
- [ ] Runbooks documented
- [ ] Ready for production deployment

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Approved By**: _______________

**Notes**: _____________________________

---

For more information, see:
- [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md) - Technical details
- [NOTIFICATIONS_IMPLEMENTATION.md](NOTIFICATIONS_IMPLEMENTATION.md) - Code integration
- [PUSH_NOTIFICATIONS_README.md](PUSH_NOTIFICATIONS_README.md) - Complete overview
