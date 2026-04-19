# Priority Removal - Before/After Code Examples

## Most Critical Changes (Copy-Paste Ready)

---

## 1. PatrolAssignedReports.tsx - Sort Logic Update

### BEFORE (Lines 68, 88-92, 195-201)
```typescript
const [sortBy, setSortBy] = useState<"distance" | "priority" | "time">("priority");

// ...

const filtered = currentQueue
  .filter((r) =>
    search === "" ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  )
  .sort((a, b) => {
    if (sortBy === "priority")
      return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 9) -
             (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 9);
    if (sortBy === "distance")
      return parseFloat(a.distance) - parseFloat(b.distance);
    return new Date(b.timeReported).getTime() - new Date(a.timeReported).getTime();
  });

// ...

<button
  onClick={() => setSortBy(sortBy === "priority" ? "distance" : sortBy === "distance" ? "time" : "priority")}
  className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
  style={{ backgroundColor: "#161b22" }}
>
  <ArrowUpDown className="w-3.5 h-3.5" />
  <span className="hidden sm:inline capitalize">{sortBy}</span>
</button>
```

### AFTER
```typescript
const [sortBy, setSortBy] = useState<"distance" | "time">("distance");

// ...

const filtered = currentQueue
  .filter((r) =>
    search === "" ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  )
  .sort((a, b) => {
    if (sortBy === "distance")
      return parseFloat(a.distance) - parseFloat(b.distance);
    return new Date(b.timeReported).getTime() - new Date(a.timeReported).getTime();
  });

// ...

<button
  onClick={() => setSortBy(sortBy === "distance" ? "time" : "distance")}
  className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
  style={{ backgroundColor: "#161b22" }}
>
  <ArrowUpDown className="w-3.5 h-3.5" />
  <span className="hidden sm:inline capitalize">{sortBy}</span>
</button>
```

---

## 2. PatrolAssignedReports.tsx - Remove Priority Badge

### BEFORE (Lines 110-115)
```typescript
<div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 mb-1 flex-wrap">
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${pCfg.bg}`}>
        {pCfg.label}
      </span>
      <span className="text-slate-500 text-xs">{r.id}</span>
    </div>
    <h3 className="text-white font-semibold text-sm leading-tight">{r.title}</h3>
  </div>
```

### AFTER
```typescript
<div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 mb-1 flex-wrap">
      <span className="text-slate-500 text-xs">{r.id}</span>
    </div>
    <h3 className="text-white font-semibold text-sm leading-tight">{r.title}</h3>
  </div>
```

### Also Remove Line 107
```typescript
// REMOVE THIS LINE:
const pCfg = priorityConfig[r.priority] ?? priorityConfig.medium;
```

---

## 3. PatrolCaseDetail.tsx - Replace Priority Strip

### BEFORE (Lines 277-304)
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

### AFTER
```typescript
{/* ── Case Info ───────────────────────────── */}
<div className="rounded-2xl border border-slate-700/50 p-3 sm:p-4" style={{ backgroundColor: "#161b22" }}>
  <div className="flex items-center gap-2 mb-2">
    <span className="text-slate-400 text-xs font-semibold">{report.category}</span>
  </div>
  <h2 className="text-white font-bold mb-3 text-sm sm:text-base">{report.title}</h2>
  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-slate-300 text-xs truncate">{report.location}</span>
    </div>
    <div className="flex items-center gap-2">
      <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      <span className="text-blue-400 text-xs font-medium">{report.distance}</span>
    </div>
    <div className="flex items-center gap-2">
      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-slate-400 text-xs">{timeAgo(report.timeReported)}</span>
    </div>
    <div className="flex items-center gap-2 min-w-0">
      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-slate-400 text-xs truncate">{report.reporter}</span>
    </div>
  </div>
</div>
```

### Also Remove These Lines
```typescript
// REMOVE THESE LINES:
import { AlertTriangle, ... } from "lucide-react";  // Remove AlertTriangle import if not used elsewhere
const priorityConfig = { ... }  // Lines 14-18
const pCfg = priorityConfig[report?.priority ?? "medium"] ?? priorityConfig.medium;  // Line 179
```

---

## 4. PatrolDashboard.tsx - Update Active Case Card

### BEFORE (Lines 183-189 and 200-203)
```typescript
<div
  className="rounded-2xl border-2 overflow-hidden relative"
  style={{
    borderColor: pCfg.border,
    backgroundColor: pCfg.bg,
    boxShadow: pCfg.glow,
  }}
>
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

### AFTER
```typescript
<div
  className="rounded-2xl border-2 overflow-hidden relative border-slate-700"
  style={{
    backgroundColor: "#161b22",
  }}
>
  {/* Top Strip */}
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
    <div className="flex items-center gap-2">
      <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
      <span className="text-amber-300 text-xs font-bold tracking-wider">ACTIVE CASE — {activeCase?.id}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
        {activeCase?.category}
      </span>
```

### Also Remove These Lines
```typescript
// REMOVE THESE LINES:
const priorityConfig = { ... }  // Lines 32-37
const pCfg = activeCase ? priorityConfig[activeCase.priority as keyof typeof priorityConfig] ?? priorityConfig.medium : priorityConfig.medium;  // Lines 91-93
```

