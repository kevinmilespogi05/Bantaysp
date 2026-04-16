## Admin Verification Workflow - Deployment Guide

### Status: ✅ Ready to Deploy

All code changes have been completed. This guide walks you through the final deployment steps.

---

## Changes Made

### 1. Database Schema (NEW)
- **File**: `supabase/migrations/009_create_pending_verification.sql`
- **Action**: Creates `pending_verification` table with indexes
- **Status**: Ready to run

### 2. Backend Server (MODIFIED)
- **File**: `local-server.ts` (lines 580-680)
- **Changes**:
  - `/verify-otp` now inserts to `pending_verification` instead of `user_profiles`
  - Removed automatic user profile creation
  - Response now indicates "pending admin verification" instead of success
  - No auth tokens returned (prevents auto-login)

### 3. Frontend Registration Page (MODIFIED)
- **File**: `src/app/pages/RegisterPage.tsx`
- **Changes**:
  - After OTP verification, user sees: "Please wait for admin verification"
  - User is redirected to login page (not dashboard)
  - Alert message displays verification status

### 4. API Service Layer (NEW)
- **File**: `src/app/services/api.ts`
- **New Function**: `checkUserVerification(userId)`
  - Queries `user_profiles` table
  - Returns `{ verified: true }` if user found
  - Returns `{ verified: false }` if user in pending_verification only

### 5. Authentication Context (MODIFIED)
- **File**: `src/app/context/AuthContext.tsx`
- **Changes**:
  - `login()` function now checks user verification before allowing access
  - Calls `checkUserVerification()` after successful Supabase auth
  - Logs user back out if only in `pending_verification`
  - Returns helpful message: "Your account is pending admin verification..."

---

## Deployment Steps

### Step 1: Run the Database Migration

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Migration 009: Create pending_verification table for admin verification workflow
-- After users complete OTP verification, they are stored here pending admin approval
-- Only after admin approves should they be moved to user_profiles

CREATE TABLE IF NOT EXISTS pending_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'resident',
  barangay text,
  avatar text,
  id_document_url text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_pending_verification_user_id 
  ON pending_verification(user_id);

-- Index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_pending_verification_email 
  ON pending_verification(email);

-- Index for querying by verification status
CREATE INDEX IF NOT EXISTS idx_pending_verification_status 
  ON pending_verification(verification_status);
```

**Expected result**: All 4 statements should succeed with no errors.

### Step 2: Verify Table Creation

In Supabase dashboard, check:
1. Tables → `pending_verification` exists
2. Columns: `id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `role`, `barangay`, `avatar`, `id_document_url`, `verification_status`, `created_at`, `updated_at`
3. Indexes: `idx_pending_verification_user_id`, `idx_pending_verification_email`, `idx_pending_verification_status`

### Step 3: Restart Local Server

```bash
npm run server
```

The server will pick up the new `/verify-otp` logic that inserts to `pending_verification`.

### Step 4: Test the New Flow

**Test Case 1: Register a New User**
```
1. Go to /register
2. Fill in: Name, Email, Password, Barangay
3. Upload ID
4. Enter OTP from email
5. ✅ Expected: See "Registration completed! Your account is pending admin verification."
6. ✅ Expected: Redirected to home page (not logged in)
7. ✅ Expected: User can see login page
```

**Test Case 2: Attempt to Login (Before Verification)**
```
1. Go to /login
2. Enter email and password
3. ✅ Expected: Error message appears
4. ✅ Expected: Message says "Your account is pending admin verification"
5. ✅ Expected: User is NOT logged in
6. ✅ Expected: Cannot access dashboard
```

**Test Case 3: Verify Data in Database**
```
1. In Supabase dashboard, go to: Tables → pending_verification
2. ✅ Expected: New user record appears
3. ✅ Columns populated: user_id, first_name, last_name, email, phone, barangay, avatar, id_document_url
4. ✅ verification_status = "pending"

5. Go to: Tables → user_profiles
6. ✅ Expected: User is NOT in user_profiles yet
   (They won't be until admin approves)

7. Go to: Auth → Users
8. ✅ Expected: Auth user exists (can see email)
```

