# Priority Removal Analysis - Complete Code Reference

## Summary
This document identifies all priority-related code across 9 React component files that needs to be removed or modified. Each entry includes exact line numbers, code blocks, and specific removal instructions.

---

## File 1: src/app/pages/patrol/PatrolAssignedReports.tsx

### Priority Configuration Object
**Lines 20-26**
```typescript
const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#ef4444", bg: "bg-red-500/15 text-red-400 border-red-500/30", label: "CRITICAL" },
  high: { color: "#f97316", bg: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "HIGH" },
  medium: { color: "#eab308", bg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "MEDIUM" },
  low: { color: "#22c55e", bg: "bg-green-500/15 text-green-400 border-green-500/30", label: "LOW" },
};
```
**Removal**: Delete entire `priorityOrder` and `priorityConfig` objects

### Priority Type Definition
**Line 56**
```typescript
priority: "critical" | "high" | "medium" | "low";
```
**Removal**: Remove priority field from ReportCard interface

### Sort State with Priority Option
**Line 68**
```typescript
const [sortBy, setSortBy] = useState<"distance" | "priority" | "time">("priority");
```
**Removal**: Change to `const [sortBy, setSortBy] = useState<"distance" | "time">("distance");` (remove "priority")

### Priority-Based Sorting Logic
**Lines 88-92**
```typescript
.sort((a, b) => {
  if (sortBy === "priority")
    return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 9) -
           (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 9);
  if (sortBy === "distance")
```
**Removal**: Remove the entire priority sorting condition (lines 89-91)

### Priority Badge Rendering
**Lines 111-113**
```typescript
<span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${pCfg.bg}`}>
  {pCfg.label}
</span>
```
**Removal**: Delete these lines that render the priority badge UI

### Priority Config Usage
**Line 107**
```typescript
const pCfg = priorityConfig[r.priority] ?? priorityConfig.medium;
```
**Removal**: Delete line (no longer needed)

### Sort Button UI with Priority Option
**Lines 195-201**
```typescript
<button
  onClick={() => setSortBy(sortBy === "priority" ? "distance" : sortBy === "distance" ? "time" : "priority")}
  className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
  style={{ backgroundColor: "#161b22" }}
>
  <ArrowUpDown className="w-3.5 h-3.5" />
  <span className="hidden sm:inline capitalize">{sortBy}</span>
</button>
```
**Removal**: Update click handler to cycle only between `distance` and `time`:
```typescript
onClick={() => setSortBy(sortBy === "distance" ? "time" : "distance")}
```

---

## File 2: src/app/pages/patrol/PatrolCaseDetail.tsx

### Priority Configuration Object
**Lines 14-18**
```typescript
const priorityConfig: Record<string, { color: string; bg: string; border: string; label: string; glow: string }> = {
  critical: { color: "#ef4444", bg: "#7f1d1d", border: "#ef4444", label: "CRITICAL", glow: "0 0 24px rgba(239,68,68,0.25)" },
  high: { color: "#f97316", bg: "#7c2d12", border: "#f97316", label: "HIGH", glow: "0 0 24px rgba(249,115,22,0.2)" },
  medium: { color: "#eab308", bg: "#713f12", border: "#eab308", label: "MEDIUM", glow: "" },
  low: { color: "#22c55e", bg: "#14532d", border: "#22c55e", label: "LOW", glow: "" },
};
```
**Removal**: Delete entire `priorityConfig` object

### Priority Config Usage
**Line 179**
```typescript
const pCfg = priorityConfig[report?.priority ?? "medium"] ?? priorityConfig.medium;
```
**Removal**: Delete line (no longer needed)

### Priority Strip Component
**Lines 277-304** (Entire priority strip section)
```typescript
{/* ── Priority Strip ───────────────────────────── */}
<div
  className="rounded-2xl border-2 p-3 sm:p-4"
  style={{ borderColor: pCfg.border, backgroundColor: pCfg.bg, boxShadow: pCfg.glow }}
