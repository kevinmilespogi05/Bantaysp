# Patrol Workflow Revision - Implementation Summary

## Overview
This document outlines the revised patrol case management workflow implemented in Bantaysp. The workflow provides a clear, trackable lifecycle of reports with proper status updates and patrol accountability.

---

## Workflow Lifecycle

### 1. **Initial Status: "approved"**
- **When:** Admin verifies and approves a report
- **Database Update:** `status = "approved"`, `patrol_assigned_to = NULL`
- **UI State:** "Pending" - Case available in patrol queue
- **Next Step:** Patrol officer accepts the case

### 2. **Patrol Accepts Case: "accepted"**
- **When:** Patrol officer clicks "Accept This Case"
- **Endpoint:** `POST /patrol/cases/:id/accept`
- **Database Updates:**
  - `status = "accepted"`
  - `patrol_assigned_to = [patrol_id]`
  - `resolved_by = [patrol_id]`
- **UI State:** "Accepted" - Shows "Navigate" and "In Progress" buttons
- **Validation:** Only 1 active case per patrol (prevents multiple simultaneous acceptances)
- **Next Step:** Patrol officer clicks "Mark as In Progress"

### 3. **Mark as In Progress: "in_progress"**
- **When:** Patrol officer clicks "In Progress" button
- **Endpoint:** `POST /patrol/cases/:id/start-responding`
- **Database Update:** `status = "in_progress"`
- **UI State:** "Responding" - Shows "Mark as Resolved" button
- **Validation:** Report must be in "accepted" status
- **Next Step:** Patrol officer resolves the case

### 4. **Mark as Resolved: "resolved"**
- **When:** Patrol officer clicks "Mark as Resolved" and submits modal
- **Endpoint:** `POST /patrol/history`
- **Modal Requirements:**
  - 📷 **Photo Evidence** (required) - Captures scene documentation
  - 📝 **Resolution Notes** (optional) - Officer's comments on resolution
- **Database Updates:**
  - `status = "resolved"`
  - `resolved_by = [patrol_id]`
  - `resolved_at = [current_timestamp]`
  - `resolution_evidence_url = [evidence_url]`
  - `resolution_notes = [notes_text]`
- **Points Awarded:** +25 points to patrol officer
- **UI State:** "Done" - Shows confirmation screen with "View History" and "Next Case" buttons
- **Validation:** Photo evidence is required; endpoint returns error if missing
- **Final Step:** Case added to patrol's history

---

## Database Schema Changes

### New Columns Added to `reports` Table
```sql
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS resolution_evidence_url TEXT;
```

### Updated Status Values
```sql
ALTER TABLE public.reports
ADD CONSTRAINT reports_status_check 
  CHECK (status IN (
    'pending_verification',  -- Initial pending state
    'approved',              -- Admin verified
    'accepted',              -- Patrol assigned
    'in_progress',           -- Patrol actively responding
    'resolved',              -- Case closed
    'rejected'               -- Dismissed
  ));
```

---

## Backend Endpoints

### POST `/patrol/cases/:id/accept` - Accept a Case
**Flow:**
1. Validates patrol is authenticated
2. Checks for existing active cases (status: "accepted" OR "in_progress")
3. Returns error if patrol already has 1 active case
4. Retrieves report and verifies it's in "approved" status
5. Updates report: `status = "accepted"`, `patrol_assigned_to = [patrol_id]`

**Request Body:**
```json
{ }
```

**Response:**
```json
{
  "success": true,
  "message": "Case accepted, patrol officer assigned",
  "report": { /* updated report object */ }
}
```

**Error Examples:**
- `"You can only handle 1 case at a time. You currently have 1 active case. Please complete or cancel it first."`
- `"Report must be approved before patrol can accept it. Current status: [status]"`

---

### POST `/patrol/cases/:id/start-responding` - Mark as In Progress
**Flow:**
1. Validates patrol is authenticated
2. Retrieves report
3. Verifies report is assigned to this patrol
4. Verifies report is in "accepted" status
5. Updates report: `status = "in_progress"`

**Request Body:**
```json
{ }
```

**Response:**
```json
{
  "success": true,
  "message": "Case marked as in_progress",
  "report": { /* updated report object */ }
}
```

---

### POST `/patrol/history` - Resolve Case with Evidence
**Flow:**
1. Validates patrol is authenticated
2. Retrieves report
3. Verifies report is in "in_progress" status
4. **Validates photo evidence URL is provided** (required field)
5. Updates report with resolution data and evidence
6. Awards 25 points to patrol officer

**Request Body:**
```json
{
  "caseId": "REP-2026-00001",
  "resolutionNotes": "Scene secured, offender apprehended",
  "evidenceUrl": "REP-2026-00001_evidence_1713283200000.jpg",
  "category": "Crime"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Case marked as resolved with evidence",
  "report": { /* updated report object with resolved status */ }
}
```

**Error Examples:**
- `"Photo evidence is required to resolve a case"` - No evidence URL provided
- `"Report must be in_progress before marking as resolved. Current status: [status]"`

---

### GET `/patrol/active-case` - Fetch Active Case
**Flow:**
1. Gets patrol officer ID from authentication token
2. Queries for active cases with status in ["accepted", "in_progress"]
3. Returns the active case or null

