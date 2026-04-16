# Patrol System Deployment Checklist

## Pre-Deployment Review

- [ ] All code changes have been reviewed and tested
- [ ] No console errors in development environment
- [ ] Database migration has been tested on staging database
- [ ] API endpoints have been tested (curl/Postman)
- [ ] End-to-end tests completed (see END_TO_END_TEST_GUIDE.md)
- [ ] User documentation has been reviewed
- [ ] Team members are informed of deployment window

---

## Phase 1: Database Deployment

### Backup Production Database

- [ ] **Take database backup**
  ```bash
  # Using Supabase CLI
  supabase db pull --remote
  
  # Or manual backup in Supabase Dashboard
  # Go to Project Settings → Database → Backups → Request backup
  ```
  
- [ ] **Verify backup completed**
  - Backup should be listed in Supabase Dashboard
  - Store backup location for rollback purposes

### Apply Migration

- [ ] **Apply migration 012 to staging environment**
  ```bash
  # Using Supabase CLI
  supabase db push --remote --link-to-staging-project
  ```
  
- [ ] **Verify migration on staging**
  - [ ] Check new tables exist: `patrol_assignments`, `patrol_comments`
  - [ ] Check new columns on `reports` table
  - [ ] Verify RLS policies are in place
  - [ ] Confirm indexes are created
  - Run verification queries from DATABASE_MIGRATION_GUIDE.md

- [ ] **Apply migration to production**
  ```bash
  supabase db push --remote --link-to-production-project
  ```
  
- [ ] **Post-migration verification**
  - [ ] Run all verification queries from migration guide
  - [ ] Check database size/performance impact
  - [ ] Monitor for any errors in Supabase logs

---

## Phase 2: Backend Deployment

### Deploy Supabase Functions

- [ ] **Deploy updated API function**
  ```bash
  # From project root
  supabase functions deploy make-server-5f514c57 --remote
  ```

- [ ] **Verify function deployment**
  - [ ] Check function is deployed in Supabase Dashboard
  - [ ] Check for any error logs
  - [ ] Test endpoints with production credentials
  
  ```bash
  # Test promotion endpoint
  curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/make-server-5f514c57/admin/promote-to-patrol \
    -H "Authorization: Bearer [PROD_TOKEN]" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "test-user-id",
      "unit": "Unit Test",
      "badgeNumber": "TEST-001",
      "rank": "Police Officer 1",
      "shiftStart": "08:00",
      "shiftEnd": "17:00"
    }'
  ```

- [ ] **Check function logs**
  - In Supabase Dashboard: Help → Logs
  - Filter by function name
  - Look for any errors or warnings

---

## Phase 3: Frontend Deployment

### Build Frontend

- [ ] **Build optimized production bundle**
  ```bash
  npm run build
  ```

- [ ] **Check build output**
  - [ ] No critical errors in build log
  - [ ] Bundle size is reasonable (check for bloat)
  - [ ] All source maps generated
  
  ```bash
  # Check bundle size
  npm run build
  # Look for "dist/" folder - should be under 5MB
  ```

### Deploy Frontend

- [ ] **Deploy to hosting provider** (Netlify, Vercel, or custom)
  - [ ] Update environment variables for production
  - [ ] Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are set correctly
  - [ ] Deploy build artifacts

- [ ] **Verify frontend deployment**
  - [ ] Navigate to production URL
  - [ ] Check for any 404 errors or missing assets
  - [ ] Verify all pages load correctly
  - [ ] Check DevTools console for errors

---

## Phase 4: Configuration & Environment

### Environment Variables

- [ ] **Production secrets are set**
  ```
  VITE_SUPABASE_URL=https://[project-id].supabase.co
  VITE_SUPABASE_KEY=[production-key]
  VITE_API_BASE_URL=https://[project-id].supabase.co/functions/v1
  ```

- [ ] **Backend environment variables configured**
  ```
  SUPABASE_URL=https://[project-id].supabase.co
  SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
  SUPABASE_JWT_SECRET=[jwt-secret]
  ```

