# OTP Expiration Fix - Quick Reference

## What Was Fixed? 🔧

Your OTP was expiring immediately (10-30 seconds) instead of at 15 minutes due to **timestamp timezone mismatch** between local server and database storage.

### Root Cause
```
Code wrote: new Date().toISOString() → Database interpreted with offset → Verification failed ❌
```

## 5 Key Changes Made

### 1. **Clock Skew Tolerance** ⏱️
- Added 30-second buffer to expiration check
- Prevents false "expired" errors from minor time drift
- Formula: `(currentTime - createdTime) > (expiryMinutes × 60 × 1000) + 30000`

### 2. **UTC Timezone Specification** 🌍
- Changed: `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE`
- Files: Migrations 006 & 008
- Ensures database stores in explicit UTC

### 3. **Secure RNG in Local Testing** 🔐
- Changed: `Math.random()` → `crypto.getRandomValues()`
- Makes local server security match production

### 4. **Enhanced Diagnostics** 📊
- Detailed logging shows:
  - Created timestamp (ISO format)
  - Current timestamp (ISO format)
  - Time delta (seconds)
  - Whether expired (true/false)
  - Tolerance window applied

### 5. **Comprehensive Tests** ✅
- 8 new OTP expiry tests
- Covers: immediate OTP, near-expiry, overtime, tolerance edge cases
- Run: `deno test --allow-all test-scenarios.ts --filter "OTP"`

## Before vs After

### Before ❌
```
[Register] Inserting pending registration for user@example.com
[VerifyOTP] OTP expired for user@example.com
Error: OTP has expired. Please request a new code.
(30 seconds later - but claims expired!)
```

### After ✅
```
[Register] Creating OTP for user@example.com | OTP=123456 | Timestamp=2026-04-10T...Z
[VerifyOTP] Found pending OTP | StoredTimestamp=2026-04-10T...Z | ParsedTime=2026-04-10T...Z
[OTP Expiry] created=2026-04-10T...Z now=2026-04-10T...Z diff=5s/15m expired=false (±30s tolerance)
✅ OTP verified successfully
```

## How to Test

### Quick Test (Console Verification)
1. Start local server: `npx ts-node local-server.ts`
2. Look for `[Register]` and `[VerifyOTP]` logs
3. Timestamps should show: `2026-04-10T12:34:56.789Z` format
4. Time delta should show seconds elapsed
5. Should say `expired=false` for recent OTP

### Full Flow Test
1. Register new email on frontend (connected to `localhost:3000`)
2. **Immediately** verify OTP → Should work ✅
3. **Wait 5 minutes** → Verify OTP → Should work ✅
4. **Wait 15 minutes** → Verify OTP → Should fail with "OTP has expired" ⏰
5. **Wait 15:30 (with tolerance)** → Verify OTP → Should fail ⏰

### Automated Test
```bash
cd supabase/functions/make-server-5f514c57
deno test --allow-all test-scenarios.ts --filter "OTP Generation & Expiration"
```

## Files Changed

| File | What Changed | Why |
|------|---|---|
| `otp-generator.ts` | Default 5min→15min, added tolerance, enhanced logging | Fixes core expiration logic |
| `local-server.ts` | Upgraded RNG, detailed logging, timestamp diagnostics | Improves debugging + security |
| `migration 008` | `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE` | Ensures UTC interpretation |
| `migration 006` | `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE` | Ensures UTC interpretation |
| `test-scenarios.ts` | Added 8-test OTP suite | Prevents regression |

## Troubleshooting

### Still Seeing "OTP Expired" After Fix?

**Check 1: System Clock**
```typescript
console.log(new Date().toLocaleString());
// Should show current time in your timezone
```

**Check 2: Database Timezone**
- Login to Supabase dashboard
- Go to SQL Editor
- Run: `SHOW timezone;`
- Should return: `UTC` or `Etc/UTC`

**Check 3: Console Logs**
- Look for `[OTP Expiry]` logs
- If showing `diff=14500s/15m expired=false` but later `expired=true` within seconds → clock issue

**Check 4: System Timezone**
```typescript
console.log(new Date().getTimezoneOffset());
// -480 = UTC-8 (Asia/Manila - Philippines)
// 0 = UTC
```

## Common Scenarios Now Fixed

| Scenario | Before | After |
|---|---|---|
| Register, immediately verify | ❌ Expired | ✅ Works |
| Register, wait 5 min, verify | ❌ Expired | ✅ Works |
| Register, wait 15 min, verify | ❌ Works (inconsistent) | ✅ Still works (within tolerance) |
| Register, wait 15:31, verify | ❌ Sometimes works | ✅ Fails correctly |
| Minor clock drift (±30s) | ❌ "Expired" error | ✅ Still works |

## Documentation

See [OTP_FIX_SUMMARY.md](OTP_FIX_SUMMARY.md) for:
- Detailed implementation notes
- Complete code changes
- Common OTP mistakes & patterns
- Migration path
- Production deployment steps

---

## Next Steps

1. **Test locally** using the flow above
2. **Monitor logs** in local-server console
3. **Report results** if still experiencing issues
4. **Deploy** to production when working locally

**Status**: ✅ Implementation complete, ready for testing
