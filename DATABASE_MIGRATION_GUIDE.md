# Database Migration Guide for Patrol System

## Overview

This guide covers the database migration needed to activate the patrol system features including:
- Patrol role integration with reports
- Real-time subscriptions for patrol comments and status updates
- Admin-to-patrol assignment workflow
- Ticket tracking for residents

---

## Migration File

**Location**: `/supabase/migrations/012_add_patrol_report_integration.sql`

This migration adds:

1. **New Columns to `reports` table**:
   - `ticket_id` - Unique ticket identifier for tracking (e.g., TKT-2026-001)
   - `patrol_assigned_to` - Foreign key to patrol officer (user_id)
   - `patrol_status` - Status of patrol handling (pending, in_progress, completed, escalated)
   - `patrol_acknowledged_at` - Timestamp when patrol officer acknowledged

2. **New `patrol_assignments` Table**:
   - Tracks admin assignments to patrol officers
   - Fields: id, report_id, assigned_patrol_id, assigned_by_admin_id, status, assigned_at, updated_at
   - Indexes for fast lookups

3. **New `patrol_comments` Table**:
   - Real-time updates between admins, patrol, and residents
   - Published for Supabase subscriptions
   - Fields: id, report_id, author_id, author_role, comment_text, created_at, updated_at

4. **Row-Level Security (RLS) Policies**:
   - Admins can view all data
   - Patrol officers see their assigned reports and comments
   - Residents see comments and patrol status on their reports only

5. **Real-time Publication**:
   - `patrol_comments` table set to publish for real-time subscriptions
   - Enables instant updates across connected clients

---

## How to Apply the Migration

### Method 1: Using Supabase CLI (Recommended)

```bash
# From project root
cd supabase

# Apply the migration
supabase db push

# You'll be prompted to confirm environmental changes
# Answer "y" to any prompts
```

### Method 2: Using Supabase Dashboard

1. **Go to SQL Editor** in Supabase Dashboard
2. **Create new query** or **Upload SQL file**
3. **Copy and paste** the contents of `supabase/migrations/012_add_patrol_report_integration.sql`
4. **Run query**
5. **Verify** that all tables and policies were created

### Method 3: Using psql (Direct Database Connection)

```bash
# Connect to Supabase PostgreSQL
psql "postgresql://[username]:[password]@[host]:5432/postgres"

# Run migration file
\i supabase/migrations/012_add_patrol_report_integration.sql

# Verify tables were created
\dt  # List all tables
\d patrol_assignments  # View patrol_assignments structure
\d patrol_comments  # View patrol_comments structure
```

---

## Verification Steps

After applying the migration, verify everything was created correctly:

### 1. Check New Columns on `reports` Table

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='reports' 
ORDER BY column_name;
```

**Expected new columns**:
- `ticket_id` (text) - unique
- `patrol_assigned_to` (uuid) - FK to user_id
- `patrol_status` (text) - enum: pending, in_progress, completed, escalated
- `patrol_acknowledged_at` (timestamp)

### 2. Verify New Tables Exist

```sql
-- Check patrol_assignments table
\d patrol_assignments

-- Check patrol_comments table
\d patrol_comments
```

**Expected output**: Table structure with all columns, indexes, and constraints

### 3. Verify Indexes

```sql
-- List all indexes on patrol tables
SELECT indexname FROM pg_indexes WHERE tablename IN ('patrol_assignments', 'patrol_comments');
```

**Expected indexes**:
- `patrol_assignments_report_id_idx`
- `patrol_assignments_patrol_id_idx`
- `patrol_comments_report_id_idx`
- `patrol_comments_author_id_idx`

### 4. Verify RLS Policies

```sql
-- Check policies on patrol_assignments
SELECT policyname, qual, with_check FROM pg_policies 
WHERE tablename='patrol_assignments';

-- Check policies on patrol_comments  
SELECT policyname, qual, with_check FROM pg_policies 
WHERE tablename='patrol_comments';
```

**Expected policies**:
- Admin can view/insert/update/delete all
- Patrol can view/insert their own records
- Residents can view comments on their reports

### 5. Verify Realtime is Published

```sql
-- Check if patrol_comments is published to realtime
SELECT schemaname, tablename FROM pg_publication_tables 
WHERE pubname='supabase_realtime' 
AND tablename='patrol_comments';
```

---

## Migration Rollback (If Needed)

If something goes wrong, you can rollback the migration:

```bash
# Using CLI
supabase db reset

