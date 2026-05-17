# Role Persistence & Access Denied - Testing Guide

## Overview

All critical fixes have been implemented. This guide provides step-by-step testing instructions to verify that admin and patrol users can persist in their respective dashboards after page reload.

---

## Test Scenarios

### Scenario 1: Admin Reload Test ✓ CRITICAL

**Objective**: Verify that admin users remain in admin dashboard after page reload.

**Steps**:
1. Log in as an admin user
2. Verify you land on `/app/admin` or `/app/dashboard` (admin area)
3. Open **DevTools Console** (F12 or Ctrl+Shift+I)
4. Search for logs: `[ProtectedRoute]` and `[RoleGuard]` to see the permission gates
5. **F5 refresh** the page
6. **Expected Result**: 
   - Brief loading spinner appears ("Verifying session..." → "Verifying permissions...")
   - Dashboard loads normally (admin dashboard)
   - NO "Access Denied" error
   - NO blank white screen
7. **Check Logs** in console:
   - Should see: `[ProtectedRoute] Enriching role from database, waiting before role check...`
   - Should see: `[RoleGuard] Access granted` (after enrichment)
   - Should see: `[RoleCache] Role cached: admin`

**Failure Indicators**:
- ❌ Redirects to `/access-denied`
- ❌ Blank white screen persists
- ❌ Shows "Insufficient permissions" error
- ❌ Redirects to `/app/dashboard` (resident page)

---

### Scenario 2: Patrol Reload Test ✓ CRITICAL

**Objective**: Verify that patrol users remain in patrol dashboard after page reload.

**Steps**:
1. Log in as a patrol user
2. Verify you land on `/app/patrol/dashboard`
3. Open **DevTools Console** (F12 or Ctrl+Shift+I)
4. **F5 refresh** the page
5. **Expected Result**:
   - Brief loading spinner appears
   - Patrol dashboard loads normally
   - NO "Access Denied" error
   - NO blank white screen
6. **Check Logs** in console:
   - Should see: `[ProtectedRoute] Enriching role from database, waiting before role check...`
   - Should see: `[RoleGuard] Access granted`
   - Should see: `[RoleCache] Role cached: patrol`

**Failure Indicators**:
- ❌ Shows "Access Denied — Insufficient permissions" (403 error)
- ❌ Redirects to resident dashboard
- ❌ Blank screen persists longer than 1 second

---

### Scenario 3: Resident Reload Test ✓

**Objective**: Verify that resident users stay in resident dashboard after reload (should be quick, no long wait).

**Steps**:
1. Log in as a resident user
2. Verify you land on `/app/dashboard`
3. Open **DevTools Console**
4. **F5 refresh** the page
5. **Expected Result**:
   - Quick load to resident dashboard
   - Loading spinner should be brief or not visible
   - Normal dashboard view

---

### Scenario 4: Admin Direct URL Access Test ✓

**Objective**: Verify admin can access patrol routes directly (admin has permission).

**Steps**:
1. Log in as an admin user
2. Manually visit: `http://localhost:5174/app/patrol/dashboard`
3. **Expected Result**:
   - **Either**: Page loads (admin can view patrol dashboard)
   - **Or**: Redirects to `/app/admin` (admin policy)
   - ❌ NOT: "Access Denied" error

---

### Scenario 5: Patrol Direct URL Access Test ✓

**Objective**: Verify patrol cannot access admin routes (permission denied).

**Steps**:
1. Log in as a patrol user
2. Manually visit: `http://localhost:5174/app/admin`
3. **Expected Result**:
   - Redirects to `/app/patrol/dashboard` (fallback route)
   - Shows loading spinner during role check
   - ❌ NOT: Blank screen

---

### Scenario 6: Resident Cannot Access Admin/Patrol ✓

**Objective**: Verify resident users are blocked from admin/patrol routes.

**Steps**:
1. Log in as a resident user
2. Try to visit: `http://localhost:5174/app/admin`
3. Try to visit: `http://localhost:5174/app/patrol/dashboard`
4. **Expected Result**:
   - Redirected to `/app/dashboard` (resident dashboard)
   - Brief loading spinner visible
   - No access granted

---

### Scenario 7: Role Cache Works ✓ OPTIONAL

**Objective**: Verify localStorage role cache provides fast re-render.

**Steps**:
1. Log in as admin/patrol user
2. Open **DevTools** → **Application** → **Local Storage**
3. Look for key: `bantay_last_known_role`
4. **Verify**: It contains the correct role (patrol, admin, or resident)
5. Close browser tab completely
6. Reopen app at `/app/dashboard`
7. **Note**: Role cache might show placeholder initially (non-critical)

---

## Console Log Reference

### What You Should See (Success Logs)

**On Initial Load**:
```
[AuthContext] Initializing auth on mount
[AuthContext] Session restored: hasSession=true, userId=<uuid>, userEmail=<email>
[AuthContext] Setting base user from session (non-blocking): role=resident, id=<uuid>
[ProtectedRoute] Verifying session...
[AuthContext] Starting background database enrichment: userId=<uuid>
```

