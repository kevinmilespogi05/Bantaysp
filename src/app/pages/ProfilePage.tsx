import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Settings, Trophy, CheckCircle, Shield, Star, Zap, Award,
  MapPin, Mail, Phone, Calendar, Edit3, BadgeCheck,
  FileText, Lock, Bell, Eye, ThumbsUp, X, Image, MessageSquare,
  Clock, Send, AlertCircle, ChevronDown, Sparkles, type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApi, fetchUserProfile, updateProfile, fetchUserReports, fetchComments, fetchUserUpvotes, upvoteReport, addComment, updateReportStatus, type Report, type Comment } from "../services/api";
import { PageSpinner, EmptyState } from "../components/ui/DataStates";
import { ImageViewerModal } from "../components/ui/ImageViewerModal";

const achievementIcons: Record<string, any> = {
  zap: Zap,
  shield: Shield,
  award: Award,
  star: Star,
  "badge-check": BadgeCheck,
  "check-circle": CheckCircle,
  trophy: Trophy,
};

const achievementPoints: Record<number, number> = {
  1: 50,  // First Responder
  2: 100, // Verified Citizen
  3: 150, // Community Guardian
  4: 100, // Point Collector
  5: 250, // Safety Champion
  6: 200, // Problem Solver
  7: 300, // Silver Contributor
  8: 500, // Top Reporter
  9: 500, // Gold Achiever
};

type TabKey = "overview" | "reports" | "achievements" | "settings";

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: User },
  { key: "reports", label: "My Reports", icon: FileText },
  { key: "achievements", label: "Achievements", icon: Trophy },
  { key: "settings", label: "Settings", icon: Settings },
];

