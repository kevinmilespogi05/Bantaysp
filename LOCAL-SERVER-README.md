# Local Registration Server

This is a local development server that replicates the Edge Function registration endpoints for easy debugging.

## Setup

### 1. Install Dependencies (One-time)

```powershell
npm install express cors @supabase/supabase-js ts-node typescript @types/express @types/node --save-dev
```

### 2. Create `.env.local` File

Create `c:\Users\kevin\Desktop\develop\Bantaysp\.env.local` with your credentials:

```
SUPABASE_URL=https://cepefukwfszkgosnjmbc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
BREVO_API_KEY=your_brevo_api_key_here
```

**Where to find these:**
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → Service Role Key (⚠️ Never commit this!)
- `BREVO_API_KEY`: Brevo Dashboard → SMTP & API → API Key

### 3. Run the Server

#### Option A: Windows PowerShell
```powershell
.\run-local-server.bat
```

#### Option B: Windows Command Prompt
```cmd
run-local-server.bat
```

#### Option C: Direct node command
```powershell
npx ts-node local-server.ts
```

You should see:
```
🚀 Local registration server running at http://localhost:3000

Endpoints:
  POST   http://localhost:3000/register
  POST   http://localhost:3000/verify-otp
  POST   http://localhost:3000/resend-otp
  GET    http://localhost:3000/health
```

## Update Frontend to Use Local Server

**Option 1: Change API_BASE_URL in development**

In `src/app/services/api.ts`, update:

```typescript
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000'
  : `https://${projectId}.supabase.co/functions/v1/make-server-5f514c57`;
```

**Option 2: Use environment variable**

Create `.env.local` in your React app root:
```
VITE_API_BASE_URL=http://localhost:3000
```

Then in `api.ts`:
```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || `https://${projectId}.supabase.co/functions/v1/make-server-5f514c57`;
```

## Testing Flow

### Step 1: Register
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "email": "test@example.com",
    "password": "password123",
    "barangay": "Brgy. San Pablo"
  }'
```

Response:
```json
{
  "email": "test@example.com",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "role": "resident",
  "message": "Email sent with OTP code..."
}
```

**Check database:**
```sql
SELECT * FROM pending_registrations WHERE email = 'test@example.com';
```

You should see a row with `otp_code` and `otp_created_at`.

### Step 2: Upload ID (Frontend only)
This happens on the frontend with Cloudinary. No server call needed.

### Step 3: Verify OTP
```bash
curl -X POST http://localhost:3000/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "idPhotoUrl": "https://cloudinary.com/image.jpg"
  }'
```

Response (on success):
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "message": "Registration completed! Your ID is pending admin review."
}
```

**Check database:**
```sql
-- pending_registrations should be deleted
SELECT COUNT(*) FROM pending_registrations WHERE email = 'test@example.com'; -- Should be 0

-- user_profiles should have new entry
SELECT * FROM user_profiles WHERE email = 'test@example.com';
```

## Troubleshooting

### "Cannot find module 'express'"
Install dependencies:
```powershell
npm install express cors @supabase/supabase-js ts-node typescript @types/express @types/node
```

### "SUPABASE_SERVICE_ROLE_KEY not found"
Make sure `.env.local` exists in the project root with the correct key.

### "Pending registration lookup error"
- Make sure Migration 008 ran: Check `SELECT * FROM pending_registrations;` in Supabase SQL
- Make sure you called `/register` first with that email

### "Email send failed"
- Check `BREVO_API_KEY` in `.env.local`
- Verify it's the correct full API key from Brevo dashboard

## Debugging

The server logs every step:
- ✅ Success messages (green/blue text)
- ❌ Error messages with full stack traces (red text)
- 📝 Operation details

All logs appear in the terminal where the server is running.

## When It Works

Once the local server works perfectly with all three endpoints:

1. Copy the working code back to `supabase/functions/make-server-5f514c57/index.ts`
2. Test in prod Edge Function
3. Update frontend to use production URL

Then stay on production for real users.