**During Enrichment** (if /app/patrol or /app/admin):
```
[ProtectedRoute] Enriching role from database, waiting before role check...
[RoleGuard] Evaluating access control {userRole: resident, allowedRoles: ['patrol', 'admin'], ...}
[RoleGuard] Verifying permissions...
```

**After Enrichment Completes**:
```
[AuthContext] Background enrichment complete, updating user: role=patrol, id=<uuid>
[AuthContext] Database profile enriched successfully: userId=<uuid>, role=patrol, barangay=...
[RoleCache] Role cached: patrol
[ProtectedRoute] ✅ Access granted for user <uuid> with role 'patrol'
[RoleGuard] Access granted
```

### What Indicates a Problem

**Red Flags**:
- ❌ `[ProtectedRoute] ⚠️ Access Denied - User role 'resident' not in required roles: [patrol, admin]`
- ❌ No enrichment logs (stuck at default role)
- ❌ Multiple redirects in quick succession
- ❌ Console shows 5-second enrichment timeout

---

## Browser DevTools Tips

### Enable Console Logging
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Reload the page (F5)
4. Search for logs with filter: `ProtectedRoute`, `RoleGuard`, `AuthContext`, `RoleCache`

### Check Network Performance
1. Go to **Network** tab
2. Look for request to: `/auth/profile/{userId}`
3. Check response time (should be <500ms normally)
4. Verify status is **200 OK** (not 404, 401, 500)

### View Role Cache
1. Go to **Application** tab
2. Click **Local Storage** → `http://localhost:5174`
3. Look for key `bantay_last_known_role`
4. Value should be JSON like: `{"version":"1","role":"patrol","timestamp":1234567890}`

---

## Common Issues & Troubleshooting

### Issue: "Access Denied" Still Shows After Reload

**Possible Causes**:
1. Backend `/auth/profile/{userId}` endpoint returning error
2. Enrichment API timeout (5 seconds) being exceeded
3. Role not properly stored in `user_profiles` table

**Debug Steps**:
1. Open **Network** tab in DevTools
2. Look for `/auth/profile/{userId}` request
3. Check response status and body
4. Verify user exists in `user_profiles` table with correct role

### Issue: Blank White Screen for >2 Seconds

**Possible Causes**:
1. Enrichment API is very slow (>2 seconds)
2. `isEnriching` flag not being set to false after completion
3. Loading gate not being triggered

**Debug Steps**:
1. Check console logs for timing
2. Look for `[ProtectedRoute] Enriching role from database...` log
3. Verify `[AuthContext] Background enrichment complete...` appears within 5 seconds

### Issue: Role Cache Not Working

**Note**: Role cache is optional and improves UX but is not critical. If it doesn't work, the app will still function correctly.

**Debug Steps**:
1. Check if localStorage is enabled
2. Verify key `bantay_last_known_role` exists after login
3. Check DevTools Console for `[RoleCache]` logs

---

## What Changed (Technical Summary)

### ProtectedRoute (CRITICAL FIX)
- **Before**: Checked role before enrichment completed
- **After**: Shows spinner until both `isLoading=false` AND `isEnriching=false`
- **Impact**: Prevents false "Access Denied" redirects on reload

### RoleGuard (CRITICAL FIX)
- **Before**: Only showed spinner if role mismatch + enriching (conditional)
- **After**: Always shows spinner during enrichment, unconditionally
- **Impact**: Prevents Access Denied flash even for mismatched roles

### RoleBasedRedirect (OPTIMIZATION)
- **Before**: Redirected during enrichment with default role
- **After**: Waits for enrichment before routing
- **Impact**: Admin/patrol users routed to correct dashboard after reload

### AuthContext (ENHANCEMENT)
- **Before**: No caching of role
- **After**: Stores confirmed role in localStorage after enrichment
- **Impact**: Faster re-renders, less white flash

### Role Cache (NEW - OPTIONAL)
- **File**: `src/lib/roleCache.ts`
- **Purpose**: Cache confirmed role for faster re-renders
- **Automatically integrated**: Into AuthContext enrichment flow
- **Cleared**: On logout

---

## Success Criteria

✅ **All Tests Pass When**:
1. Admin reloads → stays on admin dashboard (no redirect)
2. Patrol reloads → stays on patrol dashboard (no Access Denied)
3. Resident reloads → stays on resident dashboard (quick load)
4. Console shows correct logs with phases
5. No blank screens or false errors
6. Role cache stores and retrieves role correctly

---

## Next Steps If Issues Remain

1. **Check Backend**:
   - Verify `/auth/profile/{userId}` endpoint is returning correct role
   - Verify JWT validation is working (sub claim)
   - Check for 5-second timeout on slow connections

2. **Check Database**:
   - Verify user exists in `user_profiles` table
   - Verify role column has correct value (admin/patrol/resident)
   - Verify user_id matches JWT sub claim

3. **Check Logs**:
   - Enable API logs on backend
   - Check for errors in role enrichment response
   - Look for timeout or network errors

---

## Performance Notes

- **Expected loading spinner duration**: 300-500ms (network latency)
- **Role enrichment timeout**: 5 seconds (max wait before reverting to default)
- **Role cache TTL**: 7 days (automatic expiry)
- **Cache size**: <500 bytes