>
  <div className="flex items-center gap-2 mb-2">
    <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
    <span className="text-red-200 text-xs font-bold">{report.category}</span>
  </div>
  <h2 className="text-white font-bold mb-3 text-sm sm:text-base">{report.title}</h2>
  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <MapPin className="w-3.5 h-3.5 text-white/50 shrink-0" />
      <span className="text-white/80 text-xs truncate">{report.location}</span>
    </div>
    <div className="flex items-center gap-2">
      <Navigation className="w-3.5 h-3.5 text-blue-300 shrink-0" />
      <span className="text-blue-300 text-xs font-medium">{report.distance}</span>
    </div>
    <div className="flex items-center gap-2">
      <Clock className="w-3.5 h-3.5 text-white/50 shrink-0" />
      <span className="text-white/70 text-xs">{timeAgo(report.timeReported)}</span>
    </div>
    <div className="flex items-center gap-2 min-w-0">
      <User className="w-3.5 h-3.5 text-white/50 shrink-0" />
      <span className="text-white/70 text-xs truncate">{report.reporter}</span>
    </div>
  </div>
</div>
```
**Removal**: Delete entire priority strip div and replace with simplified case info display without priority styling

---

## File 3: src/app/pages/patrol/PatrolDashboard.tsx

### Priority Configuration Object
**Lines 32-37**
```typescript
const priorityConfig = {
  critical: { bg: "#7f1d1d", border: "#ef4444", badge: "bg-red-500", text: "CRITICAL", glow: "0 0 30px rgba(239,68,68,0.3)" },
  high: { bg: "#7c2d12", border: "#f97316", badge: "bg-orange-500", text: "HIGH", glow: "0 0 30px rgba(249,115,22,0.25)" },
  medium: { bg: "#713f12", border: "#eab308", badge: "bg-yellow-500", text: "MEDIUM", glow: "0 0 20px rgba(234,179,8,0.2)" },
  low: { bg: "#14532d", border: "#22c55e", badge: "bg-green-500", text: "LOW", glow: "0 0 20px rgba(34,197,94,0.2)" },
};
```
**Removal**: Delete entire `priorityConfig` object

### Priority Config Usage
**Line 91**
```typescript
const pCfg = activeCase
  ? priorityConfig[activeCase.priority as keyof typeof priorityConfig] ?? priorityConfig.medium
  : priorityConfig.medium;
```
**Removal**: Delete lines 91-93

### Active Case Card with Priority Styling
**Lines 191-209** (Top Strip with priority)
```typescript
{/* Top Strip */}
<div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
  <div className="flex items-center gap-2">
    <AlertTriangle className="w-4 h-4 text-red-300 animate-pulse" />
    <span className="text-red-200 text-xs font-bold tracking-wider">ACTIVE CASE — {activeCase?.id}</span>
  </div>
  <div className="flex items-center gap-2">
    <span className={`px-2.5 py-0.5 rounded-full text-white text-xs font-bold ${pCfg.badge}`}>
      {pCfg.text}
    </span>
    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
      {activeCase?.category}
    </span>
```
**Removal**: Remove priority badge rendering (lines 200-203):
```typescript
<span className={`px-2.5 py-0.5 rounded-full text-white text-xs font-bold ${pCfg.badge}`}>
  {pCfg.text}
</span>
```

### Active Case Card Border and Glow
**Lines 183-189**
```typescript
<div
  className="rounded-2xl border-2 overflow-hidden relative"
  style={{
    borderColor: pCfg.border,
    backgroundColor: pCfg.bg,
    boxShadow: pCfg.glow,
  }}
>
```
**Removal**: Change to static styling (remove priority-based colors):
```typescript
<div
  className="rounded-2xl border-2 overflow-hidden relative border-slate-700"
  style={{
    backgroundColor: "#161b22",
  }}
