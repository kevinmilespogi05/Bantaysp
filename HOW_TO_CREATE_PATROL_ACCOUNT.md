# How to Create a Patrol Account in Bantaysp

## Overview

Patrol accounts are **created and managed by Admins only**. Residents cannot self-register as patrol officers.

---

## Step-by-Step Process

### Phase 1: User Registers as Resident (Public)

1. **User navigates to** `/register`
2. **Fills out form:**
   - First Name, Last Name
   - Email, Password (min 6 chars)
   - Phone number, Barangay
3. **Uploads ID document** for verification
4. **Verifies OTP** sent to email
5. **Result**: User account created with role = **"resident"** (pending admin approval)

---

### Phase 2: Admin Approves Resident (Admin Dashboard)

1. **Admin logs in** and goes to **Admin Dashboard** → **Verification Queue**
2. **Reviews pending user:**
   - View ID document
   - Check barangay assignment
3. **Clicks "Approve"** or "Reject"
4. **Result**: Approved users move to "Users" tab with status = **"Verified"**

---

### Phase 3: Admin Promotes Resident to Patrol (NEW - Admin Dashboard)

1. **Admin goes to** **Admin Dashboard** → **Users tab**
2. **Finds the resident** in the user list
3. **Clicks the blue icon** (👮 icon = promote button) in the Actions column
   - *(Button is disabled for non-resident users)*
4. **PromoteToPatrolModal opens** with form:
   - **Patrol Unit** (required) - e.g., "Unit 3 - Alpha"
   - **Badge Number** (required) - e.g., "PNP-8821"
   - **Rank** (dropdown) - select from: Police Officer 1-3, Senior Police Officer, Inspector, Sergeant
   - **Shift Start** (time picker) - e.g., 08:00
   - **Shift End** (time picker) - e.g., 17:00
5. **Fills in patrol details** and clicks **"Promote"**
6. **Result:** User role updated to **"patrol"**, can now:
   - Log in and access patrol dashboard
   - Switch between Resident and Patrol modes
   - Handle assigned reports
   - Self-assign available reports

---

## UI Screenshots / Locations

### Promotion Button Location
- **Path**: `/app/admin` → Users Tab
- **Visual**: User list table, last column "Actions"
- **Icon**: Blue icon (only for residents) - click to promote
- **Disabled**: Grayed out for admins/patrol officers

### Promote Modal
- **Title**: "Promote to Patrol Officer"
- **Fields**:
  ```
  ┌─ Patrol Unit *    [___________]
  ├─ Badge Number *   [___________]
  ├─ Rank             [Dropdown ▼]
  ├─ Shift Start      [08:00  ]
  ├─ Shift End        [17:00  ]
  └─ [Cancel] [Promote]
  ```

---

## What Happens After Promotion?

### User's New Permissions
✅ Can access **Patrol Dashboard** at `/app/patrol/dashboard`
✅ Can **toggle mode** between Resident and Patrol (navbar button)
✅ Can **view assigned reports** (admin-assigned queue)
✅ Can **self-assign available reports** (available queue)
✅ Can **update report status** (in progress, completed, escalated)
✅ Can **add comments/updates** to reports (real-time for residents & admin)
✅ Can **view map of incidents** and report locations

### User's Previous Role Remains
⚠️ User **cannot simultaneously** be resident + patrol + admin
⚠️ Promotion changes role from "resident" to "patrol"
⚠️ To change back, database update needed (or future UI)

---

## Technical Details (For Developers)

### Database Changes
When a resident is promoted to patrol, these updates occur:

**user_profiles table:**
```sql
UPDATE user_profiles 
SET role = 'patrol', updated_at = NOW()
WHERE id = '{user_id}';
```

### Stored Data
Patrol metadata is stored in the `bio` field as JSON:
```json
{
  "unit": "Unit 3 - Alpha",
  "badgeNumber": "PNP-8821",
  "rank": "Police Officer 1",
  "shiftStart": "08:00",
  "shiftEnd": "17:00"
}
```

