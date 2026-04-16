# End-to-End Testing Guide for Patrol System

## Overview

This guide provides step-by-step instructions to test the entire patrol system workflow, from resident registration through patrol officer assignment and real-time updates.

---

## Pre-Test Checklist

Before running tests, ensure:

- [ ] Database migration 012 has been applied successfully
- [ ] Backend API is running and accessible
- [ ] Frontend development server is running (`npm run dev`)
- [ ] Browser DevTools console is open for error checking
- [ ] Test accounts are ready (or will be created during testing)
- [ ] At least two test users: one for admin, one for resident

---

## Test Scenario 1: Resident Registration

**Objective**: Verify a resident can register, receive OTP, and create account

### Steps

1. **Open Registration Page**
   - Navigate to `http://localhost:5173/register`
   - Should see multi-step registration form

2. **Fill Step 1: Personal Info**
   - First Name: `Test`
   - Last Name: `Resident`
   - Email: `testres@example.com`
   - Password: `Test@123`
   - Phone: `+639171234567`
   - Barangay: `Brgy. San Pablo`
   - Click **Next**

3. **Upload ID (Step 2)**
   - Click "Choose File" or drag image
   - Select any image file (it will be validated)
   - Click **Continue to Verification**

4. **Verify OTP (Step 3)**
   - **Check Console Logs**:
     ```
     [Register] OTP sent to testres@example.com
     OTP Code: [6-digit number]
     ```
   - **Enter OTP**: Copy the 6-digit code from console
   - Click **Verify & Create Account**

5. **Verify Success**
   - Should see success message
   - Should redirect to login page
   - Account should be created with role = "resident"

**Expected Result**: ✅ Resident account created with verification status = "pending_id_review"

---

## Test Scenario 2: Admin Approval

**Objective**: Verify admin can approve resident's ID

### Prerequisites
- Admin account already exists (user with role = "admin")
- Resident from Test Scenario 1 exists

### Steps

1. **Log in as Admin**
   - Navigate to `http://localhost:5173/login`
   - Email: `admin@example.com`
   - Password: (use your admin password)
   - Click **Sign In**

2. **Go to Admin Dashboard**
   - Click avatar → **Admin Dashboard** (or navigate to `/app/admin`)
   - Should see tabs: Reports, Notifications, Users, Verification QueueNotifications

3. **Navigate to Verification Queue**
   - Click **Verification Queue** tab
   - Should see "Test Resident" with pending ID

4. **Review ID**
   - Click **Review** button on resident row
   - ID image should display
   - Verify basic info is correct

5. **Approve Resident**
   - Click **Approve** button
   - Should see success toast notification
   - Resident should move from verification queue

6. **Verify in Users Tab**
   - Click **Users** tab
   - Should see "Test Resident" in verified users list
   - Status should show as "Verified"

**Expected Result**: ✅ Resident approved and moved to Users tab

---

## Test Scenario 3: Promote to Patrol

**Objective**: Verify admin can promote resident to patrol officer

### Prerequisites
- Resident from Test Scenario 1 is approved (Test Scenario 2 completed)
- Admin is logged in

### Steps

1. **Open Admin Dashboard**
   - Navigate to Admin Dashboard → **Users** tab (if not already there)

2. **Find Approved Resident**
   - Locate "Test Resident" in the users table
   - Verify role shows as "resident"

3. **Click Promote Button**
   - In the **Actions** column, click the blue icon (👮 UserPlus icon)
   - Should only be visible for resident users

4. **Fill Promotion Form**
   - **Patrol Unit**: `Unit 1 - Alpha`
   - **Badge Number**: `PNP-TEST-001`
   - **Rank**: Select `Police Officer 1` from dropdown
   - **Shift Start**: `08:00`
   - **Shift End**: `17:00`
   - Click **Promote**

5. **Verify Success**
   - Should see success confirmation screen
   - Modal closes after ~1.5 seconds
   - Users list refreshes automatically
   - Should see toast notification: "User promoted successfully"

6. **Check Updated User**
   - In Users table, "Test Resident" should now show:
     - Role: `patrol`
     - Promote button should be replaced with different icon

**Expected Result**: ✅ Resident promoted to patrol officer role

**Database Check**:
```sql
SELECT first_name, last_name, role, bio FROM user_profiles 
WHERE email = 'testres@example.com';

-- Expected output:
-- first_name: Test
-- last_name: Resident
-- role: patrol
-- bio: {"unit":"Unit 1 - Alpha","badgeNumber":"PNP-TEST-001",...}
```

---

## Test Scenario 4: Patrol Officer Login & Mode Switch

**Objective**: Verify promoted user can switch to Patrol Mode

