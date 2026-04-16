# Registration System - Complete Component Alignment Map

## 📊 Component Dependency Matrix

| Component | File | Impact | Status | Notes |
|-----------|------|--------|--------|-------|
| **RegisterPage** | `src/app/pages/RegisterPage.tsx` | Creates user | ⚠️ Partial | Phone not sent; OTP mock; ID upload mock |
| **LoginPage** | `src/app/pages/LoginPage.tsx` | Post-login flow | ✅ Works | But needs email verification check |
| **AuthContext** | `src/app/context/AuthContext.tsx` | Maps user data | ⚠️ Incomplete | Missing phone in mapSupabaseUser() |
| **AppLayout** | `src/app/components/layout/AppLayout.tsx` | Route protection | ⚠️ Partial | May need unverified user redirect |
| **Header** | `src/app/components/layout/Header.tsx` | Shows user info | ✅ Ready | Will show phone once in user object |
| **Sidebar** | `src/app/components/layout/Sidebar.tsx` | Shows user avatar | ✅ Ready | Same as Header |
| **ProfilePage** | `src/app/pages/ProfilePage.tsx` | Full profile display | ⚠️ Incomplete | Missing phone field; needs verified badge link |
| **DashboardPage** | `src/app/pages/DashboardPage.tsx` | User greeting | ✅ Ready | Uses user.first_name |
| **ReportsPage** | `src/app/pages/ReportsPage.tsx` | Report author | ✅ Ready | Uses user avatar, name, role |
| **AdminDashboard** | `src/app/pages/AdminDashboard.tsx` | Verification queue | ⚠️ Partial | Tab exists but no data source |
| **registerUser()** | `src/app/services/api.ts` | API call | ❌ Broken | Phone param missing from RegisterData |
| **fetchUserProfile()** | `src/app/services/api.ts` | Extended data | ✅ Ready | Once DB columns added |

---

## 🔴 CRITICAL GAPS - Must Implement

### 1. **RegisterData Interface** (src/app/services/api.ts:L540)
```typescript
// CURRENT:
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  barangay: string;
  role?: "resident" | "admin" | "patrol";
}

// ✅ ALREADY HAS PHONE! But needs validation
```

### 2. **Backend: user_profiles Table** (Migration needed)
```sql
ALTER TABLE user_profiles ADD COLUMN phone TEXT;
ALTER TABLE user_profiles ADD COLUMN verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN id_document_url TEXT;
ALTER TABLE user_profiles ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE user_profiles ADD COLUMN email_verified_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN otp_code TEXT;
ALTER TABLE user_profiles ADD COLUMN otp_created_at TIMESTAMP;
```

### 3. **Backend: Store Phone in Profile** (index.ts:L340)
```typescript
// CURRENTLY NOT STORED - add phone to insert:
const { data: profileData } = await supabase
  .from("user_profiles")
  .insert({
    id: `user_${userId}`,
    auth_user_id: userId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || "",  // ← ADD THIS
    role: userRole,
    barangay: barangay || "",
    avatar,
    points: 0,
    reports: 0,
    verified: false,     // ← NEW
    joined: new Date().toISOString(),
  })
```

### 4. **AuthContext: Include Phone in User Data** (AuthContext.tsx:L30)
```typescript
// ADD TO AuthUser interface:
export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;        // ← ADD
  avatar: string;
  role: UserRole;
  barangay: string;
  verified?: boolean;   // ← ADD
  // ... patrol-specific fields
}

// ADD TO mapSupabaseUser():
return {
  id: user.id,
  first_name: firstName,
  last_name: lastName,
  phone: meta.phone ?? "",              // ← ADD
  avatar: meta.avatar ?? "?",
  role: (meta.role as UserRole) ?? "resident",
  barangay: meta.barangay ?? "",
  verified: meta.verified ?? false,     // ← ADD
  // ...
}
```

### 5. **UpdateProfileMetadata: Store Phone in user_metadata** (index.ts:L317)
```typescript
// In register endpoint, when creating auth user:
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: false,
  user_metadata: {
    first_name: firstName,
    last_name: lastName,
    phone: phone || "",        // ← ADD
    role: userRole,
    barangay: barangay || "",
  },
});
```

### 6. **Frontend: Validate Phone Format**
```typescript
// In RegisterPage.tsx handleNext():
if (step === 1) {
  // Validate PH phone format: 09XX XXX XXXX or +63 9XX XXX XXXX
  const phoneRegex = /^(?:\+63 9|\+639|09)\d{9}$/;
  if (!phoneRegex.test(form.phone.replace(/\s+/g, ''))) {
    setError("Please enter a valid Philippine phone number (09XX XXX XXXX)");
    return;
  }
  // ... rest of validation
}
```

### 7. **ProfilePage: Display Phone Field** (ProfilePage.tsx:L120+)
```typescript
// Add phone display in profile card, after email section:
<div>
  <label className="text-xs font-medium text-gray-500">Phone</label>
  <p className="text-sm text-gray-900">{displayUser.phone || "—"}</p>
</div>
```