### Future Enhancement (Recommended)
Create a dedicated `patrol_officers` table:
```sql
CREATE TABLE patrol_officers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  user_id TEXT REFERENCES user_profiles(id),
  unit TEXT NOT NULL,
  badge_number TEXT NOT NULL,
  rank TEXT NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  status TEXT DEFAULT 'on_duty', -- on_duty, off_duty, on_leave
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Common Questions

### Q: Can a user promote themselves to patrol?
**A**: No. Only admins can promote users to patrol through the Admin Dashboard.

### Q: Can I promote an admin to patrol?
**A**: No. The modal button is disabled for non-resident users. Admins remain admins.

### Q: What if I promote someone by mistake?
**A**: Currently requires manual database update to revert. Future UI enhancement could add "Demote" button.

### Q: Does a patrol officer get notification?
**A**: No auto-notification yet. Admin should inform them separately (email, SMS, in-app message).

### Q: Can patrol operators switch back to resident mode?
**A**: Yes! They see a mode switcher in the navbar and can toggle freely between modes.

### Q: What data does a patrol officer see?
**A**: 
- Reports from their assigned barangay
- Admin-assigned reports
- Available reports to self-assign
- Comments and updates (real-time)
- Map view of incidents
- Patrol history and statistics

---

## API Endpoints (For Backend Developers)

If implementing a backend API for promotion:

```typescript
// Backend endpoint to add:
POST /admin/promote-to-patrol

Request body:
{
  userId: string;                    // UUID of resident to promote
  unit: string;                      // "Unit 3 - Alpha"
  badgeNumber: string;               // "PNP-8821"  
  rank: string;                      // "Police Officer 1"
  shiftStart: string;                // "08:00" (24-hour format)
  shiftEnd: string;                  // "17:00"
}

Response:
{
  success: boolean;
  message: string;
  patrolOfficerId: string;           // UUID of promoted user
  role: "patrol";
}

Errors:
- 401: Not authorized (caller is not admin)
- 404: User not found
- 400: User is not a resident
- 500: Database error
```

---

## Security Considerations

✅ **Only admins can promote** - RLS policies enforce this
✅ **Role stored securely** - in user_profiles table with proper indexes
✅ **Audit trail** - `updated_at` timestamp and admin ID should be logged
✅ **No public endpoints** - promotion only via authenticated admin

⚠️ **Recommended improvements**:
- Add `promoted_by_admin_id` column to track who promoted them
- Add `promoted_at` timestamp
- Implement audit logging for all role changes
- Add notification system to notify promoted user

---

## Troubleshooting

### Issue: Promote button not showing
**Solution**: 
- ✓ Make sure you're logged in as admin
- ✓ Make sure user role is "resident" (not admin/patrol)
- ✓ Refresh the page if just approved user

### Issue: Promotion fails with error
**Solution**:
- ✓ Check all form fields are filled (unit & badge are required)
- ✓ Check you're not in read-only mode
- ✓ Try again or report error

### Issue: Promoted user can't see patrol dashboard
**Solution**:
- ✓ Ask them to log out and back in
- ✓ Check database: `SELECT role FROM user_profiles WHERE id = '...'` should be 'patrol'
- ✓ Check browser cache (clear and refresh)

---

## Next Steps

After promoting a patrol officer:

1. **Notify them** - Email or in-app message with login details
2. **Set their availability** - Confirm their shift start/end times
3. **Assign initial reports** - Use Admin Dashboard → Reports → Assign to Patrol
4. **Test the flow** - Have them log in and navigate to patrol dashboard
5. **Monitor their activity** - Use Admin Dashboard → Patrol Monitoring to track cases

---

## Summary

| Step | Who | Where | Action |
|------|-----|-------|--------|
| 1 | User | Registration page | Sign up as resident |
| 2 | Admin | Verification queue | Approve resident |
| 3 | Admin | Users tab | Promote to patrol |
| 4 | User | Patrol dashboard | Handle assigned tasks |

🎉 **Patrol account now active!**