>
```

---

## File 4: src/app/pages/patrol/PatrolHistory.tsx

### Priority Configuration Object
**Lines 12-16**
```typescript
const priorityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "#ef4444", label: "CRITICAL" },
  high:     { color: "#f97316", label: "HIGH"     },
  medium:   { color: "#eab308", label: "MEDIUM"   },
  low:      { color: "#22c55e", label: "LOW"      },
};
```
**Removal**: Delete entire `priorityConfig` object

### Priority Dot Rendering
**Lines 107-110**
```typescript
{/* Priority dot */}
<div
  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
  style={{ backgroundColor: `${cfg.color}18` }}
>
```
And **Lines 136-139**
```typescript
<span
  className="px-1.5 py-0.5 rounded-full text-xs font-bold"
  style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
>
```
**Removal**: Remove priority badge UI - delete the priority dot and badge rendering

### Priority Config Variable Usage
**Line 122**
```typescript
const cfg   = priorityConfig[r.priority] ?? { color: "#6b7280", label: r.priority };
```
**Removal**: Delete line (no longer needed)

---

## File 5: src/app/pages/patrol/PatrolMapView.tsx

### Priority Reference in Incident Icon
**Line 126** (Priority popup reference)
```typescript
<div className="text-red-400 font-bold mb-1" style={{ fontSize: 11 }}>🚨 {activeCase?.priority?.toUpperCase() ?? "Loading..."} INCIDENT</div>
```
**Removal**: Remove priority from popup:
```typescript
<div className="text-red-400 font-bold mb-1" style={{ fontSize: 11 }}>🚨 INCIDENT</div>
```

---

## File 6: src/app/pages/admin/AdminPatrolMonitoring.tsx

### Priority Color Constants
**Lines 36-41**
```typescript
const PRIORITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};
const PRIORITY_BG: Record<string, string> = {
  critical: "rgba(220,38,38,0.15)",
  high: "rgba(239,68,68,0.12)",
  medium: "rgba(245,158,11,0.12)",
  low: "rgba(34,197,94,0.12)",
};
```
**Removal**: Delete both `PRIORITY_COLOR` and `PRIORITY_BG` objects

### Priority Rendering in Incident Icon Function
**Lines 206-207** (inside `incidentIcon` function)
```typescript
function incidentIcon(inc: IncidentLocation, selected: boolean) {
  const c = PRIORITY_COLOR[inc.priority];
```
**Removal**: Remove priority-based color selection. Update function:
```typescript
function incidentIcon(inc: IncidentLocation, selected: boolean) {
  const c = "#ef4444"; // Static color
```

### Priority in Incident Popup
**Lines 346-349**
```typescript
<div className="flex items-center gap-1.5 mb-1">
  <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[inc.priority] }} />
  <span style={{ color: PRIORITY_COLOR[inc.priority], fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
    {inc.priority}
  </span>
```
**Removal**: Delete priority indicator lines or simplify to remove color mapping

### Priority Range Circle
**Lines 411-425**
```typescript
{/* Range circles for critical/high incidents — must be siblings of Marker, not children */}
{incidents
  .filter((inc) => inc.priority === "critical" || inc.priority === "high")
  .map((inc) => (
    <Circle
      key={`zone-${inc.id}`}
      center={[inc.location.lat, inc.location.lng]}
      radius={150}
      pathOptions={{
        color: PRIORITY_COLOR[inc.priority],
        fillColor: PRIORITY_COLOR[inc.priority],
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: "4 4",
      }}
    />
  ))}</output>
```
**Removal**: Delete entire range circles section (lines 410-425) - only renders for critical/high priority

---

## File 7: src/app/pages/AdminDashboard.tsx

### Status Colors (includes priority-like logic but not direct priority)
**Lines 88-94** (Note: This is status-based, not priority, but check for priority-specific configs)
```typescript
const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending_verification: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Verification" },
  approved:    { bg: "bg-blue-100",  text: "text-blue-700",  label: "Approved" },
  in_progress: { bg: "bg-cyan-100",  text: "text-cyan-700",  label: "In Progress" },
  accepted:    { bg: "bg-yellow-100", text: "text-yellow-700", label: "Accepted" },
  submitted:   { bg: "bg-purple-100", text: "text-purple-700", label: "Submitted" },
  resolved:    { bg: "bg-green-100", text: "text-green-700", label: "Resolved" },
};
```
**Note**: This is status-based, NOT priority-based. Keep as is.

---

## File 8: src/app/pages/DashboardPage.tsx

### Priority Dot References
**Line 72**
```typescript
const priorityDot: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#22c55e",
};
```
**Removal**: Delete entire `priorityDot` object

### Priority Dot Usage in Reports List
**Lines 341-343**
```typescript
<div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityDot[r.priority] }} />
```
**Removal**: Delete this line (priority dot before each report)

---

## File 9: src/app/pages/LandingPage.tsx

### Priority References
**Lines 46-47** (in `staticStats`)
This doesn't directly reference report priority; it's about "LIVE" incidents. No changes needed if the data source doesn't include priority.

---

## Summary Table: All Removals

| File | Line(s) | Item | Action |
|------|---------|------|--------|
| PatrolAssignedReports.tsx | 20-26 | `priorityOrder` & `priorityConfig` | Delete |
| PatrolAssignedReports.tsx | 56 | Priority field in ReportCard | Remove from interface |
| PatrolAssignedReports.tsx | 68 | Sort state with "priority" option | Change to `"distance" \| "time"` |
| PatrolAssignedReports.tsx | 89-91 | Priority sorting logic | Delete |
| PatrolAssignedReports.tsx | 107 | Priority config lookup | Delete |
| PatrolAssignedReports.tsx | 111-113 | Priority badge UI | Delete |
| PatrolAssignedReports.tsx | 195-201 | Sort button with priority cycle | Update click handler |
| PatrolCaseDetail.tsx | 14-18 | `priorityConfig` object | Delete |
| PatrolCaseDetail.tsx | 179 | Priority config usage | Delete |
| PatrolCaseDetail.tsx | 277-304 | Entire priority strip component | Delete/Replace |
| PatrolDashboard.tsx | 32-37 | `priorityConfig` object | Delete |
| PatrolDashboard.tsx | 91-93 | Priority config usage | Delete |
| PatrolDashboard.tsx | 183-189 | Border/glow based on priority | Use static styling |
| PatrolDashboard.tsx | 200-203 | Priority badge rendering | Delete |
| PatrolHistory.tsx | 12-16 | `priorityConfig` object | Delete |
| PatrolHistory.tsx | 107-110, 136-139 | Priority dot and badge UI | Delete |
| PatrolHistory.tsx | 122 | Priority config lookup | Delete |
| PatrolMapView.tsx | 126 | Priority in incident popup | Remove priority text |
| AdminPatrolMonitoring.tsx | 36-41 | `PRIORITY_COLOR` & `PRIORITY_BG` | Delete |
| AdminPatrolMonitoring.tsx | 206-207 | Priority in icon function | Use static color |
| AdminPatrolMonitoring.tsx | 346-349 | Priority indicator in popup | Remove/simplify |
| AdminPatrolMonitoring.tsx | 410-425 | Priority-based range circles | Delete entire section |
| DashboardPage.tsx | 72 | `priorityDot` object | Delete |
| DashboardPage.tsx | 341-343 | Priority dot rendering | Delete |

---

## Important Notes

1. **Data Layer**: Check the API data structures to confirm priority fields are being used in report objects returned from the backend
2. **Database**: Verify if priority is stored in database and if migrations are needed
3. **Testing**: After removal, test all report list views, detail views, and filtering/sorting functionality
4. **Status vs Priority**: Do NOT confuse `status` (pending, approved, in_progress, submitted, resolved) with `priority` (critical, high, medium, low) - only remove priority references