### 8. **NewApi Functions Needed** (src/app/services/api.ts)
```typescript
// OTP Verification
export async function verifyOTP(data: {
  userId: string;
  otpCode: string;
}): Promise<ApiResponse<{ verified: boolean }>> {
  return apiFetch<{ verified: boolean }>("/verify-otp", { 
    method: "POST", 
    body: JSON.stringify(data) 
  });
}

// Upload ID Document
export async function uploadIDDocument(data: {
  userId: string;
  file: File;
}): Promise<ApiResponse<{ documentUrl: string }>> {
  const formData = new FormData();
  formData.append("userId", data.userId);
  formData.append("file", data.file);
  return apiFetch<{ documentUrl: string }>("/upload-id", { 
    method: "POST", 
    body: formData 
  });
}
```

### 9. **Backend: New Endpoints Needed** (index.ts)
```typescript
// POST /verify-otp
// POST /upload-id
// POST /resend-otp
// GET /verification-status/:userId
```

---

## 🟢 ALIGNMENT CHECKLIST

### Database Changes
- [ ] Add `phone` column to user_profiles
- [ ] Add `verified` boolean to user_profiles
- [ ] Add `id_document_url` to user_profiles
- [ ] Add `verification_status` enum to user_profiles
- [ ] Add `email_verified_at` timestamp
- [ ] Add `otp_code`, `otp_created_at` for OTP flow

### Backend Changes  
- [ ] Store phone in user_metadata during registration
- [ ] Store phone in user_profiles table
- [ ] Create POST /verify-otp endpoint
- [ ] Create POST /upload-id endpoint  
- [ ] Create POST /resend-otp endpoint
- [ ] Integrate SMS provider (Vonage/Twilio)
- [ ] Integrate Email provider for verification links

### Frontend: RegisterPage
- [ ] ✅ Phone input exists
- [ ] Add phone format validation (09XX XXX XXXX)
- [ ] Implement real ID file upload (Step 2)
- [ ] Implement OTP verification check (Step 3)
- [ ] Call verifyOTP() before completing registration
- [ ] Handle OTP resend flow

### Frontend: AuthContext
- [ ] Add `phone` to AuthUser interface
- [ ] Add `verified` to AuthUser interface
- [ ] Update mapSupabaseUser() to include phone
- [ ] Update mapSupabaseUser() to include verified status

### Frontend: Post-Registration Flow
- [ ] Redirect to verification pending page after register
- [ ] Show verification status in AppLayout
- [ ] Prevent dashboard access if email not verified
- [ ] Handle email verification link clicking

### Frontend: ProfilePage
- [ ] Display phone field
- [ ] Show verification status badge
- [ ] Link to re-submit ID if rejected

### Frontend: AdminDashboard
- [ ] ✅ Verification Queue tab exists
- [ ] Connect to backend for pending approvals
- [ ] Add approve/reject buttons with actions
- [ ] Show ID preview/download

### Frontend: General UI
- [ ] Show verified badge in Header (next to name)
- [ ] Show verification status in Report cards
- [ ] Add unverified user warning banners

---

## 📱 USER FLOW - Complete Journey

```
1. User fills RegisterPage Step 1
   ├─ firstName, lastName, email, password, phone, barangay
   └─ Validation: phone format (09XX XXX XXXX)

2. User continues to Step 2
   ├─ Uploads ID document file
   └─ File sent to backend → stored in Supabase Storage

3. User continues to Step 3
   ├─ Enters OTP from SMS
   └─ Calls verifyOTP() → marks otp_verified

4. Backend creates user (POST /register)
   ├─ Creates Supabase Auth user
   ├─ Stores phone in user_metadata
   ├─ Creates user_profiles row with phone
   ├─ Stores ID document URL
   ├─ Sends OTP via SMS
   ├─ Sends verification email
   └─ Auto-creates leaderboard entry

5. User clicks email verification link
   └─ Sets email_verified_at

6. Admin reviews in AdminDashboard > Verification Queue
   ├─ Views pending IDs
   └─ Approves/Rejects
      └─ Sets verified=true & verification_status='approved'

7. AuthContext updates
   └─ mapSupabaseUser() includes verified flag

8. User can now:
   ✅ Create reports (shows as verified reporter)
   ✅ Climb leaderboard
   ✅ Access all resident features
```

---

## 🎯 PRIORITY ORDER

### Phase 1 - Core (Day 1)
1. Add phone to Database + Backend storage
2. Update AuthContext to include phone
3. Add phone validation in RegisterPage
4. Display phone in ProfilePage

### Phase 2 - File Upload (Day 2)
1. Create ID upload endpoint
2. Implement file upload in RegisterPage Step 2
3. Store document URL in database

### Phase 3 - OTP (Day 2-3)
1. Setup SMS provider (Vonage/Twilio)
2. Create OTP endpoints
3. Implement OTP verification in RegisterPage Step 3

### Phase 4 - Verification (Day 3-4)
1. Email verification flow
2. Admin approval system in AdminDashboard
3. Verification queue backend queries

### Phase 5 - Polish (Day 4+)
1. Verified badges throughout UI
2. Unverified user warnings
3. Error handling & retry flows

