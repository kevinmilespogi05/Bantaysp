# Create Admin Account Guide

## Option 1: Automated Script (Recommended)

### Step 1: Get Your Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project **Bantay SP**
3. Go to **Settings** → **API**
4. Copy the **Service Role Key** (keep this secret!)

### Step 2: Create .env.local file

Create a file called `.env.local` in your project root (same level as package.json):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://jgmwskkgzfyjbnwpqpfj.supabase.co
```

Replace `your_service_role_key_here` with the actual key from Step 1.

### Step 3: Run the Script

```bash
npx ts-node create-admin.ts
```

**Expected Output**:
```
🔐 Creating admin account...

📝 Step 1: Creating auth user (admin@bantaysp.com)...
✅ Auth user created: [uuid-here]

📝 Step 2: Creating user profile...
✅ User profile created

✅ Admin account created successfully!

📋 Account Details:
   Email:    admin@bantaysp.com
   Password: Admin@123456
   Role:     admin
   Name:     Admin User
   User ID:  [uuid-here]

🔒 IMPORTANT: Change the password after first login!

🌐 You can now login at: http://localhost:5173/login
```

### Step 4: Login

1. Go to http://localhost:5173/login
2. Email: `admin@bantaysp.com`
3. Password: `Admin@123456`
4. Click "Sign in"

### Step 5: (IMPORTANT) Change Password

After logging in:
1. Go to your profile settings
2. Change the default password to something secure
3. Never share the initial credentials

---

## Option 2: Manual - Supabase Dashboard SQL

If you prefer to create the admin manually:

### Step 1: Create Auth User

Go to Supabase Dashboard → **Auth** → Click **Users** → **Add user**

```
Email: admin@bantaysp.com
Password: Admin@123456
Confirm Password: Admin@123456
Confirm Email: ✅ (checked)
```

### Step 2: Copy the User ID

After creating, copy the user ID (UUID format)

### Step 3: Create User Profile

Go to **SQL Editor** and run:

```sql
INSERT INTO user_profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  barangay,
  avatar,
  verified,
  email_verified,
  points,
  reports,
  joined
) VALUES (
  'PASTE_USER_ID_HERE', -- Replace with the UUID from Step 2
  'Admin',
  'User',
  'admin@bantaysp.com',
  'admin',
  'Central',
  'AU',
  true,
  true,
  0,
  0,
  now()
);
```

---

## Option 3: Custom Credentials

Want to use different email/password? Edit `create-admin.ts`:

```typescript
// Change these values:
const ADMIN_EMAIL = "your@email.com";
const ADMIN_PASSWORD = "YourPassword123!";
const ADMIN_FIRST_NAME = "Your";
const ADMIN_LAST_NAME = "Name";
```

Then run the script again.

---

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY environment variable not set"

- Make sure you created `.env.local` file in project root
- Make sure you copied the correct Service Role Key from Supabase
- Restart your terminal/VS Code

### Error: "User already exists"

- The admin email already exists in your Supabase project
- Either:
  1. Use a different email in `create-admin.ts`
  2. Delete the existing user first in Supabase → Auth → Users
  3. Delete the user profile from the database

### Error: "Cannot connect to Supabase"

- Check your VITE_SUPABASE_URL is correct
- Make sure you're using the correct project
- Check your internet connection

### I forgot the admin password

- Option 1: Supabase Dashboard → Auth → Users → Click on user → "Reset password"
- Option 2: Delete the user and run the script again with new credentials

---

## Security Best Practices

⚠️ **IMPORTANT**:

1. **Change the default password** after first login
2. **Never commit** `.env.local` to git (add to `.gitignore`)
3. **Keep your Service Role Key secret** - it has unlimited database access
4. **Use strong passwords** for production admins
5. **Periodically audit** who has admin access

---

## What the Script Does

1. ✅ Creates auth user via Supabase Admin API
2. ✅ Auto-confirms email (no verification needed)
3. ✅ Creates user_profiles entry with admin role
4. ✅ Skips pending_verification (admins bypass verification)
5. ✅ Marks user as verified immediately
6. ✅ Returns clear success message

---

## Next Steps

After creating admin account:

1. **Login** with admin credentials
2. **Review pending users** in the pending_verification table
3. **Create admin endpoints** to approve/reject users
4. **Build admin dashboard** for user management

---

## Need Help?

- Check `.env.local` exists and has correct values
- Verify Service Role Key is correct
- Ensure TypeScript dependencies are installed (`npm install`)
- Check terminal for detailed error messages
