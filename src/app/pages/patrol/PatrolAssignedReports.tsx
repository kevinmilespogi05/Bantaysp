/**
 * PatrolAssignedReports — Split view for admin-assigned and available reports
 *
 * Displays two queues:
 * 1. Admin-Assigned: Reports explicitly assigned by admins (need acceptance)
 * 2. Available: Unassigned reports patrol officer can self-assign
 */

import { useApi, fetchAdminAssignedReports, fetchAvailableReports, fetchSubmittedPatrolReports } from "../../services/api";
import { PatrolEmptyState, PatrolSkeletonCard } from "../../components/ui/DataStates";
import { useNavigate } from "react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import {
  MapPin, Clock, ChevronRight, Filter, Search,
  AlertTriangle, ArrowUpDown, Navigation, Zap, Check,
} from "lucide-react";

type QueueTab = "assigned" | "available" | "submitted";

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

interface ReportCard {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  location: string;
  distance: string;
  timeReported: string;
  reporter: string;
  reporterAvatar: string;
  description: string;
  acceptedBy?: string;
  status?: string;
}

export function PatrolAssignedReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<QueueTab>("assigned");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "priority" | "time">("priority");

  // Fetch all three queues
  const { data: adminAssigned, loading: adminLoading } = useApi(() => 
    fetchAdminAssignedReports(user.id)
  );
  const { data: availableReports, loading: availableLoading } = useApi(fetchAvailableReports);
  const { data: submittedReports, loading: submittedLoading } = useApi(fetchSubmittedPatrolReports);

  const currentQueue = activeTab === "assigned" 
    ? (adminAssigned ?? []) 
    : activeTab === "available"
      ? (availableReports ?? [])
      : (submittedReports ?? []);
  
  const isLoading = 
    activeTab === "assigned" ? adminLoading 
    : activeTab === "available" ? availableLoading 
    : submittedLoading;

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

  const renderReportCard = (r: ReportCard, actionType: "admin" | "available" | "submitted") => {
    const pCfg = priorityConfig[r.priority] ?? priorityConfig.medium;
    const catColor = categoryColors[r.category] ?? "#6b7280";

    return (
      <motion.div
        key={r.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate(`/app/patrol/case/${r.id}`)}
        className="rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden border-slate-700/50 hover:border-slate-600"
        style={{ backgroundColor: "#161b22" }}
      >
        <div className="p-3 sm:p-4">
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
            <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          </div>

          {/* Category + Location */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
            <span className="text-slate-400 text-xs truncate">{r.category}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-400 text-xs truncate">{r.location}</span>
          </div>

          {/* Status Badge */}
          {r.acceptedBy && (
            <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 w-fit">
              <div className="w-3 h-3 rounded-full flex items-center justify-center text-white text-xs font-bold bg-blue-600">
                {r.acceptedBy.substring(0, 1)}
              </div>
              <span className="text-blue-300 text-xs font-medium">Accepted</span>
            </div>
          )}

          {/* Bottom Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-blue-400 text-xs font-medium">{r.distance}</span>
              </div>
              <div className="flex items-center gap-1 hidden xs:flex">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-500 text-xs">{timeAgo(r.timeReported)}</span>
              </div>
            </div>
            {actionType === "admin" ? (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/app/patrol/case/${r.id}?action=accept`); }}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0"
                title="Accept admin assignment"
              >
                <Check className="w-3 h-3" /> <span className="hidden xs:inline">Accept</span>
              </button>
            ) : actionType === "available" ? (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/app/patrol/case/${r.id}?action=self-assign`); }}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors shrink-0"
                title="Self-assign this report"
              >
                <Zap className="w-3 h-3" /> <span className="hidden xs:inline">Assign</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium shrink-0">
                <Clock className="w-3 h-3" /> <span className="hidden xs:inline">Awaiting</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };



  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 pb-24 lg:pb-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 sm:p-4 border border-slate-700/50"
        style={{ backgroundColor: "#161b22" }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-white font-bold text-base">Report Queues</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {adminAssigned?.length ?? 0} admin · {availableReports?.length ?? 0} available · {submittedReports?.length ?? 0} submitted
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#800000" }}>
              {(adminAssigned?.length ?? 0) + (availableReports?.length ?? 0) + (submittedReports?.length ?? 0)} Total
            </div>
          </div>
        </div>
      </motion.div>

      {/* Queue Tabs - Mobile scrollable, desktop normal */}
      <div className="flex gap-1 sm:gap-2 border-b border-slate-700 overflow-x-auto pb-2">
        <button
          onClick={() => { setActiveTab("assigned"); setSearch(""); }}
          className={`px-2.5 sm:px-4 py-2 whitespace-nowrap font-medium text-xs sm:text-sm transition-all border-b-2 ${
            activeTab === "assigned"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-400"
          }`}
        >
          <span className="hidden xs:inline">Admin-Assigned</span>
          <span className="xs:hidden">Admin</span> ({adminAssigned?.length ?? 0})
        </button>
        <button
          onClick={() => { setActiveTab("available"); setSearch(""); }}
          className={`px-2.5 sm:px-4 py-2 whitespace-nowrap font-medium text-xs sm:text-sm transition-all border-b-2 ${
            activeTab === "available"
              ? "border-green-500 text-green-400"
              : "border-transparent text-slate-500 hover:text-slate-400"
          }`}
        >
          <span className="hidden xs:inline">Available</span>
          <span className="xs:hidden">Self-Assign</span> ({availableReports?.length ?? 0})
        </button>
        <button
          onClick={() => { setActiveTab("submitted"); setSearch(""); }}
          className={`px-2.5 sm:px-4 py-2 whitespace-nowrap font-medium text-xs sm:text-sm transition-all border-b-2 ${
            activeTab === "submitted"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-400"
          }`}
        >
          <span className="hidden xs:inline">Awaiting</span>
          <span className="xs:hidden">Review</span> ({submittedReports?.length ?? 0})
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-700 px-2.5 sm:px-3 py-2 sm:py-2.5" style={{ backgroundColor: "#161b22" }}>
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="bg-transparent text-xs sm:text-sm text-slate-300 placeholder-slate-600 outline-none w-full"
          />
        </div>
        <button
          onClick={() => setSortBy(sortBy === "priority" ? "distance" : sortBy === "distance" ? "time" : "priority")}
          className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
          style={{ backgroundColor: "#161b22" }}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline capitalize">{sortBy}</span>
        </button>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <PatrolSkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => 
            renderReportCard(
              r, 
              activeTab === "assigned" 
                ? "admin" 
                : activeTab === "available" 
                  ? "available" 
                  : "submitted"
            )
          )}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">
            {activeTab === "assigned" 
              ? "No admin-assigned reports yet" 
              : activeTab === "available"
                ? "No available reports to self-assign"
                : "No submitted resolutions awaiting review"}
          </p>
        </div>
      )}
    </div>
  );
}

export default PatrolAssignedReports;