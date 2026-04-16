## Admin Verification Workflow Implementation

### Overview
The registration flow has been refactored to implement an admin verification gate. Users are no longer automatically logged in after completing OTP verification. Instead, they must wait for admin approval before accessing the dashboard.

### Flow Diagram

```
1. User Registration (Step 1)
   └─> POST /register
       └─> Validate form data only
       └─> Response: "OK, proceed to password"

2. OTP Generation (Step 2→3)
   └─> POST /generate-otp
       └─> Generate crypto-secure OTP
       └─> Store in memory (NOT database)
       └─> Send email via SendGrid
       └─> Response: "OTP sent, check email"

3. OTP Verification (Step 3c)
   └─> POST /verify-otp
       ├─> Verify OTP from memory
       ├─> Create auth.users record ✅
       └─> INSERT INTO pending_verification ✅ (NEW!)
       └─> DELETE from memory
       └─> Response: "Pending admin verification"
       └─> ⚠️ NO auto-login, NO auth tokens provided

4. (Waiting State)
   └─> User sees: "Please wait for admin verification"
   └─> User data stored in: pending_verification table
   └─> Admin reviews: pending_verification records

5. Admin Approval (TODO: Create endpoints)
   └─> POST /admin/approve-user/:userId
       ├─> Move pending_verification → user_profiles
       ├─> Create leaderboard entry
       └─> Optionally notify user via email
   └─> POST /admin/reject-user/:userId
       ├─> DELETE from pending_verification
       ├─> DELETE auth.users record
       └─> Notify user via email

6. User Login (After Approval)
   └─> POST /login
       ├─> Verify email + password
       ├─> Check: user exists in user_profiles (not pending_verification)
       └─> Response: auth tokens
```

### Database Changes

#### New Table: pending_verification

```sql
CREATE TABLE pending_verification (
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

-- Indexes for admin queries
CREATE INDEX idx_pending_verification_user_id ON pending_verification(user_id);
CREATE INDEX idx_pending_verification_email ON pending_verification(email);
CREATE INDEX idx_pending_verification_status ON pending_verification(verification_status);
```

**Migration File**: `supabase/migrations/009_create_pending_verification.sql`

### Backend Changes (local-server.ts)

#### Modified Endpoint: POST /verify-otp

**Old Flow**:
```
✅ Verify OTP
✅ Create auth user
❌ Create user_profiles (WRONG - too early!)
✅ Return success
❌ Auto-login occurs
```

**New Flow**:
```
✅ Verify OTP
✅ Create auth user
✅ Create pending_verification (NEW!)
❌ NO auto-login
✅ Return "pending admin verification" message
```

**Key Changes**:
- Line ~590: Changed insert target from `user_profiles` to `pending_verification`
- Line ~620: Removed user_profiles fields that don't exist in pending_verification
- Line ~650: Changed response message to indicate pending status
- **CRITICAL**: Response does NOT return auth tokens (prevents auto-login)

**Current Response**:
```json
{
  "success": true,
  "userId": "uuid-here",
  "email": "user@example.com",
  "message": "Registration completed! Your account is pending admin verification. You will be notified once approved."
}
```

### Frontend Changes (RegisterPage.tsx)

When receiving the pending verification response:

```typescript
// OLD: User was auto-logged in, redirected to dashboard
// NEW: Show pending status message

if (response.success && response.message.includes("pending")) {
  // Show: "Please wait for admin verification"
  // Do NOT attempt auto-login
  // Do NOT store auth tokens
  // Show success message
  showAlert("Almost there! Your account is pending admin verification. An admin will review your registration and notify you once approved.");
  // Optionally redirect to login page or waiting page
}
```

### API Service Changes (api.ts)

```typescript
// The generateOtp() call structure remains the same
// But /verify-otp now returns different status
```

### Frontend Response Handling

**Current RegisterPage.tsx behavior** (needs update):
```typescript
// Step 3: User enters OTP code
// Currently might be attempting auto-login based on success flag
// Should instead show "Pending verification" message
```

### Frontend Gates Required

**Dashboard Access Gate** (to be added):
```typescript
// In DashboardPage.tsx or ProtectedRoute.tsx
// Check if user exists in user_profiles table
// If only in pending_verification, show:
// "Your account is pending admin verification. Please check back later."
```

### Next Steps (Functional Requirements)

#### Phase 1: Immediate (Current)
- ✅ Create pending_verification table (migration 009)
- ✅ Modify /verify-otp endpoint to insert to pending_verification
- ✅ Prevent auto-login by not returning auth tokens
- 🔄 Update RegisterPage.tsx to show pending message
- 🔄 Add guards to prevent pending users from accessing dashboard

#### Phase 2: Admin Workflow (TODO)
- Create `POST /admin/approve-user/:userId` endpoint
- Create `POST /admin/reject-user/:userId` endpoint
- Create admin verification UI
- Add admin-only dashboard for reviewing pending users

#### Phase 3: User Notifications (TODO)
- Email notification when admin approves
- Email notification when admin rejects
- User dashboard message while pending

### Implementation Checklist

- [ ] Run migration 009 in Supabase
- [ ] Verify pending_verification table created
- [ ] Test /verify-otp creates record in pending_verification (not user_profiles)
- [ ] Test /verify-otp returns pending message
- [ ] Update RegisterPage.tsx to show pending status
- [ ] Test user cannot auto-login after registration
- [ ] Create admin approve/reject endpoints
- [ ] Gate dashboard access for pending users
- [ ] Add admin verification UI
- [ ] Test full workflow end-to-end

### Configuration

**Migration File**: `009_create_pending_verification.sql`
- Status: [Ready to run]
- Tables: Creates pending_verification with 3 indexes
- Idempotent: Yes (uses IF NOT EXISTS)

**Files Modified**:
- `local-server.ts` - Lines 590-650 (refactored /verify-otp)
- `supabase/migrations/009_create_pending_verification.sql` - New file

**Files to Update**:
- `src/app/pages/RegisterPage.tsx` - Handle pending status
- `src/app/components/layout/RoleGuard.tsx` - Gate dashboard access

### Testing Workflow

1. Run the migration in Supabase
2. Register a new user through the app
3. Verify in Supabase:
   - ✅ Auth user created in auth.users
   - ✅ Record created in pending_verification
   - ❌ NO record in user_profiles
4. Verify frontend shows "pending admin verification" message
5. Verify user cannot access dashboard (would get 403 or redirect to pending page)

### Troubleshooting

**Issue**: "pending_verification table does not exist"
- **Solution**: Run migration 009 in Supabase dashboard or via CLI

**Issue**: User can still auto-login after registration
- **Solution**: Verify /verify-otp response doesn't include auth tokens
- **Check**: RegisterPage.tsx isn't calling localStorage.setItem for auth

**Issue**: 404 errors on dashboard after registration
- **Solution**: Implement dashboard access gate to check user_profiles table
- **Add**: Redirect to "pending verification" page for pending users