### CORS Configuration

- [ ] **Supabase CORS settings**
  - [ ] Production frontend domain is in allowed list
  - [ ] Test CORS requests work correctly

### Rate Limiting

- [ ] **Rate limits configured appropriately**
  - [ ] OTP verification: 5 attempts per 15 minutes
  - [ ] OTP resend: 3 attempts per 60 minutes
  - [ ] Monitor for abuse patterns

---

## Phase 5: Monitoring & Logging

### Enable Monitoring

- [ ] **Set up error tracking**
  - [ ] Enable Sentry or similar service (if applicable)
  - [ ] Start monitoring production errors

- [ ] **Database monitoring**
  - [ ] Check connection pool usage
  - [ ] Monitor query performance
  - [ ] Set up alerts for high resource usage

- [ ] **API monitoring**
  - [ ] Monitor endpoint response times
  - [ ] Check error rates
  - [ ] Alert on unusual patterns

### Log Configuration

- [ ] **Supabase logs enabled**
  - [ ] Postgres logs: View in Dashboard
  - [ ] API logs: Monitor function execution
  - [ ] Auth logs: Track login/registration events

---

## Phase 6: Security Validation

### Access Control

- [ ] **RLS policies validated**
  - [ ] Admin can view all records
  - [ ] Patrol can only see assigned reports
  - [ ] Residents cannot see other users' data

- [ ] **API authentication enforcement**
  - [ ] JWT tokens required for protected endpoints
  - [ ] Calls without auth token return 401

### Data Protection

- [ ] **Sensitive data handling**
  - [ ] Passwords hashed (SHA/bcrypt)
  - [ ] No sensitive data in logs
  - [ ] Audit trail set for role promotions

### HTTPS/SSL

- [ ] **SSL certificate valid**
  - [ ] Production domain has valid SSL certificate
  - [ ] No mixed content warnings
  - [ ] All assets loaded over HTTPS

---

## Phase 7: User Communication

### Notify Users

- [ ] **Send announcement** (if applicable)
  ```
  Subject: Patrol System Feature Now Live
  
  Dear Community,
  
  We're excited to announce that the patrol system is now fully operational. 
  New features include:
  - Patrol officers can now serve your community
  - Real-time updates on report status
  - Improved response coordination
  
  [More details...]
  ```

- [ ] **Update documentation**
  - [ ] HOW_TO_CREATE_PATROL_ACCOUNT.md available to admins
  - [ ] FAQ updated with patrol-specific questions
  - [ ] User guide updated

- [ ] **Train admin staff**
  - [ ] Demo promotion workflow
  - [ ] Walk through incident assignment
  - [ ] Show real-time monitoring features

---

## Phase 8: Smoke Testing (Production)

### Quick Functionality Tests

- [ ] **Registration flow works**
  - [ ] Create new test account
  - [ ] Verify OTP send/verification
  - [ ] Confirm account creation

- [ ] **Admin operations work**
  - [ ] Log in as admin
  - [ ] Access verification queue
  - [ ] Promote test resident to patrol

- [ ] **Patrol officer functionality**
  - [ ] Log in as patrol officer
  - [ ] Switch to patrol mode
  - [ ] View assigned reports
  - [ ] Add comments (verify real-time)

- [ ] **Error scenarios handled**
  - [ ] Try invalid operations
  - [ ] Check error messages are user-friendly
  - [ ] Verify no system crashes

### Performance Checks

- [ ] **Load time acceptable**
  - [ ] Frontend load time < 3 seconds
  - [ ] API responses < 500ms
  - [ ] Real-time updates responsive (< 2 second lag)

- [ ] **No memory leaks**
  - [ ] Browser DevTools → Performance tab
  - [ ] Memory usage stable over time
  - [ ] No unexpected growth

---

## Phase 9: Rollback Plan (If Needed)

### Database Rollback