---

## Verification Checklist

After deployment, verify:

- [ ] Migration ran successfully in Supabase
- [ ] `pending_verification` table exists with all columns
- [ ] 3 indexes created successfully
- [ ] Local server restarted
- [ ] Can register a new user without errors
- [ ] Registered user data appears in `pending_verification` table
- [ ] Registered user data does NOT appear in `user_profiles` table
- [ ] User is NOT automatically logged in after registration
- [ ] Registration shows "pending admin verification" message
- [ ] Login page shows error for unverified users
- [ ] Error message mentions admin verification

---

## FAQ

**Q: Why isn't the user in user_profiles anymore?**
A: By design! Users now go to `pending_verification` first. Only after admin approval will they be moved to `user_profiles`.

**Q: Why can't the user log in right after registration?**
A: The new workflow requires admin verification before users can access the app. This prevents unauthorized access and allows admins to review registrations first.

**Q: What happens to the auth user created in auth.users?**
A: The auth user still exists (deleted if admin rejects). But login is gated by checking the `user_profiles` table, so users can't log in yet.

**Q: How do I approve a user?**
A: That's the next phase! We'll create:
- `POST /admin/approve-user/:userId` - moves pending_verification → user_profiles
- `POST /admin/reject-user/:userId` - deletes pending_verification + auth user
- Admin UI to review and approve registrations

**Q: What if I have existing registered users?**
A: They should already be in `user_profiles`, so login will work normally for them.

**Q: Can I test with fake users?**
A: Yes! Just register new test users through the app. Each registration will go through the pending workflow.

---

## Troubleshooting

### Issue: "pending_verification table does not exist"
- **Cause**: Migration not run yet
- **Fix**: Run the SQL from Step 1 in Supabase dashboard

### Issue: User still auto-logs in after registration
- **Cause**: Frontend still redirecting to dashboard
- **Fix**: Clear browser cache, restart dev server, verify RegisterPage changes applied

### Issue: "Your account is pending admin verification" even after trying to login
- **Cause**: User is only in `pending_verification`, not `user_profiles` (correct behavior!)
- **Expected**: This message should appear until admin approves the user

### Issue: Cannot find Supabase SQL editor
- **Location**: Supabase dashboard → SQL Editor (in left sidebar)
- **Tip**: Paste the migration SQL and click "Run"

---

## Next Steps (Future)

The following tasks are ready for the next phase:

1. **Create Admin Approval Endpoints**
   - `POST /admin/approve-user/:userId`
   - `POST /admin/reject-user/:userId`

2. **Create Admin Verification UI**
   - Dashboard to review pending users
   - Approve/Reject buttons
   - Email notifications

3. **Add Admin Endpoints to Backend**
   - In `local-server.ts`
   - Handle moving users from pending→verified
   - Handle rejection and cleanup

4. **Create Admin Dashboard**
   - List pending registrations
   - Bulk approve/reject
   - View user details and ID documents

---

## Files Summary

**Modified Files** (3):
- `local-server.ts` - Updated `/verify-otp` endpoint
- `src/app/pages/RegisterPage.tsx` - Updated OTP verification response handling  
- `src/app/context/AuthContext.tsx` - Added verification check to login

**New Files** (2):
- `supabase/migrations/009_create_pending_verification.sql` - Database schema
- `src/app/services/api.ts` - Added `checkUserVerification()` function
- `ADMIN_VERIFICATION_WORKFLOW.md` - Workflow documentation

---

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify all migration SQL ran without errors
3. Check browser console for API errors
4. Check server logs for any backend errors
5. Restart dev server completely
6. Clear browser cache and localStorage

---

**Status**: ✅ All code changes complete. Ready for testing.
