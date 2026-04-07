import { useApi, fetchActiveCase, fetchAssignedReports } from "../../services/api";
import { PatrolEmptyState, PatrolSkeletonCard } from "../../components/ui/DataStates";
import { useNavigate } from "react-router";
import { useState } from "react";
import { motion } from "motion/react";
import {
  MapPin, Clock, ChevronRight, Filter, Search,
  AlertTriangle, ArrowUpDown, Navigation, Zap,
} from "lucide-react";

type Priority = "all" | "critical" | "high" | "medium" | "low";

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#ef4444", bg: "bg-red-500/15 text-red-400 border-red-500/30", label: "CRITICAL" },
  high: { color: "#f97316", bg: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "HIGH" },
  medium: { color: "#eab308", bg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "MEDIUM" },
  low: { color: "#22c55e", bg: "bg-green-500/15 text-green-400 border-green-500/30", label: "LOW" },
};

const categoryColors: Record<string, string> = {
  "Suspicious Activity": "#ef4444",
  "Drug-Related": "#a855f7",
  "Infrastructure": "#3b82f6",
  "Public Disturbance": "#f59e0b",
  "Natural Disaster": "#06b6d4",
  "Public Safety": "#f97316",
  "Crime": "#dc2626",
  "Environmental": "#22c55e",
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (diff < 60) return `${Math.floor(diff)} min ago`;
  return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60)}m ago`;
}

export function PatrolAssignedReports() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Priority>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "priority" | "time">("priority");

  const { data: activeCase, loading: activeCaseLoading } = useApi(fetchActiveCase);
  const { data: assignedReports, loading: assignedLoading } = useApi(fetchAssignedReports);

  const allCases = [
    ...(activeCase ? [{ ...activeCase, status: "active" as const }] : []),
    ...(assignedReports ?? []),
  ];

  const filtered = allCases
    .filter((r) => filter === "all" || r.priority === filter)
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

  return (
    <div className="p-4 md:p-5 space-y-4 pb-24 md:pb-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 border border-slate-700/50"
        style={{ backgroundColor: "#161b22" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Assigned Case Queue</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {allCases.length} cases · Sorted by {sortBy}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#800000" }}>
              {allCases.length} Total
            </div>
            <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              1 Active
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5" style={{ backgroundColor: "#161b22" }}>
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none w-full"
          />
        </div>
        <button
          onClick={() => setSortBy(sortBy === "priority" ? "distance" : sortBy === "distance" ? "time" : "priority")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
          style={{ backgroundColor: "#161b22" }}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="hidden sm:block capitalize">{sortBy}</span>
        </button>
      </div>

      {/* Priority Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === p
                ? "text-white border-transparent"
                : "text-slate-400 border-slate-700 hover:text-white"
            }`}
            style={filter === p ? { backgroundColor: p === "all" ? "#800000" : priorityConfig[p]?.color ?? "#800000" } : {}}
          >
            {p === "all" ? "All Cases" : priorityConfig[p].label}
          </button>
        ))}
      </div>

      {/* Case List */}
      <div className="space-y-3">
        {filtered.map((r, i) => {
          const isActive = r.status === "active";
          const pCfg = priorityConfig[r.priority] ?? priorityConfig.medium;
          const catColor = categoryColors[r.category] ?? "#6b7280";

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                if (isActive) navigate("/app/patrol/dashboard");
                else navigate(`/app/patrol/case/${r.id}`);
              }}
              className={`rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden ${
                isActive ? "border-red-500/50" : "border-slate-700/50 hover:border-slate-600"
              }`}
              style={{ backgroundColor: isActive ? "#1a0a0a" : "#161b22", boxShadow: isActive ? "0 0 20px rgba(239,68,68,0.15)" : "none" }}
            >
              {/* Active Case Strip */}
              {isActive && (
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-red-500/30" style={{ backgroundColor: "#7f1d1d" }}>
                  <AlertTriangle className="w-3 h-3 text-red-300 animate-pulse" />
                  <span className="text-red-200 text-xs font-bold tracking-wider">ACTIVE — CURRENTLY ASSIGNED</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${pCfg.bg}`}>
                        {pCfg.label}
                      </span>
                      <span className="text-slate-500 text-xs">{r.id}</span>
                    </div>
                    <h3 className="text-white font-semibold text-sm leading-tight">{r.title}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                </div>

                {/* Category + Location */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                  <span className="text-slate-400 text-xs">{r.category}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-400 text-xs truncate">{r.location}</span>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-400 text-xs font-medium">{r.distance}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500 text-xs">{timeAgo(r.timeReported)}</span>
                    </div>
                  </div>
                  {isActive ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("/app/patrol/dashboard"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                    >
                      <Zap className="w-3 h-3" /> Handle Now
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/patrol/case/${r.id}`); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">No cases match your filter</p>
        </div>
      )}
    </div>
  );
}