```sql
-- If critical issues found, rollback migration
DROP TABLE IF EXISTS patrol_comments CASCADE;
DROP TABLE IF EXISTS patrol_assignments CASCADE;

ALTER TABLE reports 
DROP COLUMN IF EXISTS ticket_id,
DROP COLUMN IF EXISTS patrol_assigned_to,
DROP COLUMN IF EXISTS patrol_status,
DROP COLUMN IF EXISTS patrol_acknowledged_at;

-- Restore from backup if needed
-- Contact Supabase support: support@supabase.io
```

- [ ] **Rollback procedure documented**
- [ ] **Backup location known**
- [ ] **Time to rollback: ~5 minutes**

### Frontend Rollback

- [ ] **Previous version tagged in git**
  ```bash
  git tag -l  # View previous versions
  git checkout [previous-tag]
  npm run build
  # Deploy previous build
  ```

- [ ] **CDN cache cleared** (if applicable)
- [ ] **Time to rollback: ~2 minutes**

---

## Phase 10: Post-Deployment

### Monitoring (First 24 Hours)

- [ ] **Monitor error rates**
  - [ ] Check Supabase logs every hour
  - [ ] Monitor API response times
  - [ ] Track user registration/login success rate

- [ ] **Database health**
  - [ ] CPU usage normal (< 50%)
  - [ ] Memory usage stable
  - [ ] No slow queries

- [ ] **User reports/feedback**
  - [ ] No major complaints
  - [ ] Performance acceptable
  - [ ] All features working as expected

### 24-Hour Review

- [ ] **Issues identified**
  - [ ] List any bugs or problems found
  - [ ] Prioritize by severity

- [ ] **Performance baseline established**
  - [ ] Document average response times
  - [ ] Record typical user load
  - [ ] Set performance alerts

- [ ] **Celebrate success** 🎉
  - [ ] Team debrief
  - [ ] Share success metrics with stakeholders

---

## Post-Deployment Maintenance

### Regular Tasks

- [ ] **Daily (First Week)**
  - [ ] Check logs for errors
  - [ ] Monitor performance metrics
  - [ ] Respond to user issues

- [ ] **Weekly**
  - [ ] Review database growth
  - [ ] Check for unused indexes
  - [ ] Scan for security issues

- [ ] **Monthly**
  - [ ] Database maintenance/optimization
  - [ ] Performance analysis
  - [ ] Capacity planning

### Future Enhancements

- [ ] **Implement in Next Phase**
  - [ ] Accept/decline patrol assignments (API pattern exists)
  - [ ] User notifications for role changes
  - [ ] Dedicated `patrol_officers` table
  - [ ] Patrol analytics dashboard
  - [ ] Integration with external systems (if needed)

---

## Sign-Off

### Deployment Approval

- [ ] Development Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] DevOps/Infrastructure: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______

### Deployment Completion

- [ ] Deployment Date/Time: _______________________
- [ ] Deployed By: _______________________
- [ ] Any Issues: ☐ Yes ☐ No (describe if yes)
  
  Details: _____________________________________

---

## Quick Reference

### Emergency Contacts

- **Supabase Support**: support@supabase.io
- **On-Call DevOps**: [Phone/Slack/Email]
- **Lead Developer**: [Contact]

### Important Links

- **Supabase Dashboard**: https://app.supabase.io
- **Production Logs**: [Link to logging service]
- **Production Frontend**: https://bantaysp.com
- **API Status**: [Status page link]

### Critical Command Reference

```bash
# View logs
supabase functions logs --remote

# Quick rollback
git checkout [previous-version]
npm run build

# Database status
supabase db version --remote

# Emergency support
supabase help
```

---

## Notes

Use this section for any deployment-specific notes:

```
[Notes from deployer]

- Time started: _______________
- Time completed: _______________
- Issues encountered: _______________
- Additional actions taken: _______________
```

---

**Document Version**: 1.0  
**Last Updated**: April 14, 2026  
**Next Review**: [Date after deployment]