### Prerequisites
- User is promoted to patrol (Test Scenario 3 completed)

### Steps

1. **Log Out Current Admin**
   - Click avatar → **Log Out**

2. **Log In as Promoted User**
   - Email: `testres@example.com`
   - Password: `Test@123`
   - Click **Sign In**

3. **Verify Logged In**
   - Dashboard should load
   - Should see resident dashboard initially

4. **Look for Mode Switcher**
   - In navbar header, should see button showing current mode
   - Text should say "👤 Resident Mode" or similar

5. **Click Mode Switcher**
   - Click the mode button
   - Should see options to switch modes
   - Click **🚔 Patrol Mode**

6. **Verify Mode Switch**
   - Should redirect to `/app/patrol/dashboard`
   - Should see patrol-specific UI (queues, map, etc.)
   - Mode button in navbar should now show "🚔 Patrol Mode"

7. **Test Persistence**
   - Reload the page (`F5`)
   - Should still be in Patrol Mode
   - Mode should persist via localStorage

8. **Switch Back to Resident**
   - Click mode button
   - Click **👤 Resident Mode**
   - Should redirect to resident dashboard

**Expected Result**: ✅ Mode switching works and persists across reloads

**localStorage Check**:
```javascript
// Open DevTools → Console
localStorage.getItem('userMode')
// Should output: "patrol" or "resident"
```

---

## Test Scenario 5: Real-Time Updates (Patrol Comments)

**Objective**: Verify real-time subscriptions work for patrol comments

### Prerequisites
- Patrol officer is logged in (Test Scenario 4 completed)
- A report exists in the system with patrol assignments

### Steps

1. **Open a Report Detail**
   - While in Patrol Mode, click on any assigned report
   - Should see report details and comments section

2. **Open Second Browser Window (Optional)**
   - For real testing, open:
     - Window 1: Patrol officer view
     - Window 2: Admin view or another patrol officer
   - Both should see the same report

3. **Add Comment (From Patrol)**
   - In Window 1 (Patrol officer), type comment in text field
   - Comment example: "Arrived at scene, area secured"
   - Click **Post Comment**

4. **Verify Real-Time Update**
   - Comment should appear immediately in Window 1
   - If Window 2 is open, comment should appear there too **without refresh**
   - Timestamp should show "Just now"

5. **Add Another Comment (From Different User)**
   - In Window 2 (if open as admin), add comment:
     - "Good work, keep area clear"
   - Should appear instantly in Window 1

6. **Check Browser Console**
   - Should see subscription logs (if debugging enabled)
   - No errors should appear

**Expected Result**: ✅ Comments appear in real-time without page refresh

**Supabase Console Check**:
```sql
SELECT * FROM patrol_comments 
ORDER BY created_at DESC LIMIT 5;

-- Should show recent comments from testing
```

---

## Test Scenario 6: Error Handling

**Objective**: Verify system handles errors gracefully

### Test 6A: Invalid OTP
1. In registration Step 3, enter wrong OTP
2. Should show error: "Invalid OTP code"
3. Should not create account

### Test 6B: Rate Limiting  
1. Try to verify OTP 6 times with wrong code
2. Should show rate limit error after 5 attempts
3. Should provide retry time

### Test 6C: Duplicate Email
1. Try to register with email that already exists
2. Should show error: "Email already registered"
3. Should offer login option

### Test 6D: Missing Required Fields
1. In promotion modal, leave required fields empty
2. Should show validation error
3. Should not allow submission

### Test 6E: Non-Admin Accessing Endpoint
1. Log in as resident
2. Try to manually call `/admin/promote-to-patrol` endpoint
3. Should return 403 Forbidden error

**Expected Result**: ✅ All errors handled gracefully with user-friendly messages

---

## Test Scenario 7: Database Integrity

**Objective**: Verify database consistency and constraints

### Check 1: Foreign Key Constraints
```sql
-- Verify all patrol_assigned_to values reference valid users
SELECT DISTINCT r.patrol_assigned_to
FROM reports r
LEFT JOIN user_profiles up ON r.patrol_assigned_to = up.id
WHERE r.patrol_assigned_to IS NOT NULL
  AND up.id IS NULL;

-- Should return 0 rows (no orphaned references)
```

### Check 2: Unique Ticket IDs
```sql
-- Verify all ticket IDs are unique
SELECT ticket_id, COUNT(*) 
FROM reports 
WHERE ticket_id IS NOT NULL
GROUP BY ticket_id 
HAVING COUNT(*) > 1;

-- Should return 0 rows (no duplicates)
```

