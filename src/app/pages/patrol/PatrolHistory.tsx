import { useApi, fetchPatrolHistory, fetchPatrolStats } from "../../services/api";
import { PatrolEmptyState } from "../../components/ui/DataStates";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle, Clock, MapPin, Camera, ChevronDown, ChevronUp,
  Filter, Search, Zap, TrendingUp, Award, Calendar,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  "Suspicious Activity":  "#ef4444",
  "Drug-Related":         "#a855f7",
  "Infrastructure":       "#3b82f6",
  "Public Disturbance":   "#f59e0b",
  "Natural Disaster":     "#06b6d4",
  "Public Safety":        "#f97316",
  "Crime":                "#dc2626",
  "Environmental":        "#22c55e",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-PH", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function ResponseBadge({ time }: { time: string }) {
  const mins = parseInt(time);
  const color = mins <= 5 ? "#22c55e" : mins <= 10 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20` }}>
      <Zap className="w-3 h-3" style={{ color }} />
      <span className="text-xs font-medium" style={{ color }}>{time}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PatrolHistory() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "today" | "week">("all");

  const { data: history,     loading: historyLoading } = useApi(fetchPatrolHistory);
  const { data: patrolStats, loading: statsLoading    } = useApi(fetchPatrolStats);

  const allHistory = history ?? [];

  const filtered = allHistory.filter((r) => {
    if (
      search &&
      !r.title.toLowerCase().includes(search.toLowerCase()) &&
      !r.category.toLowerCase().includes(search.toLowerCase())
    ) return false;

    if (filter === "today") {
      const today = new Date().toDateString();
      return new Date(r.timeResolved).toDateString() === today;
    }
    if (filter === "week") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(r.timeResolved).getTime() >= weekAgo;
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 pb-24 lg:pb-6">

      {/* ── Header / Stats Row ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 sm:p-4 border-2 overflow-hidden relative"
        style={{ borderColor: "#800000", backgroundColor: "#161b22" }}
      >
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end opacity-5 pr-4">
          <Award className="w-20 sm:w-28 h-20 sm:h-28" style={{ color: "#800000" }} />
        </div>
        <div className="flex items-center gap-2 mb-3 relative">
          <TrendingUp className="w-4 h-4 shrink-0" style={{ color: "#800000" }} />
          <h2 className="text-white font-bold text-sm">History</h2>
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: "#800000" }}>
            {allHistory.length} cases
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 relative">
          {[
            {
              label: "Resolved",
              value: statsLoading ? "…" : (patrolStats?.month.completed ?? "—"),
              color: "#22c55e",
            },
            {
              label: "Clearance",
              value: statsLoading ? "…" : `${patrolStats?.week.clearanceRate ?? "—"}%`,
              color: "#3b82f6",
            },
            {
              label: "Avg Response",
              value: statsLoading ? "…" : (patrolStats?.today.avgResponse ?? "—"),
              color: "#f59e0b",
            },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-base sm:text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Search + Filter ── */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm"
          style={{ backgroundColor: "#161b22", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent text-white outline-none placeholder-slate-600 min-w-0"
          />
        </div>

        <div
          className="flex items-center gap-1 px-1.5 sm:px-2 py-2 sm:py-2.5 rounded-xl border"
          style={{ backgroundColor: "#161b22", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer"
          >
            <option value="all"   className="bg-slate-800">All Time</option>
            <option value="today" className="bg-slate-800">Today</option>
            <option value="week"  className="bg-slate-800">This Week</option>
          </select>
        </div>
      </div>

      {/* ── Case List ── */}
      {historyLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 border border-slate-700/50 animate-pulse" style={{ backgroundColor: "#161b22" }}>
              <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-2.5 bg-slate-700/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <PatrolEmptyState
          icon={Calendar}
          title={search ? "No matching cases" : "No resolved cases yet"}
          subtitle={search ? "Try a different search term." : "Resolved cases will appear here."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r, idx) => {
            const catC  = categoryColors[r.category] ?? "#6b7280";
            const isExp = expanded === r.id;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-2xl border border-slate-700/50 overflow-hidden"
                style={{ backgroundColor: "#161b22" }}
              >
                {/* Summary row */}
                <button
                  className="w-full flex items-start gap-3 p-4 text-left"
                  onClick={() => setExpanded(isExp ? null : r.id)}
                >
                  {/* Status dot */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-blue-500/20"
                  >
                    <CheckCircle className="w-4 h-4" style={{ color: "#3b82f6" }} />
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
                        className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300"
                      >
                        Resolved
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${catC}15`, color: catC }}
                      >
                        {r.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 text-xs truncate">{r.location}</span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span className="text-slate-600 text-xs">{formatTime(r.timeResolved)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 mt-1">
                    {isExp
                      ? <ChevronUp  className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />
                    }
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-4 space-y-3 border-t"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                      >
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          <div
                            className="rounded-xl p-3 space-y-0.5"
                            style={{ backgroundColor: "#0d1117" }}
                          >
                            <div className="text-slate-500 text-xs">Reported</div>
                            <div className="text-slate-300 text-xs font-medium">
                              {formatTime(r.timeReported)}
                            </div>
                          </div>
                          <div
                            className="rounded-xl p-3 space-y-0.5"
                            style={{ backgroundColor: "#0d1117" }}
                          >
                            <div className="text-slate-500 text-xs">Resolved</div>
                            <div className="text-slate-300 text-xs font-medium">
                              {formatTime(r.timeResolved)}
                            </div>
                          </div>
                        </div>

                        {r.resolution && (
                          <div
                            className="rounded-xl p-3"
                            style={{ backgroundColor: "#0d1117" }}
                          >
                            <div className="text-slate-500 text-xs mb-1">Resolution Note</div>
                            <div className="text-slate-300 text-xs leading-relaxed">
                              {r.resolution}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                            style={{ backgroundColor: "rgba(34,197,94,0.12)" }}
                          >
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs font-medium capitalize">
                              {r.status}
                            </span>
                          </div>

                          {r.hasPhoto && (
                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                              style={{ backgroundColor: "rgba(59,130,246,0.12)" }}
                            >
                              <Camera className="w-3 h-3 text-blue-400" />
                              <span className="text-blue-400 text-xs font-medium">
                                Photo attached
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