---

## 5. PatrolHistory.tsx - Remove Priority Badge and Dot

### BEFORE (Lines 106-114 and 133-142)
```typescript
{/* Priority dot */}
<div
  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
  style={{ backgroundColor: `${cfg.color}18` }}
>
  <CheckCircle className="w-4 h-4" style={{ color: cfg.color }} />
</div>

<div className="flex-1 min-w-0">
  <div className="flex items-start gap-2 mb-1">
    <span className="text-slate-100 text-sm font-semibold leading-tight flex-1 truncate">
      {r.title}
    </span>
    <ResponseBadge time={r.responseTime} />
  </div>

  <div className="flex items-center gap-2 flex-wrap">
    <span
      className="px-1.5 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
    >
      {cfg.label}
    </span>
```

### AFTER
```typescript
{/* Status icon */}
<div
  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
  style={{ backgroundColor: "#22c55e18" }}
>
  <CheckCircle className="w-4 h-4 text-green-400" />
</div>

<div className="flex-1 min-w-0">
  <div className="flex items-start gap-2 mb-1">
    <span className="text-slate-100 text-sm font-semibold leading-tight flex-1 truncate">
      {r.title}
    </span>
    <ResponseBadge time={r.responseTime} />
  </div>

  <div className="flex items-center gap-2 flex-wrap">
```

### Also Remove These Lines
```typescript
// REMOVE THESE LINES:
const priorityConfig = { ... }  // Lines 12-16
const cfg = priorityConfig[r.priority] ?? { color: "#6b7280", label: r.priority };  // Line 122
```

---

## 6. DashboardPage.tsx - Remove Priority Dot from Reports

### BEFORE (Lines 341-345)
```typescript
<div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityDot[r.priority] }} />
<div className="flex-1 min-w-0">
  <div className="font-medium text-gray-900 text-sm truncate">{r.title}</div>
  <div className="flex items-center gap-2 mt-0.5">
    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
    <span className="text-gray-400 text-xs truncate">{r.location}</span>
  </div>
</div>
```

### AFTER
```typescript
<div className="flex-1 min-w-0">
  <div className="font-medium text-gray-900 text-sm truncate">{r.title}</div>
  <div className="flex items-center gap-2 mt-0.5">
    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
    <span className="text-gray-400 text-xs truncate">{r.location}</span>
  </div>
</div>
```

### Also Remove These Lines
```typescript
// REMOVE THESE LINES:
const priorityDot = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };  // Line 72
```

---

## 7. AdminPatrolMonitoring.tsx - Remove Priority Range Circles

### BEFORE (Lines 409-425)
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
  ))}
```

### AFTER
Remove entire section (no replacement needed)

### Also Remove These Lines
```typescript
// REMOVE THESE LINES:
const PRIORITY_COLOR = { ... }  // Lines 36-39
const PRIORITY_BG = { ... }  // Lines 40-41
```

---

## 8. PatrolMapView.tsx - Remove Priority from Popup

### BEFORE (Line 126)
```typescript
<div className="text-red-400 font-bold mb-1" style={{ fontSize: 11 }}>🚨 {activeCase?.priority?.toUpperCase() ?? "Loading..."} INCIDENT</div>
```

### AFTER
```typescript
<div className="text-red-400 font-bold mb-1" style={{ fontSize: 11 }}>🚨 INCIDENT</div>
```

---

## Removal Order

1. ✅ Remove all config objects first
2. ✅ Remove all config usage (lookups)
3. ✅ Remove UI elements (badges, dots, strips)
4. ✅ Update sorting/filtering logic
5. ✅ Update styling (use static colors instead of priority-based)
6. ✅ Final testing

---

## Interface Updates Needed

If the API returns priority, you may need to update the Report interface in `src/services/api.ts`:

### BEFORE
```typescript
interface Report {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  location: string;
  // ... other fields
}
```

### AFTER
```typescript
interface Report {
  id: string;
  title: string;
  category: string;
  location: string;
  // ... other fields
}
```

---

## Search and Replace Commands (Optional)

If using VS Code, you can use Find and Replace (Ctrl+H):

1. Search: `priorityConfig` → Replace with nothing
2. Search: `priorityOrder` → Replace with nothing
3. Search: `priorityDot` → Replace with nothing
4. Search: `PRIORITY_COLOR` → Replace with nothing
5. Search: `PRIORITY_BG` → Replace with nothing
6. Search: `pCfg` → Review manually (some might be used elsewhere)

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/remove-priority-field

# Make changes to files (use examples above)
# ...

# Stage changes
git add src/app/pages/patrol/PatrolAssignedReports.tsx
git add src/app/pages/patrol/PatrolCaseDetail.tsx
git add src/app/pages/patrol/PatrolDashboard.tsx
git add src/app/pages/patrol/PatrolHistory.tsx
git add src/app/pages/patrol/PatrolMapView.tsx
git add src/app/pages/admin/AdminPatrolMonitoring.tsx
git add src/app/pages/DashboardPage.tsx
git add src/services/api.ts

# Commit with clear message
git commit -m "refactor: remove priority field from patrol and report components"

# Push to remote
git push origin feature/remove-priority-field

# Create pull request for review
```
