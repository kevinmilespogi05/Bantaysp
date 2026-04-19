# Priority Removal - Implementation Checklist

## Quick Reference: What to Remove

### Config Objects to Delete
```typescript
// PatrolAssignedReports.tsx - Lines 20-26
const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const priorityConfig = { ... }

// PatrolCaseDetail.tsx - Lines 14-18
const priorityConfig = { ... }

// PatrolDashboard.tsx - Lines 32-37
const priorityConfig = { ... }

// PatrolHistory.tsx - Lines 12-16
const priorityConfig = { ... }

// AdminPatrolMonitoring.tsx - Lines 36-41
const PRIORITY_COLOR = { ... }
const PRIORITY_BG = { ... }

// DashboardPage.tsx - Line 72
const priorityDot = { ... }
```

### UI Elements to Remove

#### Priority Badges
- PatrolAssignedReports.tsx: Lines 111-113 (priority badge span)
- PatrolDashboard.tsx: Lines 200-203 (priority badge in active case)
- PatrolHistory.tsx: Lines 136-139 (priority badge in history)

#### Priority Dots
- PatrolHistory.tsx: Lines 107-110 (priority dot icon)
- DashboardPage.tsx: Lines 341-343 (priority dot in reports list)

#### Priority Strips/Headers
- PatrolCaseDetail.tsx: Lines 277-304 (entire priority strip section)
- PatrolDashboard.tsx: Lines 183-189 (priority-based styling)
- AdminPatrolMonitoring.tsx: Lines 410-425 (priority range circles)

### Sort/Filter Logic to Modify

#### PatrolAssignedReports.tsx - Lines 68, 89-91, 195-201
**BEFORE:**
```typescript
const [sortBy, setSortBy] = useState<"distance" | "priority" | "time">("priority");

.sort((a, b) => {
  if (sortBy === "priority")
    return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 9) -
           (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 9);
  if (sortBy === "distance")
    return parseFloat(a.distance) - parseFloat(b.distance);
  return new Date(b.timeReported).getTime() - new Date(a.timeReported).getTime();
});

onClick={() => setSortBy(sortBy === "priority" ? "distance" : sortBy === "distance" ? "time" : "priority")}
```

**AFTER:**
```typescript
const [sortBy, setSortBy] = useState<"distance" | "time">("distance");

.sort((a, b) => {
  if (sortBy === "distance")
    return parseFloat(a.distance) - parseFloat(b.distance);
  return new Date(b.timeReported).getTime() - new Date(a.timeReported).getTime();
});

onClick={() => setSortBy(sortBy === "distance" ? "time" : "distance")}
```

---

## Step-by-Step Removal Process

### Phase 1: Config Objects (Files: 5 files)
1. **PatrolAssignedReports.tsx** - Remove lines 20-26
2. **PatrolCaseDetail.tsx** - Remove lines 14-18
3. **PatrolDashboard.tsx** - Remove lines 32-37
4. **PatrolHistory.tsx** - Remove lines 12-16
5. **AdminPatrolMonitoring.tsx** - Remove lines 36-41
6. **DashboardPage.tsx** - Remove line 72

### Phase 2: Config Usage (Files: 5 files)
1. **PatrolAssignedReports.tsx** - Remove line 107
2. **PatrolCaseDetail.tsx** - Remove line 179
3. **PatrolDashboard.tsx** - Remove lines 91-93
4. **PatrolHistory.tsx** - Remove line 122
5. **AdminPatrolMonitoring.tsx** - Update lines 206-207

### Phase 3: UI Elements (Files: 5 files)
1. **PatrolAssignedReports.tsx** - Remove lines 111-113
2. **PatrolCaseDetail.tsx** - Remove lines 277-304
3. **PatrolDashboard.tsx** - Remove lines 200-203, update 183-189
4. **PatrolHistory.tsx** - Remove lines 107-110, 136-139
5. **DashboardPage.tsx** - Remove lines 341-343

### Phase 4: Logic Updates (Files: 1 file)
1. **PatrolAssignedReports.tsx** - Update sort logic (lines 68, 89-91, 195-201)

### Phase 5: Final Polish (Files: 2 files)
1. **PatrolMapView.tsx** - Remove priority from popup (line 126)
2. **AdminPatrolMonitoring.tsx** - Remove priority range circles (lines 410-425)

---

## Files Affected (Total: 9)
- ✓ PatrolAssignedReports.tsx (7 changes)
- ✓ PatrolCaseDetail.tsx (3 changes)
- ✓ PatrolDashboard.tsx (5 changes)
- ✓ PatrolHistory.tsx (5 changes)
- ✓ PatrolMapView.tsx (1 change)
- ✓ AdminPatrolMonitoring.tsx (4 changes)
- ✗ AdminDashboard.tsx (no priority changes - uses status instead)
- ✗ DashboardPage.tsx (minimal priority changes)
- ✗ LandingPage.tsx (no changes)

**Total Changes: 25+ specific code removals/modifications**

---

## Testing Checklist After Removal

### Report Views
- [ ] PatrolAssignedReports - no priority badges visible
- [ ] PatrolCaseDetail - case details render without priority strip
- [ ] PatrolDashboard - active case card displays without priority styling
- [ ] PatrolHistory - history items show without priority badges
- [ ] DashboardPage - report list shows without priority dots

### Sorting & Filtering
- [ ] Sort button only shows "distance" and "time" options
- [ ] Clicking sort button cycles between distance and time only
- [ ] Reports sort correctly by distance
- [ ] Reports sort correctly by time (newest first)

### Admin Views
- [ ] AdminPatrolMonitoring - incident markers render without priority colors
- [ ] AdminPatrolMonitoring - no range circles for critical/high incidents
- [ ] AdminDashboard - no visual changes (uses status, not priority)

### Map Views
- [ ] PatrolMapView - incident popup shows without priority text

---

## Database Impact

### Check These Items
1. **`reports` table** - Does it have a `priority` column?
   - If yes: Decide whether to keep or remove it from schema
   - If no: No changes needed

2. **`patrol_logs` table** - Does it reference priority?
   - If yes: Check if needed for API responses
   - If no: No changes needed

3. **API responses** - Do they include `priority` field?
   - If yes: Decide to keep it or remove from response schema
   - If no: No changes needed

4. **Type definitions** - Check `services/api.ts` for Report type
   - Search for `priority` field in type definitions
   - Update or remove from interface if present

---

## Related Files to Check (Not in original list)

```bash
# Search for priority references
grep -r "priority" src/app/types/ --include="*.ts" --include="*.tsx"
grep -r "priorityConfig\|priorityOrder\|priorityDot\|PRIORITY_COLOR\|PRIORITY_BG" src/ --include="*.ts" --include="*.tsx"

# Check API service definitions
grep -r "priority" src/services/api.ts
grep -r "priority" src/app/services/

# Check components
grep -r "priority" src/app/components/ --include="*.tsx"
```

---

## Backup Recommendation

Before making changes, create a backup branch:
```bash
git checkout -b feature/remove-priority-field
```

This allows you to test and rollback if needed.