const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  pending_verification: { bg: "bg-amber-100", text: "text-amber-700",  icon: Clock,        label: "Pending Verification" },
  approved:    { bg: "bg-blue-100",  text: "text-blue-700",   icon: BadgeCheck,   label: "Approved" },
  in_progress: { bg: "bg-cyan-100",  text: "text-cyan-700",   icon: Zap,          label: "In Progress" },
  accepted:    { bg: "bg-yellow-100", text: "text-yellow-700", icon: CheckCircle,  label: "Accepted" },
  submitted:   { bg: "bg-purple-100", text: "text-purple-700", icon: FileText,     label: "Submitted" },
  resolved:    { bg: "bg-green-100", text: "text-green-700",  icon: CheckCircle,  label: "Resolved" },
  rejected:    { bg: "bg-red-100",    text: "text-red-700",    icon: AlertCircle,  label: "Rejected" },
};

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "", bio: "" });
  const [notifications, setNotifications] = useState({
    email: true, push: true, sms: false, announcements: true, reportUpdates: true,
  });

  const [unlockedToast, setUnlockedToast] = useState<{ name: string; desc: string; icon: string; pts: number } | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<"all" | "completed" | "in_progress" | "locked">("all");

  React.useEffect(() => {
    if (unlockedToast) {
      const timer = setTimeout(() => {
        setUnlockedToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [unlockedToast]);

  const getMockRarity = (id: number): { percent: number; isRare: boolean } => {
    const rarities: Record<number, number> = {
      1: 45.8, // First Responder
      2: 24.3, // Verified Citizen
      3: 12.5, // Community Guardian (Rare)
      4: 32.1, // Point Collector
      5: 8.4,  // Safety Champion (Rare)
      6: 15.6, // Problem Solver
      7: 5.2,  // Silver Contributor (Rare)
      8: 2.1,  // Top Reporter (Ultra Rare)
      9: 0.8,  // Gold Achiever (Ultra Rare)
    };
    const val = rarities[id] || 15.0;
    return { percent: val, isRare: val < 15.0 };
  };

  const getMockCompletionDate = (id: number): string => {
    const dates: Record<number, string> = {
      1: "Aug 12, 2025 at 2:15 PM",
      2: "Sep 05, 2025 at 9:30 AM",
      3: "Oct 18, 2025 at 4:45 PM",
      4: "Nov 01, 2025 at 11:20 AM",
      5: "Jan 14, 2026 at 3:10 PM",
      6: "Feb 28, 2026 at 6:15 PM",
      7: "Apr 02, 2026 at 8:05 AM",
      8: "May 10, 2026 at 9:50 PM",
      9: "May 24, 2026 at 11:32 AM",
    };
    return dates[id] || "May 25, 2026 at 12:00 PM";
  };

  const handleCardClick = (ach: any, status: "completed" | "in_progress" | "locked", pts: number) => {
    if (status === "completed") {
      setUnlockedToast({ name: ach.name, desc: ach.description, icon: ach.icon, pts });
    } else if (status === "in_progress") {
      setUnlockedToast({ name: ach.name, desc: `Keep going! Complete requirements to unlock.`, icon: ach.icon, pts });
    } else {
      setUnlockedToast({ name: ach.name, desc: `Locked! Start this task to unlock rewards.`, icon: ach.icon, pts });
    }
  };

  // Report modal state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Optimistic upvote state
  const [upvoteMap, setUpvoteMap] = useState<Record<string, number>>({});
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  // Local comments state
  const [commentMap, setCommentMap] = useState<Record<string, Comment[]>>({});

  // Fetch extended profile data (bio, achievements, points, etc.)
  // Production: GET /api/profile using auth token
  // Only fetch if user.id exists to avoid calling /profile/ without an ID
  const { data: profileData, loading: profileLoading } = useApi(
    () => (user.id ? fetchUserProfile(user.id) : Promise.resolve({ data: null, error: null })),
    [user.id]
  );

  // Fetch user's own reports
  const { data: userReports, loading: reportsLoading, error: reportsError, refetch: refetchUserReports } = useApi(fetchUserReports);

  // Fetch comments for selected report
  const { data: fetchedComments, loading: commentsLoading } = useApi(
    () => selectedReport ? fetchComments(selectedReport.id) : Promise.resolve({ data: [], error: null }),
    [selectedReport?.id]
  );

  // Fetch current user's upvoted reports
  const { data: userUpvotedIds } = useApi(() => fetchUserUpvotes(), []);

  // Seed upvoteMap when reports load
  React.useEffect(() => {
    if (userReports) {
      setUpvoteMap(Object.fromEntries(userReports.map((r) => [r.id, r.upvotes])));
    }
  }, [userReports]);

  // Seed upvoted set when user's upvoted reports are fetched
  React.useEffect(() => {
    if (userUpvotedIds) {
      setUpvoted(new Set(userUpvotedIds));
    }
  }, [userUpvotedIds]);

  // Seed comment map for selected report when API returns
  React.useEffect(() => {
    if (selectedReport && fetchedComments) {
      setCommentMap((prev) => ({
        ...prev,
        [selectedReport.id]: fetchedComments,
      }));
    }
  }, [fetchedComments, selectedReport?.id]);

  // Use auth user as base, override with extended profile where available
  const displayUser = {
    firstName: user.first_name || "User",
    lastName: user.last_name || "",
    avatar: user.avatar,
    barangay: user.barangay,
    role: user.role,
    points: profileData?.points ?? 0,
    reports: profileData?.reports ?? 0,
    badge: profileData?.badge ?? "Member",
    verified: profileData?.verified ?? false,
    joined: profileData?.joined ?? "—",
    bio: profileData?.bio ?? "",
    phone: profileData?.phone ?? "",
    achievements: profileData?.achievements ?? [],
    dateOfBirth: profileData?.date_of_birth ?? null,
    age: profileData?.age ?? null,
  };

  // Initialize edit form when user starts editing
  const handleStartEdit = () => {
    setEditForm({
      firstName: displayUser.firstName,
      lastName: displayUser.lastName,
      phone: displayUser.phone,
      bio: displayUser.bio,
    });
    setEditing(true);
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    if (!user.id) return;
    setSaving(true);
    
    const { error } = await updateProfile(user.id, {
      first_name: editForm.firstName,
      last_name: editForm.lastName,
      phone: editForm.phone,
      bio: editForm.bio,
    });

    setSaving(false);
    if (!error) {
      setEditing(false);
      // Optionally, refetch the profile to ensure latest data
      window.location.reload();
    }
  };

  // ── Report Modal Actions ─────────────────────────────────────────────────────

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

    const updateData = isVerification
      ? { verified: newStatus as boolean }
      : { status: newStatus as "rejected" | "in_progress" | "resolved" | "accepted" | "pending" };

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
      refetchUserReports();
    }

    setUpdatingStatus(false);
    setStatusDropdownOpen(false);
  };

  const reportComments = selectedReport ? (commentMap[selectedReport.id] ?? []) : [];

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover photo */}
        <div className="h-36 sm:h-44 relative" style={{ background: "linear-gradient(135deg, #800000, #600000)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        </div>

        {/* Avatar row — overlaps cover with negative margin */}
        <div className="px-5 sm:px-6 pb-5">
          <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12 mb-5">
            {/* Avatar */}
            <div className="relative shrink-0 self-start">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white font-bold border-4 border-white shadow-lg"
                style={{ fontSize: "1.5rem", backgroundColor: "#800000" }}
              >
                {displayUser.avatar}
              </div>
            </div>

            {/* Name + badges — always below avatar, never overlapping cover */}
            <div className="flex-1 pt-2 sm:pt-0 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-gray-900" style={{ fontSize: "1.2rem" }}>{displayUser.firstName} {displayUser.lastName}</h2>
                {displayUser.verified && (
                  <div className="flex items-center gap-1 bg-blue-50 rounded-full px-2 py-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-700" style={{ fontSize: "11px" }}>Verified</span>
                  </div>
                )}
                <div className="flex items-center gap-1 bg-amber-50 rounded-full px-2 py-0.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700" style={{ fontSize: "11px" }}>{displayUser.badge} Reporter</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {displayUser.barangay}
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => editing ? setEditing(false) : handleStartEdit()}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-all shrink-0 sm:mb-1 min-h-[44px]"
            >
              <Edit3 className="w-4 h-4" />
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-gray-50">
            {[
              { label: "Reports", value: displayUser.reports, icon: FileText, color: "#800000" },
              { label: "Points", value: displayUser.points.toLocaleString(), icon: Star, color: "#d97706" },
              { label: "Rank", value: "#2", icon: Trophy, color: "#6b7280" },
              { label: "Achievements", value: displayUser.achievements.filter((a) => a.earned).length, icon: Award, color: "#7c3aed" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                <div className="font-bold text-gray-900">{s.value}</div>
                <div className="text-gray-400" style={{ fontSize: "11px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid xl:grid-cols-3 gap-6"
          >
            {/* Info Card */}
            <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
              <h3 className="font-semibold text-gray-900">Personal Information</h3>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input 
                        value={editForm.firstName} 
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input 
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input 
                      value={editForm.phone}
                      onChange={(e) => {
                        // Allow only digits and limit to 11 characters
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setEditForm({ ...editForm, phone: digitsOnly });
                      }}
                      placeholder="09XX XXX XXXX"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                      onFocus={(e) => (e.target.style.borderColor = "#800000")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      inputMode="numeric" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea 
                      rows={3} 
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none resize-none"
                      onFocus={(e) => (e.target.style.borderColor = "#800000")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                  </div>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-70"
                    style={{ backgroundColor: "#800000" }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    {displayUser.firstName} {displayUser.lastName}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    {displayUser.phone || "Not provided"}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    {displayUser.barangay}, Castillejos, Zambales
                  </div>
                  {displayUser.dateOfBirth && (
                    <div className="flex items-center gap-3 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        {new Date(displayUser.dateOfBirth).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                        {displayUser.age !== null && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#80000015", color: "#800000" }}>
                            {displayUser.age} yrs old
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm leading-relaxed">{displayUser.bio || "No bio added yet"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side */}
            <div className="space-y-5">
              {/* Civic Score */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Civic Score</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Total Points</span>
                  <span className="font-bold text-lg" style={{ color: "#800000" }}>{displayUser.points.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: Math.min((displayUser.points / 5000) * 100, 100) + "%", backgroundColor: "#d97706" }} />
                </div>
                <p className="text-gray-400 text-xs">{Math.max(5000 - displayUser.points, 0).toLocaleString()} more points until Diamond tier</p>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {displayUser.points > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#80000015" }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: "#800000" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">{displayUser.reports} report(s) filed</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">active</span>
                    </div>
                  )}
                  {displayUser.points > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#d9770615" }}>
                        <Star className="w-3.5 h-3.5" style={{ color: "#d97706" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">Earned {displayUser.points} points</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">recently</span>
                    </div>
                  )}
                  {displayUser.verified && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#16a34a15" }}>
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">Verified member</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">✓</span>
                    </div>
                  )}
                  {!displayUser.points && !displayUser.reports && (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">No activity yet. File your first report to get started! 🎯</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-3"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reportsError ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                  <p className="text-red-700 font-medium">Failed to load reports</p>
                  <p className="text-red-600 text-sm mt-1">{reportsError}</p>
                </div>
              ) : !userReports || userReports.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No reports yet</h3>
                  <p className="text-gray-500 text-sm mb-4">You haven't filed any reports yet. Start making your community safer!</p>
                  <button
                    onClick={() => navigate("/app/reports/create")}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    File Your First Report
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {userReports.map((report, i) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => { setSelectedReport(report); setShowComments(false); }}
                    >
                      {report.image_url && (
                        <div className="mb-4 overflow-hidden rounded-2xl h-40">
                          <img
                            src={report.image_url}
                            alt={report.title}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">{report.title}</h3>
                          <p className="text-gray-500 text-xs">{report.category} • {report.location}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          report.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          report.status === 'approved' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {report.status.replace('_', ' ')}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{report.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                        <div className="flex items-center gap-3">
                          {report.comments > 0 && (
                            <span className="flex items-center gap-1">
                              💬 {report.comments}
                            </span>
                          )}
                          {report.upvotes > 0 && (
                            <span className="flex items-center gap-1">
                              👍 {report.upvotes}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (() => {
          const achievements = displayUser.achievements || [];
          const totalCount = achievements.length;
          const completedAchievements = achievements.filter((a) => a.earned);
          const completedCount = completedAchievements.length;
          const inProgressAchievements = achievements.filter((a) => !a.earned && (a.progress ?? 0) > 0);
          const lockedAchievements = achievements.filter((a) => !a.earned && (a.progress ?? 0) === 0);
          
          const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          
          // Calculate achievement points
          const achievementPointsEarned = completedAchievements.reduce((sum, a) => sum + (achievementPoints[a.id] || 0), 0);
          const totalPossiblePoints = achievements.reduce((sum, a) => sum + (achievementPoints[a.id] || 0), 0);
          
          // Sort logic: Completed first, then In Progress, then Locked
          const getStatusScore = (ach: any) => {
            if (ach.earned) return 2;
            if ((ach.progress ?? 0) > 0) return 1;
            return 0;
          };

          const sortedAchievements = [...achievements].sort((a, b) => {
            const scoreA = getStatusScore(a);
            const scoreB = getStatusScore(b);
            if (scoreA !== scoreB) {
              return scoreB - scoreA; // Descending: 2, then 1, then 0
            }
            return a.id - b.id; // Secondary sorting by ID
          });

          // Filter logic based on UI filter state
          const filteredAchievements = sortedAchievements.filter((ach) => {
            if (achievementFilter === "all") return true;
            if (achievementFilter === "completed") return ach.earned;
            if (achievementFilter === "in_progress") return !ach.earned && (ach.progress ?? 0) > 0;
            if (achievementFilter === "locked") return !ach.earned && (ach.progress ?? 0) === 0;
            return true;
          });

          const renderAchievementCard = (ach: any, idx: number) => {
            const Icon = achievementIcons[ach.icon] || Star;
            const pts = achievementPoints[ach.id] || 50;
            const progressVal = ach.progress ?? 0;
            const totalVal = ach.total ?? 1;
            const progressPct = Math.min((progressVal / totalVal) * 100, 100);
            
            const isCompleted = ach.earned;
            const isInProgress = !ach.earned && progressVal > 0;
            const isLocked = !ach.earned && progressVal === 0;
            
            const { percent: rarityPct, isRare } = getMockRarity(ach.id);
            const completionDate = getMockCompletionDate(ach.id);

            let status: "completed" | "in_progress" | "locked" = "locked";
            if (isCompleted) status = "completed";
            else if (isInProgress) status = "in_progress";

            // Styling based on status
            let cardClasses = "";
            let iconContainerClasses = "";
            let iconClasses = "";
            let progressBarColor = "";
            let progressTrackColor = "bg-slate-950";
            let rarityClasses = "";
            let rewardTagClasses = "";

            if (isCompleted) {
              if (isRare) {
                cardClasses = "bg-gradient-to-br from-[#1b150c]/90 to-[#121216]/95 border-amber-500/40 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.06)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]";
                iconContainerClasses = "border-amber-400 bg-gradient-to-br from-[#30200c] to-[#121216] text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse";
                iconClasses = "text-amber-400 drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]";
                progressBarColor = "bg-gradient-to-r from-amber-500 to-yellow-400";
                rarityClasses = "text-amber-400 font-bold flex items-center gap-1";
                rewardTagClasses = "bg-amber-400/20 text-amber-400 border border-amber-400/30";
              } else {
                cardClasses = "bg-gradient-to-br from-[#0c1b12]/90 to-[#121216]/95 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.06)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]";
                iconContainerClasses = "border-emerald-400 bg-gradient-to-br from-[#0c301b] to-[#121216] text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
                iconClasses = "text-emerald-400 drop-shadow-[0_2px_6px_rgba(16,185,129,0.4)]";
                progressBarColor = "bg-gradient-to-r from-emerald-500 to-teal-400";
                rarityClasses = "text-gray-400 font-semibold";
                rewardTagClasses = "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30";
              }
            } else if (isInProgress) {
              cardClasses = "bg-gradient-to-br from-[#1c0c0c]/90 to-[#121216]/95 border-red-700/40 hover:border-red-500 shadow-md hover:shadow-[0_0_15px_rgba(128,0,0,0.15)]";
              iconContainerClasses = "border-red-500 bg-gradient-to-br from-[#3a0d0d] to-[#121216] text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
              iconClasses = "text-red-400";
              progressBarColor = "bg-gradient-to-r from-red-600 to-rose-500 animate-pulse";
              rarityClasses = "text-gray-500";
              rewardTagClasses = "bg-red-400/10 text-red-400 border border-red-400/20";
            } else {
              // locked
              cardClasses = "bg-gradient-to-br from-[#1b0a0a]/50 to-[#120505]/60 border-red-950/40 opacity-55 hover:opacity-75 transition-opacity";
              iconContainerClasses = "border-red-950/50 bg-red-950/20 text-red-900/60";
              iconClasses = "text-red-900/50 filter blur-[0.3px]";
              progressBarColor = "bg-red-950";
              rarityClasses = "text-gray-600";
              rewardTagClasses = "bg-red-950/30 text-red-400 border border-red-950/40";
            }

            // Map custom unit label for counter
            let unitLabel = "Reports";
            if (ach.id === 2) {
              unitLabel = "Verified";
            } else if (ach.id === 4 || ach.id === 7 || ach.id === 9) {
              unitLabel = "Points";
            } else if (ach.id === 6) {
              unitLabel = "Resolved";
            }

            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => handleCardClick(ach, status, pts)}
                className={`rounded-xl p-4 sm:p-5 border transition-all flex flex-col justify-between cursor-pointer select-none text-white relative group overflow-hidden ${cardClasses}`}
              >
                {/* Horizontal Layout block */}
                <div className="flex gap-4 items-start">
                  {/* Badge Frame */}
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 border-2 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 ${iconContainerClasses}`}>
                    <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${iconClasses}`} />
                  </div>
                  
                  {/* Content Right */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <h5 className={`font-bold text-sm sm:text-base tracking-tight ${isLocked ? "text-gray-400 font-medium" : "text-white"}`}>
                        {ach.name}
                      </h5>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 tracking-wide uppercase ${rewardTagClasses}`}>
                        +{pts} XP
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1 leading-normal line-clamp-2">{ach.description}</p>
                  </div>
                </div>

                {/* Progress bar and details underneath (Steam Layout) */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                  {/* Progress Slider */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className={isCompleted ? "text-emerald-400 font-semibold" : isInProgress ? "text-red-400 font-semibold" : "text-gray-500 font-medium"}>
                        {ach.id === 2 ? (progressVal === 1 ? "Account Verified" : "Verification Pending") : `${progressVal.toLocaleString()} / ${totalVal.toLocaleString()} ${unitLabel}`}
                      </span>
                      <span className={`font-semibold ${isCompleted ? "text-emerald-400" : isInProgress ? "text-red-400" : "text-gray-500"}`}>
                        {Math.round(progressPct)}%
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden border border-slate-900/50 ${progressTrackColor}`}>
                      <motion.div
                        className={`h-full rounded-full ${progressBarColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Date & Rarity */}
                  <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-gray-500 pt-1">
                    <div className="flex items-center gap-1 truncate max-w-[65%]">
                      {isCompleted ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">Unlocked on {completionDate}</span>
                        </>
                      ) : isInProgress ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>In Progress...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                          <span>Locked</span>
                        </>
                      )}
                    </div>
                    <div className={`shrink-0 ${rarityClasses}`}>
                      {isRare && <Sparkles className="w-3 h-3 text-amber-400 inline shrink-0 mr-0.5" />}
                      {rarityPct}% residents unlocked
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          };

          return (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Overall Achievement Summary Banner (Charcoal Gradient with red highlights) */}
              <div 
                className="relative rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-950 overflow-hidden text-white flex flex-col md:flex-row md:items-center justify-between gap-6"
                style={{ background: "linear-gradient(135deg, #121216, #201010)" }}
              >
                {/* Glowing red accent lights */}
                <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-red-900/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-red-900/10 blur-2xl pointer-events-none" />

                <div className="flex items-center gap-5 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#800000] to-red-950 border border-red-900/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(128,0,0,0.3)]">
                    <Trophy className="w-9 h-9 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)] animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Achievements Gallery</h3>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-md leading-relaxed">
                      Complete community safety targets to collect reward points, level up your civic rank, and safeguard Barangay San Pablo.
                    </p>
                  </div>
                </div>

                {/* Circular completion tracker */}
                <div className="flex items-center gap-6 z-10 shrink-0 border-t border-slate-800/60 md:border-t-0 pt-4 md:pt-0">
                  <div className="text-left md:text-right">
                    <div className="text-xs text-red-400 font-semibold uppercase tracking-wider">Completion Status</div>
                    <div className="text-3xl font-black tracking-tight mt-1">{completionPercentage}%</div>
                    <div className="text-xs text-gray-400 mt-1">{completedCount} of {totalCount} Completed</div>
                  </div>
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle 
                        cx="32" 
                        cy="32" 
                        r="26" 
                        className="text-slate-800" 
                        strokeWidth="5" 
                        stroke="currentColor" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="32" 
                        cy="32" 
                        r="26" 
                        className="text-[#800000] transition-all duration-1000 ease-out" 
                        strokeWidth="5" 
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - completionPercentage / 100)}
                        strokeLinecap="round"
                        stroke="currentColor" 
                        fill="transparent" 
                        style={{ filter: "drop-shadow(0 0 4px rgba(128,0,0,0.5))" }}
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-red-400">{completedCount}/{totalCount}</span>
                  </div>
                </div>
              </div>

              {/* Summary Master Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#230909]/95 to-[#160505]/95 backdrop-blur-md border border-red-900/40 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-medium">Unlocked XP</div>
                    <div className="text-lg font-bold text-white mt-0.5">{achievementPointsEarned} <span className="text-gray-500 text-xs">/ {totalPossiblePoints} XP</span></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#230909]/95 to-[#160505]/95 backdrop-blur-md border border-red-900/40 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-medium">Total Civic Points</div>
                    <div className="text-lg font-bold text-white mt-0.5">{displayUser.points.toLocaleString()} XP</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#230909]/95 to-[#160505]/95 backdrop-blur-md border border-red-900/40 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-medium">Current Civic Rank</div>
                    <div className="text-lg font-bold text-white mt-0.5">#2 <span className="text-gray-500 text-xs">overall</span></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#230909]/95 to-[#160505]/95 backdrop-blur-md border border-red-900/40 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-medium">Civic Tier Status</div>
                    <div className="text-lg font-bold text-white mt-0.5">{displayUser.badge} <span className="text-gray-500 text-xs">Reporter</span></div>
                  </div>
                </div>
              </div>

              {/* Master Dashboard Progress bar */}
              <div className="bg-gradient-to-br from-[#230909]/95 to-[#160505]/95 backdrop-blur-md border border-red-900/40 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Master Gallery Progress</span>
                  <span className="text-red-400 font-bold">{completionPercentage}% Completed</span>
                </div>
                <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-red-950/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#800000] to-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Filter Tabs for achievements */}
              <div className="flex items-center gap-2 border-b border-red-900/20 pb-3 overflow-x-auto">
                {[
                  { key: "all", label: "All Achievements", count: totalCount },
                  { key: "completed", label: "Unlocked", count: completedCount },
                  { key: "in_progress", label: "In Progress", count: inProgressAchievements.length },
                  { key: "locked", label: "Locked", count: lockedAchievements.length },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAchievementFilter(item.key as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                      achievementFilter === item.key
                        ? "bg-[#800000] text-white shadow-md shadow-red-950/40"
                        : "bg-[#1e0707]/80 text-gray-400 hover:text-white border border-red-950/80 hover:border-red-900/50 hover:bg-[#280a0a]/80"
                    }`}
                  >
                    {item.label}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      achievementFilter === item.key
                        ? "bg-white/20 text-white"
                        : "bg-red-950/85 text-red-300"
                    }`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Consolidated 2-column Grid of achievement cards */}
              <div className="bg-gradient-to-b from-[#2d0a0a]/90 to-[#150404]/95 backdrop-blur-md border border-red-900/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-300/80 uppercase tracking-widest font-semibold">
                    Displaying {filteredAchievements.length} achievements (sorted by completion)
                  </span>
                  {completedCount > 0 && achievementFilter === "all" && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                      ✓ Completed achievements moved to top
                    </span>
                  )}
                </div>
                {filteredAchievements.length === 0 ? (
                  <div className="bg-[#1e0707]/30 border border-dashed border-red-900/40 rounded-2xl p-10 text-center text-gray-500 text-sm">
                    No achievements match the selected filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredAchievements.map((ach, idx) => renderAchievementCard(ach, idx))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid xl:grid-cols-2 gap-6"
          >
            {/* Notification Settings */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4" style={{ color: "#800000" }} />
                <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
              </div>
              <div className="space-y-4">
                {[
                  { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                  { key: "push", label: "Push Notifications", desc: "Browser and mobile alerts" },
                  { key: "sms", label: "SMS Alerts", desc: "Text messages for urgent alerts" },
                  { key: "announcements", label: "Announcements", desc: "Barangay and municipal notices" },
                  { key: "reportUpdates", label: "Report Updates", desc: "Status changes on your reports" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                      className="relative w-11 h-6 rounded-full transition-all duration-200"
                      style={{ backgroundColor: notifications[item.key as keyof typeof notifications] ? "#800000" : "#e5e7eb" }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                        style={{ transform: notifications[item.key as keyof typeof notifications] ? "translateX(22px)" : "translateX(2px)" }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4" style={{ color: "#800000" }} />
                <h3 className="font-semibold text-gray-900">Security Settings</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Change Password", icon: Lock, desc: "Update your account password" },
                  { label: "Two-Factor Auth", icon: Shield, desc: "Enable 2FA for added security" },
                  { label: "Login Activity", icon: Eye, desc: "View recent login sessions" },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <button className="w-full py-2.5 rounded-xl text-red-600 border border-red-200 text-sm font-medium hover:bg-red-50 transition-all">
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report Detail Modal ── */}
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
                <div 
                  className="h-52 overflow-hidden relative shrink-0 cursor-pointer group"
                  onClick={() => setShowImageViewer(true)}
                >
                  <img src={selectedReport.image_url} alt={selectedReport.title} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover:from-black/70" />
                  {(selectedReport.image_urls && selectedReport.image_urls.length > 1) && (
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {selectedReport.image_urls.length} photos
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-gray-400 text-xs mb-1">
                        {selectedReport.id} · {selectedReport.category} · Reported by {selectedReport.is_anonymous ? "Anonymous" : selectedReport.reporter}
                      </div>
                      <h2 className="text-gray-900 font-semibold" style={{ fontSize: "1.1rem" }}>{selectedReport.title}</h2>
                    </div>
                    <button onClick={() => setSelectedReport(null)} className="p-2 rounded-xl hover:bg-gray-100 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(() => {
                      const s = statusConfig[selectedReport.status];
                      const SI = s?.icon;
                      return s ? <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}><SI className="w-3.5 h-3.5" />{s.label}</span> : null;
                    })()}
                    {selectedReport.verified && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
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

                  {/* Patrol Resolution Evidence */}
                  {(selectedReport.resolution_evidence_url || selectedReport.resolution_notes) && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                        <h3 className="font-semibold text-green-900 text-sm">How It Was Fixed</h3>
                      </div>

                      {selectedReport.resolution_evidence_url && (
                        <div className="mb-4">
                          <p className="text-green-700 text-xs font-medium mb-2">Resolution Evidence</p>
                          <div className="bg-white rounded-lg overflow-hidden border border-green-200">
                            <img
                              src={selectedReport.resolution_evidence_url}
                              alt="Resolution Evidence"
                              className="w-full max-h-72 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </div>
                        </div>
                      )}

                      {selectedReport.resolution_notes && (
                        <div>
                          <p className="text-green-700 text-xs font-medium mb-2">Patrol Officer's Resolution Notes</p>
                          <div className="bg-white rounded-lg p-3 border border-green-200 text-green-900 text-sm leading-relaxed">
                            {selectedReport.resolution_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                                    c.author_role === "system" ? "bg-amber-500" :
                                    c.author_role === "patrol" ? "bg-blue-600" : 
                                    "bg-[#800000]"
                                  }`}>
                                    {c.avatar}
                                  </div>
                                  <div className={`flex-1 rounded-xl p-3 ${
                                    c.author_role === "system" ? "bg-amber-50 border-2 border-amber-300" :
                                    c.author_role === "patrol" ? "bg-blue-50 border border-blue-200" : 
                                    "bg-gray-50"
                                  }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-xs font-semibold ${
                                        c.author_role === "system" ? "text-amber-900" : "text-gray-900"
                                      }`}>{c.author}</span>
                                      {c.author_role === "system" && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">System Log</span>
                                      )}
                                      {c.author_role === "patrol" && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">Patrol</span>
                                      )}
                                      <span className="text-xs text-gray-400">{c.time}</span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${
                                      c.author_role === "system" ? "text-amber-800 font-medium" : "text-gray-700"
                                    }`}>{c.text}</p>
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
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">Report submitted</p>
                            <p className="text-xs text-gray-400">{new Date(selectedReport.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      {selectedReport && (
        <ImageViewerModal
          isOpen={showImageViewer}
          imageUrl={selectedReport.image_url}
          imageUrls={selectedReport.image_urls}
          title={selectedReport.title}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* Xbox/PlayStation Style Achievement Unlocked Toast */}
      <AnimatePresence>
        {unlockedToast && (
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={() => setUnlockedToast(null)}
            className="fixed bottom-6 right-6 z-[9999] bg-[#121216] border-2 border-amber-500/80 text-white rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center gap-4 max-w-sm cursor-pointer select-none border-double"
            style={{ boxShadow: "0 0 25px rgba(245,158,11,0.2)" }}
          >
            {/* Glowing trophy circle */}
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Achievement Unlocked!</div>
              <div className="font-extrabold text-sm mt-0.5 text-white truncate">{unlockedToast.name}</div>
              <div className="text-gray-400 text-[11px] mt-0.5 line-clamp-1">{unlockedToast.desc}</div>
              <div className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> +{unlockedToast.pts} XP Earned
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}