**Response:**
```json
{
  "id": "REP-2026-00007",
  "title": "Suspicious Activity",
  "status": "accepted",
  "location": "Ablao Street",
  "distance": "250m",
  ...
}
```

---

## Frontend Component Updates

### PatrolCaseDetail.tsx Status Sync
```typescript
// Status mapping from database to UI
const dbStatus = report.status;
if (dbStatus === "in_progress") {
  setStatus("in_progress");  // UI: "Responding"
} else if (dbStatus === "resolved") {
  setStatus("resolved");      // UI: "Done"
} else if (dbStatus === "accepted") {
  setStatus("accepted");      // UI: "Accepted"
} else if (dbStatus === "approved") {
  setStatus("pending");       // UI: "Pending" (no patrol assigned yet)
} else if (dbStatus === "pending_verification") {
  setStatus("pending");
}
```

### Resolution Modal
```typescript
// Modal shows:
// - Photo capture button (required)
// - Resolution notes textarea (optional)
// - Submit button (disabled until photo captured)

const submitResolution = async () => {
  const evidenceUrl = `${id}_evidence_${timestamp}.jpg`;
  const response = await resolvePatrolCase(
    id, 
    resNotes,           // resolution notes
    evidenceUrl,        // evidence URL
    report?.category
  );
};
```

---

## Status Visualization

### Response Status Tracker
The UI displays a 4-step progress tracker:
1. **Queued** - pending_verification/approved (no patrol assigned)
2. **Accepted** - accepted (patrol assigned, awaiting response)
3. **Responding** - in_progress (actively handling case)
4. **Done** - resolved (case closed)

```
[1] Queued ─────── [2] Accepted ─────── [3] Responding ─────── [4] Done
     ✓                  ✓                     ✓
```

---

## Patrol History Tracking

### What Gets Added to Patrol History
When a case reaches "resolved" status:
- Report ID and title
- Resolution timestamp
- Patrol officer details
- Resolution notes
- Evidence URL
- Points awarded (+25)

### API: GET `/patrol/history`
Returns all resolved cases handled by the patrol officer with full details including evidence URLs and resolution notes.

---

## Points System Integration

| Event | Points | When |
|-------|--------|------|
| Admin approves report | +50 | POST `/admin/reports/:id/approve` |
| Patrol resolves case | +25 | POST `/patrol/history` (evidence required) |

---

## Cancel/Revert Flow

### POST `/patrol/cases/:id/cancel` - Cancel/Unassign Case
When a patrol cancels a case before resolving:
- Status reset to "approved"
- Patrol assignment cleared (`patrol_assigned_to = NULL`)
- Case returns to available queue for other patrols
- Allows case reuse

---

## Validation Rules

### Acceptance Validation
- ✅ Patrol must be authenticated
- ✅ Patrol cannot have more than 1 active case (status: "accepted" OR "in_progress")
- ✅ Report must be in "approved" status

### In-Progress Validation
- ✅ Patrol must be authenticated
- ✅ Case must be assigned to this patrol
- ✅ Report must be in "accepted" status

### Resolution Validation
- ✅ Patrol must be authenticated
- ✅ Report must be in "in_progress" status
- ✅ **Photo evidence URL must be provided (required)**
- ✅ Resolution notes optional

---

## Success Indicators

### Frontend
1. ✅ Active case displays on patrol dashboard
2. ✅ Status tracker shows correct progress
3. ✅ Buttons enable/disable based on current status
4. ✅ Resolution modal requires photo before submit
5. ✅ Confirmation screen shows on successful resolution
6. ✅ Case appears in patrol history

### Backend
1. ✅ Database records updated with correct status and timestamps
2. ✅ Evidence URL stored for case review
3. ✅ Patrol officer awarded 25 points
4. ✅ Case prevented from being accepted by multiple patrols
5. ✅ Single active case limit enforced

---

## Testing Checklist

- [ ] Admin approves report → Status becomes "approved"
- [ ] Patrol accepts case → Status becomes "accepted", patrol dashboard shows active case
- [ ] Patrol cannot accept 2nd case → Returns "already have 1 active case" error
- [ ] Patrol clicks "In Progress" → Status becomes "in_progress"
- [ ] Patrol opens resolution modal → Photo capture required
- [ ] Patrol submits resolution without photo → Error: "Photo evidence is required"
- [ ] Patrol submits with photo + notes → Status becomes "resolved", patrol awarded 25 points
- [ ] Resolved case appears in patrol history
- [ ] Patrol can accept new case after resolution
- [ ] Cancel button resets case to "approved" for reuse

---

## Related Files Modified

**Backend:**
- `local-server.ts` - Updated patrol endpoints for new workflow
  - `/patrol/cases/:id/accept` - Set status to "accepted"
  - `/patrol/cases/:id/start-responding` - Validate "accepted" status
  - `/patrol/history` - Accept and validate evidence URL, resolution notes
  - `/patrol/active-case` - Check for "accepted" and "in_progress" statuses

**Database:**
- `supabase/migrations/017_patrol_workflow_revision.sql` - New migration for columns and constraints

**Frontend:**
- `src/app/services/api.ts` - Updated `resolvePatrolCase()` to accept evidence URL
- `src/app/pages/patrol/PatrolCaseDetail.tsx` - Status sync mapping and resolution modal logic