### Check 3: Role Consistency
```sql
-- Verify promoted users have patrol role
SELECT first_name, last_name, role 
FROM user_profiles 
WHERE role IN ('patrol', 'admin')
ORDER BY created_at DESC;

-- All promoted users should show role = 'patrol'
```

### Check 4: RLS Policies
```sql
-- Verify patrol officer can only see their assigned reports
-- (Test via application UI - no direct SQL check possible)

-- Verify resident cannot see other residents' reports
-- (Test via application UI)
```

**Expected Result**: ✅ All database constraints and referential integrity maintained

---

## Test Scenario 8: Performance

**Objective**: Verify system performs well under load

### Test 8A: Large Comment List
1. Add 100+ comments to a single report
2. Should load comments without lag
3. UI should remain responsive

### Test 8B: Real-Time Subscription Stability
1. Keep subscription open for 5+ minutes
2. Add periodic comments
3. Should remain stable, no connection drops
4. Check browser console for errors

### Test 8C: Query Performance
```javascript
// In browser console, measure query time
const start = performance.now();
// Perform API call
const end = performance.now();
console.log(`Query took ${end - start}ms`);

// Should be under 500ms for most queries
```

**Expected Result**: ✅ System performs well, queries complete in reasonable time

---

## Test Scenario 9: Cross-Browser Compatibility

**Objective**: Verify system works across different browsers

### Browsers to Test
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Test Steps (Repeat for each browser)
1. Register new resident
2. Admin approves
3. Admin promotes to patrol
4. Log in and switch to patrol mode
5. Add comments and verify real-time updates

**Expected Result**: ✅ All scenarios work consistently across browsers

---

## Test Scenario 10: Mobile Responsiveness

**Objective**: Verify UI is usable on mobile devices

### Test Steps with Chrome DevTools Mobile Emulation
1. Open DevTools (`F12`)
2. Click Device Toggle (`Ctrl+Shift+M` or `Cmd+Shift+M`)
3. Select **iPhone 12** or other mobile device

### Test Scenarios
1. Registration flow (all 3 steps)
2. Admin dashboard on mobile
3. Promotion modal on mobile
4. Patrol mode switching
5. Comment input/posting

**Expected Result**: ✅ All UI elements responsive and usable on mobile

---

## Test Results Summary

After completing all tests, fill out this checklist:

### Functionality Tests
- [ ] Test 1: Resident Registration ✅/❌
- [ ] Test 2: Admin Approval ✅/❌  
- [ ] Test 3: Promote to Patrol ✅/❌
- [ ] Test 4: Mode Switching ✅/❌
- [ ] Test 5: Real-Time Updates ✅/❌
- [ ] Test 6: Error Handling ✅/❌
- [ ] Test 7: Database Integrity ✅/❌
- [ ] Test 8: Performance ✅/❌

### Cross-Browser Tests
- [ ] Chrome ✅/❌
- [ ] Firefox ✅/❌
- [ ] Safari ✅/❌
- [ ] Edge ✅/❌

### Mobile Tests
- [ ] iPhone 12 ✅/❌
- [ ] iPad ✅/❌
- [ ] Android ✅/❌

### Issues Found
```
1. [Brief description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce: ...
   - Expected vs Actual: ...

2. [Another issue]
   ...
```

---

## Debugging Tips

### Enable Detailed Logging
```javascript
// In browser console
localStorage.setItem('debug', 'bantaysp:*');
location.reload();
```

### Monitor Real-Time Subscriptions
```javascript
// Check subscription status
supabase.realtime.getChannels()
// Should show active subscriptions
```

### Check Network Requests
1. Open DevTools → Network tab
2. Filter by XHR/Fetch
3. Monitor API calls (should be `/admin/promote-to-patrol`, `/users`, etc.)
4. Check status codes (should be 200 for success)

### View Database Logs
```bash
# In Supabase Dashboard
# Go to Logs → Postgres
# Filter by timestamp and function name
```

---

## Known Limitations & Workarounds

| Issue | Limitation | Workaround |
|-------|-----------|-----------|
| Mode persistence | Clears on logout | User must log back in to restore mode |
| Offline access | No offline mode | Always requires internet connection |
| Real-time lag | Depends on connection | Mobile users on slow connections may see delays |

---

## Support & Next Steps

If tests fail:
1. Check error messages in browser console
2. Verify database migration was applied correctly
3. Restart both frontend and backend servers
4. Clear browser cache and local storage
5. Refer to troubleshooting in DATABASE_MIGRATION_GUIDE.md

For successful tests:
1. Document your test environment (OS, browser, versions)
2. Archive test results for compliance
3. Deploy to production with confidence
4. Monitor production logs for any issues
