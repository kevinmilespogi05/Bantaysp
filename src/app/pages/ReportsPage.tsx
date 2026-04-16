import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Filter, MapPin, Clock, MessageSquare,
  ThumbsUp, X, Image, CheckCircle, Zap, Send, FileText,
  BadgeCheck, ChevronDown, AlertCircle,
} from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { useAuth } from "../context/AuthContext";
import {
  useApi, fetchReports, fetchComments, fetchUserUpvotes,
  upvoteReport, addComment, updateReportStatus,
  type Report, type Comment,
} from "../services/api";
import { SkeletonCard, EmptyState, ErrorState } from "../components/ui/DataStates";

// ─── Config ───────────────────────────────────────────────────────────────────

type TabKey = "all" | "pending" | "in_progress" | "accepted" | "resolved" | "rejected";

const tabs: { key: TabKey; label: string; color: string }[] = [
  { key: "all",         label: "All Reports",  color: "#800000" },
  { key: "pending",     label: "Pending",       color: "#d97706" },
  { key: "in_progress", label: "In Progress",   color: "#2563eb" },
  { key: "accepted",    label: "Accepted",      color: "#8b5cf6" },
  { key: "resolved",    label: "Resolved",      color: "#16a34a" },
  { key: "rejected",    label: "Rejected",      color: "#7c3aed" },
];

const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  pending:     { bg: "bg-amber-100", text: "text-amber-700",  icon: Clock,        label: "Pending" },
  in_progress: { bg: "bg-blue-100",  text: "text-blue-700",   icon: Zap,          label: "In Progress" },
  accepted:    { bg: "bg-purple-100", text: "text-purple-700", icon: BadgeCheck,   label: "Accepted" },
  resolved:    { bg: "bg-green-100", text: "text-green-700",  icon: CheckCircle,  label: "Resolved" },
  rejected:    { bg: "bg-purple-100", text: "text-purple-700", icon: AlertCircle, label: "Rejected" },
};

const priorityConfig: Record<string, { dot: string; badge: string; label: string }> = {
  high:   { dot: "#ef4444", badge: "bg-red-100 text-red-700",     label: "High" },
  medium: { dot: "#f59e0b", badge: "bg-amber-100 text-amber-700", label: "Medium" },
  low:    { dot: "#22c55e", badge: "bg-green-100 text-green-700", label: "Low" },
};