# Or via SQL
DROP TABLE IF EXISTS patrol_comments CASCADE;
DROP TABLE IF EXISTS patrol_assignments CASCADE;
ALTER TABLE reports DROP COLUMN IF EXISTS ticket_id;
ALTER TABLE reports DROP COLUMN IF EXISTS patrol_assigned_to;
ALTER TABLE reports DROP COLUMN IF EXISTS patrol_status;
ALTER TABLE reports DROP COLUMN IF EXISTS patrol_acknowledged_at;
```

---

## Post-Migration Steps

After successful migration:

1. **Restart Backend**: Redeploy the Supabase function
   ```bash
   supabase functions deploy make-server-5f514c57
   ```

2. **Verify API Endpoints**: Test the patrol endpoints
   ```bash
   # Test promotion endpoint
   curl -X POST http://localhost:54321/functions/v1/make-server-5f514c57/admin/promote-to-patrol \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user-uuid",
       "unit": "Unit 1",
       "badgeNumber": "PNP-001",
       "rank": "Police Officer 1",
       "shiftStart": "08:00",
       "shiftEnd": "17:00"
     }'
   ```

3. **Clear Application Cache**: Clear browser cache and restart the frontend
   ```bash
   # If using Vite
   npm run dev
   ```

4. **Test End-to-End Workflow**:
   - Register as resident
   - Admin approves registration
   - Admin promotes to patrol via PromoteToPatrolModal
   - Promoted user logs in and switches to Patrol Mode
   - Verify patrol dashboard shows reports

---

## Common Issues & Troubleshooting

### Issue: "Column already exists" Error

**Cause**: Migration was already applied

**Solution**: Skip this migration or check if you're applying to different database

### Issue: "Permission denied" for RLS Policy

**Cause**: Not connected as admin/owner user

**Solution**: Use Supabase Dashboard or connect as service role user

### Issue: Realtime subscription not working

**Cause**: Table not published to `supabase_realtime`

**Solution**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_comments;
```

### Issue: Foreign key constraint violations

**Cause**: Attempting to insert patrol_assigned_to for non-existent user

**Solution**: Ensure user exists in `user_profiles` before assigning

---

## Schema Details

### `patrol_assignments` Table
```sql
CREATE TABLE patrol_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  assigned_patrol_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_by_admin_id UUID NOT NULL REFERENCES user_profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  assigned_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `patrol_comments` Table
```sql
CREATE TABLE patrol_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'patrol', 'resident')),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Updated `reports` Table Columns
```sql
-- Newly added columns:
ALTER TABLE reports ADD COLUMN ticket_id TEXT UNIQUE;
ALTER TABLE reports ADD COLUMN patrol_assigned_to UUID REFERENCES user_profiles(id);
ALTER TABLE reports ADD COLUMN patrol_status TEXT DEFAULT 'pending' CHECK (patrol_status IN ('pending', 'in_progress', 'completed', 'escalated'));
ALTER TABLE reports ADD COLUMN patrol_acknowledged_at TIMESTAMP;

-- Index for fast lookups
CREATE INDEX reports_patrol_assigned_to_idx ON reports(patrol_assigned_to);
CREATE INDEX reports_patrol_status_idx ON reports(patrol_status);
CREATE INDEX reports_ticket_id_idx ON reports(ticket_id);
```

---

## Success Criteria

✅ All new columns appear in `reports` table  
✅ `patrol_assignments` table exists with correct structure  
✅ `patrol_comments` table exists with correct structure  
✅ RLS policies are applied  
✅ Indexes are created  
✅ Real-time publication is active  
✅ API endpoint `/admin/promote-to-patrol` works  
✅ UI allows admins to promote residents to patrol  
✅ Patrol officers can switch to patrol mode after promotion  

---

## Next Steps

After migration is verified:

1. **Test Patrol Workflows**: Complete end-to-end testing scenarios
2. **Monitor Performance**: Check query performance with new indexes
3. **Deploy to Production**: Apply same migration to production database
4. **Archive Old Data**: If migrating from old system, transfer data if needed
5. **Notify Users**: Let admins and patrol officers know feature is live

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Real-time Subscriptions**: https://supabase.com/docs/guides/realtime
- **Migration Guide**: https://supabase.com/docs/guides/database/migrations

For questions, refer to the main `README.md` in the project root.