const REPORT_CATEGORIES = [
  "All Categories", "Suspicious Activity", "Infrastructure",
  "Environmental", "Public Disturbance", "Natural Disaster",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { debouncedQuery } = useSearch();

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [localSearch, setLocalSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Optimistic upvote state derived from fetched data
  const [upvoteMap, setUpvoteMap] = useState<Record<string, number>>({});
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  // Local comments state — keyed by report id, seeded from API
  const [commentMap, setCommentMap] = useState<Record<string, Comment[]>>({});

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: reports, loading: reportsLoading, error: reportsError, refetch } = useApi(fetchReports);

  // Fetch comments for selected report
  const { data: fetchedComments, loading: commentsLoading } = useApi(
    () => selectedReport ? fetchComments(selectedReport.id) : Promise.resolve({ data: [], error: null }),
    [selectedReport?.id]
  );

  // Fetch current user's upvoted reports
  const { data: userUpvotedIds } = useApi(() => fetchUserUpvotes(), []);

  // Seed upvoteMap when data loads
  useEffect(() => {
    if (reports) {
      setUpvoteMap(Object.fromEntries(reports.map((r) => [r.id, r.upvotes])));
    }
  }, [reports]);

  // Seed upvoted set when user's upvoted reports are fetched
  useEffect(() => {
    if (userUpvotedIds) {
      setUpvoted(new Set(userUpvotedIds));
    }
  }, [userUpvotedIds]);

  // Seed comment map for selected report when API returns
  useEffect(() => {
    if (selectedReport && fetchedComments) {
      setCommentMap((prev) => ({
        ...prev,
        [selectedReport.id]: fetchedComments,
      }));
    }
  }, [fetchedComments, selectedReport?.id]);

  // Sync header search → local
  useEffect(() => {
    if (debouncedQuery) setLocalSearch(debouncedQuery);
  }, [debouncedQuery]);

  // ── Derived filtered list ─────────────────────────────────────────────────
  const filtered = (reports ?? []).filter((r) => {
    const q = localSearch.toLowerCase();
    const matchTab = activeTab === "all" || r.status === activeTab;
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    const matchCat = category === "All Categories" || r.category === category;
    return matchTab && matchSearch && matchCat;
  });

  const counts: Record<TabKey, number> = {
    all:         (reports ?? []).length,
    pending:     (reports ?? []).filter((r) => r.status === "pending").length,
    in_progress: (reports ?? []).filter((r) => r.status === "in_progress").length,
    accepted:    (reports ?? []).filter((r) => r.status === "accepted").length,
    resolved:    (reports ?? []).filter((r) => r.status === "resolved").length,
    rejected:    (reports ?? []).filter((r) => r.status === "rejected").length,
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleUpvote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const wasUp = upvoted.has(id);
    // Optimistic UI update
    setUpvoted((prev) => {
      const next = new Set(prev);
      wasUp ? next.delete(id) : next.add(id);
      return next;
    });
    setUpvoteMap((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + (wasUp ? -1 : 1) }));
    // Persist to server
    const { data } = await upvoteReport(id, wasUp ? "remove" : "add");
    if (data) setUpvoteMap((prev) => ({ ...prev, [id]: data.upvotes }));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedReport) return;
    setCommentSubmitting(true);
    const { data, error } = await addComment(selectedReport.id, {
      author: `${user.first_name} ${user.last_name}`,
      avatar: user.avatar,
      text: newComment.trim(),
    });
    if (data && !error) {
      setCommentMap((prev) => ({
        ...prev,
        [selectedReport.id]: [...(prev[selectedReport.id] ?? []), data],
      }));
    }
    setNewComment("");
    setCommentSubmitting(false);
  };

  const handleStatusUpdate = async (newStatus: string | boolean, isVerification: boolean = false) => {
    if (!selectedReport) return;
    setUpdatingStatus(true);
    setUpdateError(null);

    const updateData = isVerification ? { verified: newStatus } : { status: newStatus };

    const { data, error } = await updateReportStatus(selectedReport.id, updateData);

    if (error) {
      setUpdateError(error);
      setUpdatingStatus(false);
      return;
    }

    if (data) {
      // Update selected report
      setSelectedReport(data);
      // Refresh reports list
      refetch();
    }

    setUpdatingStatus(false);
    setStatusDropdownOpen(false);
  };

  const reportComments = selectedReport ? (commentMap[selectedReport.id] ?? []) : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-gray-900 font-semibold" style={{ fontSize: "1.15rem" }}>Community Reports</h2>
          <p className="text-gray-400 text-sm">{reportsLoading ? "Loading..." : `${filtered.length} report${filtered.length !== 1 ? "s" : ""} found`}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={() => navigate("/app/reports/create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all shadow-sm hover:scale-105 min-h-[44px]"
            style={{ backgroundColor: "#800000" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Report</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span
              className="px-1.5 py-0.5 rounded-md text-xs font-semibold"
              style={{
                backgroundColor: activeTab === tab.key ? `${tab.color}15` : "transparent",
                color: activeTab === tab.key ? tab.color : "#9ca3af",
              }}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search by title, category, location..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none"
          onFocus={(e) => (e.target.style.borderColor = "#800000")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
        <AnimatePresence>
          {showFilters && (
            <motion.select
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none min-h-[44px]"
            >
              {REPORT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </motion.select>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      {reportsLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : reportsError ? (
        <ErrorState message={reportsError} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={localSearch || category !== "All Categories" ? "No matching reports" : "No reports yet"}
          description={localSearch || category !== "All Categories"
            ? "Try adjusting your search or filters"
            : "Be the first to file a community report"}
          action={
            !localSearch && category === "All Categories" ? (
              <button
                onClick={() => navigate("/app/reports/create")}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white"
                style={{ backgroundColor: "#800000" }}
              >
                <Plus className="w-4 h-4" /> File a Report
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((report, i) => {
              const status = statusConfig[report.status];
              const priority = priorityConfig[report.priority];
              const StatusIcon = status.icon;
              const isUpvoted = upvoted.has(report.id);

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { setSelectedReport(report); setShowComments(false); }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group overflow-hidden"
                >
                  {report.image_url ? (
                    <div className="h-36 overflow-hidden">
                      <img src={report.image_url} alt={report.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-12 flex items-center justify-center" style={{ backgroundColor: "#80000008" }}>
                      <Image className="w-4 h-4 text-gray-300" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priority.dot }} />
                        <span className="text-gray-400 text-xs font-medium">{report.id}</span>
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2" style={{ fontSize: "0.9rem" }}>
                      {report.title}
                    </h3>

                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs">{report.category}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs ${priority.badge}`}>{priority.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{report.location}</span>
                    </div>

                    <div className="flex items-center justify-between text-gray-400">
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={(e) => handleUpvote(e, report.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all min-h-[32px] ${isUpvoted ? "text-white" : "hover:bg-gray-100 text-gray-400"}`}
                          style={isUpvoted ? { backgroundColor: "#800000" } : {}}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{upvoteMap[report.id] ?? 0}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{(commentMap[report.id]?.length) ?? report.comments}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {new Date(report.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Detail Slide Panel ── */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 w-screen h-screen bg-black/50 z-40"
              onClick={() => setSelectedReport(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 flex flex-col shadow-2xl"
            >
              {selectedReport.image_url && (
                <div className="h-52 overflow-hidden relative shrink-0">
                  <img src={selectedReport.image_url} alt={selectedReport.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-gray-400 text-xs mb-1">{selectedReport.id} · {selectedReport.category}</div>
                      <h2 className="text-gray-900 font-semibold" style={{ fontSize: "1.1rem" }}>{selectedReport.title}</h2>
                    </div>
                    <button onClick={() => setSelectedReport(null)} className="p-2 rounded-xl hover:bg-gray-100 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(() => {
                      const s = statusConfig[selectedReport.status];
                      const SI = s.icon;
                      return <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}><SI className="w-3.5 h-3.5" />{s.label}</span>;
                    })()}
                    {selectedReport.verified && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig[selectedReport.priority].badge}`}>
                      {priorityConfig[selectedReport.priority].label} Priority
                    </span>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />{selectedReport.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      {new Date(selectedReport.timestamp).toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedReport.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mb-5">
                    <button
                      onClick={(e) => handleUpvote(e, selectedReport.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all min-h-[44px] text-sm font-medium"
                      style={upvoted.has(selectedReport.id)
                        ? { backgroundColor: "#800000", borderColor: "#800000", color: "white" }
                        : { borderColor: "#e5e7eb", color: "#374151" }}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {upvoted.has(selectedReport.id) ? "Upvoted" : "Upvote"} ({upvoteMap[selectedReport.id] ?? 0})
                    </button>
                    <button
                      onClick={() => setShowComments(!showComments)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-all min-h-[44px]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Comments ({reportComments.length})
                    </button>
                  </div>

                  {/* Patrol/Admin Controls */}
                  {(user.role === "patrol" || user.role === "admin") && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <h3 className="font-semibold text-amber-900 text-sm">Report Management</h3>
                      </div>

                      {/* Status Update */}
                      <div className="relative">
                        <button
                          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                          disabled={updatingStatus}
                          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-amber-300 rounded-lg text-amber-900 text-sm hover:bg-amber-50 disabled:opacity-50 transition-colors"
                        >
                          <span className="font-medium">Update Status</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {statusDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-amber-300 rounded-lg shadow-lg z-10">
                            {["pending", "in_progress", "resolved", "rejected"].map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusUpdate(s)}
                                disabled={updatingStatus}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-amber-50 disabled:opacity-50 transition-colors ${
                                  selectedReport.status === s ? "bg-amber-100 font-medium" : ""
                                }`}
                              >
                                {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Verification Toggle */}
                      <button
                        onClick={() => handleStatusUpdate(!selectedReport.verified)}
                        disabled={updatingStatus}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                          selectedReport.verified
                            ? "bg-green-100 text-green-900 hover:bg-green-200"
                            : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <BadgeCheck className="w-4 h-4" />
                          {selectedReport.verified ? "Verified ✓" : "Mark as Verified"}
                        </span>
                      </button>

                      {selectedReport.verified && (
                        <div className="text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded border border-green-200">
                          ✓ Reporter earns +50 civic points when verified
                        </div>
                      )}

                      {updateError && (
                        <div className="text-xs text-red-700 bg-red-50 px-2 py-1.5 rounded border border-red-200">
                          Error: {updateError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comments */}
                  <AnimatePresence>
                    {showComments && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 pt-4">
                          <h4 className="font-semibold text-gray-900 text-sm mb-3">
                            Comments ({commentsLoading ? "…" : reportComments.length})
                          </h4>
                          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                            {commentsLoading ? (
                              Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="flex items-start gap-3 animate-pulse">
                                  <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                                  <div className="flex-1 bg-gray-100 rounded-xl p-3 space-y-1.5">
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 rounded w-full" />
                                  </div>
                                </div>
                              ))
                            ) : reportComments.length === 0 ? (
                              <p className="text-gray-400 text-sm text-center py-4">No comments yet. Be the first!</p>
                            ) : (
                              reportComments.map((c) => (
                                <div key={c.id} className="flex items-start gap-3">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
                                    {c.avatar}
                                  </div>
                                  <div className="flex-1 bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-gray-900">{c.author}</span>
                                      <span className="text-xs text-gray-400">{c.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{c.text}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add comment */}
                          <div className="flex gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1" style={{ backgroundColor: "#800000" }}>
                              {user.avatar}
                            </div>
                            <div className="flex-1 flex gap-2">
                              <input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none"
                                onFocus={(e) => (e.target.style.borderColor = "#800000")}
                                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                              />
                              <button
                                onClick={handleAddComment}
                                disabled={!newComment.trim() || commentSubmitting}
                                className="p-2 rounded-xl text-white transition-all disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                style={{ backgroundColor: "#800000" }}
                              >
                                {commentSubmitting
                                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  : <Send className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Timeline (when comments are hidden) */}
                  {!showComments && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">Status Timeline</h4>
                      <div className="space-y-3">
                        {[
                          { label: "Report Submitted", done: true },
                          { label: "Under Review", done: true },
                          { label: "Assigned to Team", done: selectedReport.status !== "pending" },
                          { label: "Resolved", done: selectedReport.status === "resolved" },
                        ].map((t, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${t.done ? "" : "border-2 border-gray-200"}`}
                              style={{ backgroundColor: t.done ? "#800000" : "transparent" }}
                            >
                              {t.done && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm flex-1 ${t.done ? "font-medium text-gray-900" : "text-gray-400"}`}>{t.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}