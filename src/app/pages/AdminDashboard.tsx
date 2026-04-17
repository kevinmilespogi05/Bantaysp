import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  Users, FileText, CheckCircle, Clock, TrendingUp, AlertTriangle,
  MapPin, Shield, UserCheck, BarChart3, Settings, Eye,
  Download, Filter, Search, Radio, ChevronDown, MoreHorizontal, type LucideIcon, UserPlus, MessageSquare, X,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  useApi,
  fetchAdminStats,
  fetchReports,
  fetchPendingReports,
  fetchSubmittedReports,
  fetchBarangayData,
  fetchMonthlyTrends,
  fetchCategoryData,
  fetchLeaderboard,
  fetchAllUsers,
  fetchVerifiedUsers,
  updateReport,
  deleteReport,
  approveUser,
  rejectUser,
  approveReport,
  rejectReport,
  toggleAnonymousReport,
  approvePatrolResolution,
  rejectPatrolResolution,
  type Report,
} from "../services/api";
import {
  SkeletonGrid,
  SkeletonList,
  SkeletonChart,
  ChartEmptyState,
  EmptyState,
  ErrorState,
} from "../components/ui/DataStates";
import { ImageViewerModal } from "../components/ui/ImageViewerModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PromoteToPatrolModal } from "../components/ui/PromoteToPatrolModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { BantayLogo } from "../components/ui/BantayLogo";

// ─── Tab config ───────────────────────────────────────────────────────────────

type AdminTab = "overview" | "reports" | "users" | "verification" | "patrol" | "chat";

const adminTabs: { key: AdminTab; label: string; icon: LucideIcon }[] = [
  { key: "overview",      label: "Overview",           icon: BarChart3 },
  { key: "reports",       label: "Report Management",  icon: FileText },
  { key: "users",         label: "Users",              icon: Users },
  { key: "verification",  label: "Verification Queue", icon: UserCheck },
  { key: "chat",          label: "User Messages",      icon: MessageSquare },
  { key: "patrol",        label: "Patrol Monitoring",  icon: Radio },
];

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending_verification: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Verification" },
  approved:    { bg: "bg-blue-100",  text: "text-blue-700",  label: "Approved" },
  in_progress: { bg: "bg-cyan-100",  text: "text-cyan-700",  label: "In Progress" },
  accepted:    { bg: "bg-yellow-100", text: "text-yellow-700", label: "Accepted" },
  submitted:   { bg: "bg-purple-100", text: "text-purple-700", label: "Submitted" },
  resolved:    { bg: "bg-green-100", text: "text-green-700", label: "Resolved" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reportSearch, setReportSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [reportsSubTab, setReportsSubTab] = useState<"all" | "pending-verification" | "submitted">("all");
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectReportId, setPendingRejectReportId] = useState<string | null>(null);
  const [pendingReportDetailOpen, setPendingReportDetailOpen] = useState(false);
  const [selectedPendingReport, setSelectedPendingReport] = useState<any>(null);
  const [submittedReportDetailOpen, setSubmittedReportDetailOpen] = useState(false);
  const [selectedSubmittedReport, setSelectedSubmittedReport] = useState<any>(null);
  const [submittedResolutionNotes, setSubmittedResolutionNotes] = useState("");
  const [processingSubmittedId, setProcessingSubmittedId] = useState<string | null>(null);
  
  // Patrol promotion modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedUserForPromotion, setSelectedUserForPromotion] = useState<any>(null);
  
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "delete-report";
    userId?: string;
    reportId?: string;
    userName?: string;
  } | null>(null);

  const [togglingAnonymityReportId, setTogglingAnonymityReportId] = useState<string | null>(null);
  const [optimisticAnonymousToggles, setOptimisticAnonymousToggles] = useState<Record<string, boolean>>({});

  const activeTab = (searchParams.get("tab") ?? "overview") as AdminTab;
  const setTab = (tab: AdminTab) => {
    if (tab === "chat") { navigate("/app/admin/chat"); return; }
    if (tab === "patrol") { navigate("/app/admin/patrol-monitoring"); return; }
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  const { data: stats, loading: statsLoading, error: statsError, refetch: retryStats } = useApi(fetchAdminStats);
  const { data: reports, loading: reportsLoading, error: reportsError, refetch: refetchReports } = useApi(fetchReports);
  const { data: pendingReports, loading: pendingReportsLoading, error: pendingReportsError, refetch: refetchPendingReports } = useApi(fetchPendingReports);
  const { data: submittedReports, loading: submittedReportsLoading, error: submittedReportsError, refetch: refetchSubmittedReports } = useApi(fetchSubmittedReports);
  const { data: barangayData, loading: chartsLoading } = useApi(fetchBarangayData);
  const { data: monthlyData } = useApi(fetchMonthlyTrends);
  const { data: categoryData } = useApi(fetchCategoryData);
  const { data: leaderboard, loading: lbLoading } = useApi(fetchLeaderboard);
  const { data: verifiedUsers, loading: verifiedUsersLoading, refetch: refetchVerifiedUsers } = useApi(fetchVerifiedUsers);
  const { data: pendingUsers, loading: pendingUsersLoading, refetch: refetchPendingUsers } = useApi(fetchAllUsers);

  const filteredReports = (reports ?? []).filter(
    (r) =>
      r.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.reporter.toLowerCase().includes(reportSearch.toLowerCase())
  );

  const handleStatusChange = async (reportId: string, status: Report["status"]) => {
    setUpdatingId(reportId);
    setStatusMenuId(null);
    try {
      await updateReport(reportId, { status });
      refetchReports();
      retryStats();
      showToast(`Report status updated to ${status}`, "success");
    } catch (err) {
      showToast(`Failed to update report status`, "error");
    }
    setUpdatingId(null);
  };

  const handleDeleteReport = async (reportId: string) => {
    setConfirmAction({ type: "delete-report", reportId });
    setConfirmOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!confirmAction?.reportId) return;
    setUpdatingId(confirmAction.reportId);
    try {
      await deleteReport(confirmAction.reportId);
      refetchReports();
      retryStats();
      showToast("Report deleted successfully", "success");
    } catch (err) {
      showToast("Failed to delete report", "error");
    }
    setUpdatingId(null);
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    setConfirmAction({ type: "approve", userId, userName });
    setConfirmOpen(true);
  };

  const confirmApproveUser = async () => {
    if (!confirmAction?.userId) return;
    setProcessingUserId(confirmAction.userId);
    try {
      const result = await approveUser(confirmAction.userId);
      if (result.data?.success) {
        showToast(`${confirmAction.userName} approved and verified! ✨`, "success");
        await refetchPendingUsers();
        await refetchVerifiedUsers();
        await retryStats();
      } else {
        showToast(`Failed to approve user: ${result.error}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to approve user"}`, "error");
    } finally {
      setProcessingUserId(null);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    setConfirmAction({ type: "reject", userId, userName });
    setConfirmOpen(true);
  };

  const confirmRejectUser = async () => {
    if (!confirmAction?.userId) return;
    setProcessingUserId(confirmAction.userId);
    try {
      const result = await rejectUser(confirmAction.userId);
      if (result.data?.success) {
        showToast(`${confirmAction.userName}'s application rejected`, "warning");
        await refetchPendingUsers();
        await retryStats();
      } else {
        showToast(`Failed to reject user: ${result.error}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to reject user"}`, "error");
    } finally {
      setProcessingUserId(null);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleApprovePendingReport = async (reportId: string) => {
    setProcessingReportId(reportId);
    try {
      const result = await approveReport(reportId);
      if (result.data?.success) {
        showToast(`Report approved! Resident earned 50 points ✨`, "success");
        await refetchPendingReports();
        await refetchReports();
        await retryStats();
      } else {
        showToast(`Failed to approve report: ${result.error}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to approve report"}`, "error");
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleRejectPendingReport = async (reportId: string) => {
    setPendingRejectReportId(reportId);
    setShowRejectModal(true);
  };

  const confirmRejectPendingReport = async () => {
    if (!pendingRejectReportId) return;
    setProcessingReportId(pendingRejectReportId);
    try {
      const result = await rejectReport(pendingRejectReportId, rejectionReason);
      if (result.data?.success) {
        showToast(`Report rejected with reason: "${rejectionReason}"`, "warning");
        await refetchPendingReports();
        await retryStats();
      } else {
        showToast(`Failed to reject report: ${result.error}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to reject report"}`, "error");
    } finally {
      setProcessingReportId(null);
      setShowRejectModal(false);
      setRejectionReason("");
      setPendingRejectReportId(null);
    }
  };

  const handleToggleAnonymous = async (reportId: string) => {
    setTogglingAnonymityReportId(reportId);
    
    // Get current state (from optimistic toggle or actual data)
    const currentReport = pendingReports?.find(r => r.id === reportId);
    const currentAnonymousState = optimisticAnonymousToggles[reportId] !== undefined 
      ? optimisticAnonymousToggles[reportId]
      : currentReport?.is_anonymous ?? false;
    
    // Optimistically toggle the state
    const newAnonymousState = !currentAnonymousState;
    setOptimisticAnonymousToggles(prev => ({
      ...prev,
      [reportId]: newAnonymousState
    }));
    
    try {
      const result = await toggleAnonymousReport(reportId);
      if (result.data?.success) {
        const status = result.data.isAnonymous ? "anonymous" : "public";
        showToast(`✓ Report marked as ${status}`, "success");
        // Clear optimistic state and refetch
        setOptimisticAnonymousToggles(prev => {
          const copy = { ...prev };
          delete copy[reportId];
          return copy;
        });
        await refetchPendingReports();
        await refetchReports();
        await retryStats();
      } else {
        // Revert optimistic update on error
        setOptimisticAnonymousToggles(prev => {
          const copy = { ...prev };
          delete copy[reportId];
          return copy;
        });
        showToast(`Failed to toggle anonymous status: ${result.error}`, "error");
      }
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticAnonymousToggles(prev => {
        const copy = { ...prev };
        delete copy[reportId];
        return copy;
      });
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to toggle anonymous status"}`, "error");
    } finally {
      setTogglingAnonymityReportId(null);
    }
  };

  const handleApproveSubmittedResolution = async (reportId: string) => {
    setProcessingSubmittedId(reportId);
    try {
      const result = await approvePatrolResolution(reportId, submittedResolutionNotes);
      if (result.data?.success) {
        showToast(`Resolution approved! Patrol officer earned 25 points ✨`, "success");
        await refetchSubmittedReports();
        await retryStats();
        setSubmittedResolutionNotes("");
      } else {
        showToast(`Failed to approve resolution: ${result.error}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to approve resolution"}`, "error");
    } finally {
      setProcessingSubmittedId(null);
    }
  };

  const handleRejectSubmittedResolution = async (reportId: string) => {
    setProcessingSubmittedId(reportId);
    try {
      const result = await rejectPatrolResolution(reportId, submittedResolutionNotes);
      if (result.data?.success) {
        showToast(`Resolution sent back to patrol for revision`, "warning");
        await refetchSubmittedReports();
        setSubmittedResolutionNotes("");
      } else {
        showToast(`Failed to reject resolution: ${result.error}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to reject resolution"}`, "error");
    } finally {
      setProcessingSubmittedId(null);
    }
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageViewerOpen(true);
  };

  const executeConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "approve") {
      confirmApproveUser();
    } else if (confirmAction.type === "reject") {
      confirmRejectUser();
    } else if (confirmAction.type === "delete-report") {
      confirmDeleteReport();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <BantayLogo size={40} />
          <div>
            <h2 className="font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-400 text-sm">System overview · San Pablo, Castillejos</p>
          </div>
        </div>

        {/* Export & Settings — admin only */}
        {isAdmin && (
          <div className="md:ml-auto flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm hover:bg-gray-50 transition-all">
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: "#800000" }}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Grid ── */}
      {statsLoading ? (
        <SkeletonGrid count={6} />
      ) : statsError ? (
        <ErrorState message={statsError} onRetry={retryStats} compact />
      ) : !stats ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          No statistics available yet. Stats will populate as data comes in.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {([
            { label: "Total Users",          value: stats.totalUsers.toLocaleString(),           icon: Users,     color: "#800000" },
            { label: "Total Reports",        value: stats.totalReports.toLocaleString(),         icon: FileText,  color: "#2563eb" },
            { label: "Pending Review",       value: stats.pendingReview.toLocaleString(),        icon: Clock,     color: "#d97706" },
            { label: "Resolved",             value: stats.resolved.toLocaleString(),             icon: CheckCircle, color: "#16a34a" },
            { label: "Response Rate",        value: `${stats.responseRate}%`,                    icon: TrendingUp, color: "#7c3aed" },
            { label: "Pending Verification", value: stats.pendingVerification.toLocaleString(),  icon: UserCheck, color: "#0891b2" },
          ] as const).map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="font-bold text-gray-900 mb-0.5" style={{ fontSize: "1.3rem" }}>{kpi.value}</div>
              <div className="text-gray-400 text-xs">{kpi.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
        {adminTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
            style={tab.key === "patrol" ? { color: "#800000" } : {}}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.key === "patrol" && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-white animate-pulse" style={{ backgroundColor: "#800000", fontSize: "9px" }}>
                LIVE
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid xl:grid-cols-3 gap-6">
            {/* Reports by Barangay */}
            <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-1">Reports by Barangay</h3>
              <p className="text-gray-400 text-xs mb-4">Filed vs. Resolved per area</p>
              <div style={{ height: 220 }}>
                {chartsLoading ? (
                  <SkeletonChart height={220} />
                ) : !barangayData || barangayData.length === 0 ? (
                  <ChartEmptyState label="Barangay data will populate once reports are filed in each area" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barangayData} layout="vertical" barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="reports" fill="#800000" radius={[0, 4, 4, 0]} name="Filed" />
                      <Bar dataKey="resolved" fill="#16a34a" radius={[0, 4, 4, 0]} name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-1">Category Breakdown</h3>
              <p className="text-gray-400 text-xs mb-4">All-time distribution</p>
              <div style={{ height: 160 }}>
                {chartsLoading ? (
                  <SkeletonChart height={160} />
                ) : !categoryData || categoryData.length === 0 ? (
                  <ChartEmptyState label="Category data will appear once reports are filed" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {categoryData.map((_, i) => <Cell key={i} fill={categoryData[i].color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {categoryData && categoryData.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  {categoryData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-gray-500 text-xs">{c.name}</span>
                      </div>
                      <span className="font-medium text-gray-900 text-xs">{c.value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trend Analysis */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">Monthly Trend Analysis</h3>
                <p className="text-gray-400 text-xs">6-month report history</p>
              </div>
              {monthlyData && monthlyData.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#800000" }} /> Reports
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 ml-2" /> Resolved
                </div>
              )}
            </div>
            <div style={{ height: 180 }}>
              {chartsLoading ? (
                <SkeletonChart height={180} />
              ) : !monthlyData || monthlyData.length === 0 ? (
                <ChartEmptyState label="Monthly trend data will appear as reports accumulate over time" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Line type="monotone" dataKey="reports" stroke="#800000" strokeWidth={2.5} dot={{ r: 4 }} name="Filed" />
                    <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reports Tab ── */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {/* Reports Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setReportsSubTab("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportsSubTab === "all"
                  ? "bg-[#800000] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All Reports {reports?.length ? `(${reports.length})` : ""}
            </button>
            <button
              onClick={() => setReportsSubTab("pending-verification")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                reportsSubTab === "pending-verification"
                  ? "bg-[#800000] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Pending Verification
              {pendingReports?.length ? (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingReports.length}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => setReportsSubTab("submitted")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                reportsSubTab === "submitted"
                  ? "bg-[#800000] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Patrol Resolutions
              {submittedReports?.length ? (
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {submittedReports.length}
                </span>
              ) : null}
            </button>
          </div>

          {/* All Reports View */}
          {reportsSubTab === "all" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search reports or reporters..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#800000]"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
          {reportsLoading ? (
            <SkeletonList rows={6} />
          ) : reportsError ? (
            <ErrorState message={reportsError} compact />
          ) : filteredReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={reportSearch ? "No matching reports" : "No reports yet"}
              description={reportSearch ? "Try a different search term" : "Reports filed by residents will appear here"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Report ID", "Title", "Category", "Reporter", "Status", "Priority", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredReports.map((r, i) => {
                    const s = statusColors[r.status];
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-gray-500 text-sm font-mono">{r.id}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-900 text-sm max-w-xs truncate">{r.title}</div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                            <MapPin className="w-3 h-3" />{r.location}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">{r.category}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>
                              {r.avatar}
                            </div>
                            <span className="text-gray-700 text-sm">{r.reporter}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="relative">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s?.bg} ${s?.text}`} onClick={() => setStatusMenuId(r.id)}>{s?.label || r.status}</span>
                            {statusMenuId === r.id && (
                              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-10">
                                <button
                                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${updatingId === r.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                  onClick={() => handleStatusChange(r.id, "pending")}
                                  disabled={updatingId === r.id}
                                >
                                  Pending
                                </button>
                                <button
                                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${updatingId === r.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                  onClick={() => handleStatusChange(r.id, "in_progress")}
                                  disabled={updatingId === r.id}
                                >
                                  In Progress
                                </button>
                                <button
                                  className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${updatingId === r.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                  onClick={() => handleStatusChange(r.id, "resolved")}
                                  disabled={updatingId === r.id}
                                >
                                  Resolved
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${r.priority === "high" ? "bg-red-100 text-red-700" : r.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {r.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">
                          {new Date(r.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setSelectedReport(r);
                                setReportDetailOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View report details"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => handleDeleteReport(r.id)}><MoreHorizontal className="w-3.5 h-3.5 text-gray-400" /></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Registered Users</h3>
            <span className="text-gray-400 text-sm">
              {stats ? `${stats.totalUsers.toLocaleString()} total` : "—"}
            </span>
          </div>
          {verifiedUsersLoading ? (
            <SkeletonList rows={6} />
          ) : !verifiedUsers || verifiedUsers.length === 0 ? (
            <EmptyState icon={Users} title="No registered users yet" description="Residents who sign up will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["User", "Barangay", "Role", "Reports", "Points", "Verified", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {verifiedUsers.map((u, i) => (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>{u.avatar}</div>
                          <span className="font-medium text-gray-900 text-sm">{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm">{u.barangay}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: u.role === "admin" ? "#dc262615" : u.role === "patrol" ? "#0891b215" : "#e5e7eb",
                            color: u.role === "admin" ? "#dc2626" : u.role === "patrol" ? "#0891b2" : "#6b7280",
                          }}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-sm">{u.reports || 0}</td>
                      <td className="px-5 py-3.5 font-bold text-sm" style={{ color: "#800000" }}>{(u.points || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        {u.verified
                          ? <span className="flex items-center gap-1 text-green-700 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                          : <span className="text-amber-600 text-xs font-medium">Pending</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <button 
                          onClick={() => {
                            if (u.role === "resident") {
                              setSelectedUserForPromotion(u);
                              setPromoteModalOpen(true);
                            }
                          }}
                          disabled={u.role !== "resident"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.role === "resident"
                              ? "hover:bg-gray-100 cursor-pointer"
                              : "opacity-50 cursor-not-allowed"
                          }`}
                          title={u.role === "resident" ? "Promote to Patrol" : `Already a ${u.role}`}
                        >
                          {u.role === "resident" ? (
                            <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          )}

          {/* Pending Verification View */}
          {reportsSubTab === "pending-verification" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!pendingReportsLoading && pendingReports && pendingReports.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-amber-700 text-sm">
                <strong>{pendingReports.length} reports</strong> awaiting verification. Approved reports will be visible to the community and patrol can accept them.
              </p>
            </div>
          )}
          {pendingReportsLoading ? (
            <SkeletonList rows={4} />
          ) : pendingReportsError ? (
            <ErrorState message={pendingReportsError} compact />
          ) : !pendingReports || pendingReports.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up!"
              description="No pending reports. All reports have been verified or are being handled."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Report ID", "Title", "Category", "Reporter", "Location", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingReports.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => {
                        setSelectedPendingReport(r);
                        setPendingReportDetailOpen(true);
                      }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-gray-500 text-sm font-mono">{r.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900 text-sm max-w-xs truncate">{r.title}</div>
                        <div className="text-gray-400 text-xs mt-0.5 max-w-xs truncate">{r.description}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">{r.category}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: r.is_anonymous ? "#999" : "#800000" }}>
                            {r.is_anonymous ? "AN" : r.avatar}
                          </div>
                          <span className="text-gray-700 text-sm">{r.is_anonymous ? "Anonymous Resident" : r.reporter}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-sm max-w-xs truncate">{r.location}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm">
                        {new Date(r.created_at || r.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprovePendingReport(r.id);
                          }}
                          disabled={processingReportId === r.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            processingReportId === r.id
                              ? "opacity-50 cursor-not-allowed"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                          title="Approve and make visible to community"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectPendingReport(r.id);
                          }}
                          disabled={processingReportId === r.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            processingReportId === r.id
                              ? "opacity-50 cursor-not-allowed"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                          title="Reject this report"
                        >
                          ✗ Reject
                        </button>
                        <label 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={optimisticAnonymousToggles[r.id] !== undefined ? optimisticAnonymousToggles[r.id] : (r.is_anonymous ?? false)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleAnonymous(r.id);
                            }}
                            disabled={togglingAnonymityReportId === r.id}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            title="Mark as anonymous"
                          />
                          <span className="text-gray-700">Anonymous</span>
                        </label>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          )}

          {/* Patrol Resolutions View */}
          {reportsSubTab === "submitted" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!submittedReportsLoading && submittedReports && submittedReports.length > 0 && (
            <div className="bg-purple-50 border-b border-purple-200 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0" />
              <p className="text-purple-700 text-sm">
                <strong>{submittedReports.length} resolutions</strong> submitted by patrol officers awaiting your verification and approval.
              </p>
            </div>
          )}
          {submittedReportsLoading ? (
            <SkeletonList rows={4} />
          ) : submittedReportsError ? (
            <ErrorState message={submittedReportsError} compact />
          ) : !submittedReports || submittedReports.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up!"
              description="No patrol resolutions pending verification. All submitted resolutions have been reviewed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Report ID", "Title", "Patrol Officer", "Evidence", "Submitted", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {submittedReports.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => {
                        setSelectedSubmittedReport(r);
                        setSubmittedReportDetailOpen(true);
                      }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-gray-500 text-sm font-mono">{r.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900 text-sm max-w-xs truncate">{r.title}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-gray-700 text-sm">{r.resolved_by || "Unknown"}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.resolution_evidence_url ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageUrl(r.resolution_evidence_url);
                              setImageViewerOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            📷 View Photo
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">No photo</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm">
                        {new Date(r.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveSubmittedResolution(r.id);
                          }}
                          disabled={processingSubmittedId === r.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            processingSubmittedId === r.id
                              ? "opacity-50 cursor-not-allowed"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                          title="Approve this resolution"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectSubmittedResolution(r.id);
                          }}
                          disabled={processingSubmittedId === r.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            processingSubmittedId === r.id
                              ? "opacity-50 cursor-not-allowed"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                          title="Reject this resolution"
                        >
                          ✗ Reject
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          )}
        </div>
      )}

      {/* Reject Report Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-semibold text-gray-900 text-lg">Reject Report</h3>
            <p className="text-gray-600 text-sm">Provide a reason for rejecting this report so the reporter can improve.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (e.g., duplicate report, insufficient details, fake report)..."
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#800000] resize-none h-24"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setPendingRejectReportId(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectPendingReport}
                disabled={!rejectionReason.trim() || processingReportId === pendingRejectReportId}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject Report
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pending Report Detail Modal */}
      {pendingReportDetailOpen && selectedPendingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg">{selectedPendingReport.title}</h2>
              <button
                onClick={() => {
                  setPendingReportDetailOpen(false);
                  setSelectedPendingReport(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Report ID & Meta */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Report ID:</span>
                  <p className="font-mono text-gray-700">{selectedPendingReport.id}</p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p className="text-amber-700 font-medium">Pending Verification</p>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <p className="text-gray-700">{new Date(selectedPendingReport.created_at || selectedPendingReport.timestamp).toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}</p>
                </div>
              </div>

              {/* Category & Location */}
              <div className="flex gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Category</span>
                  <p className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg inline-block text-sm font-medium mt-1">{selectedPendingReport.category}</p>
                </div>
                <div className="flex-1">
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Location
                  </span>
                  <p className="text-gray-700 mt-1">{selectedPendingReport.location}</p>
                </div>
              </div>

              {/* Reporter Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Reported by</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedPendingReport.is_anonymous ? "#999" : "#800000" }}>
                    {selectedPendingReport.is_anonymous ? "AN" : (selectedPendingReport.avatar || "A")}
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">{selectedPendingReport.is_anonymous ? "Anonymous Resident" : selectedPendingReport.reporter}</p>
                    {selectedPendingReport.is_anonymous && <p className="text-gray-400 text-xs">Anonymous Report</p>}
                    {!selectedPendingReport.is_anonymous && selectedPendingReport.user_id && <p className="text-gray-400 text-xs">{selectedPendingReport.user_id}</p>}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Description</p>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">
                  {selectedPendingReport.description}
                </div>
              </div>

              {/* Image */}
              {selectedPendingReport.image_url && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Image</p>
                  <img src={selectedPendingReport.image_url} alt={selectedPendingReport.title} className="w-full rounded-lg max-h-96 object-cover" />
                </div>
              )}

              {/* Admin Notes */}
              {selectedPendingReport.admin_notes && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Admin Notes</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-700 text-sm">
                    {selectedPendingReport.admin_notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    handleApprovePendingReport(selectedPendingReport.id);
                    setPendingReportDetailOpen(false);
                  }}
                  disabled={processingReportId === selectedPendingReport.id}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    processingReportId === selectedPendingReport.id
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  ✓ Approve Report
                </button>
                <button
                  onClick={() => {
                    setPendingRejectReportId(selectedPendingReport.id);
                    setShowRejectModal(true);
                    setPendingReportDetailOpen(false);
                  }}
                  disabled={processingReportId === selectedPendingReport.id}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    processingReportId === selectedPendingReport.id
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  ✗ Reject Report
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Submitted Patrol Resolution Detail Modal */}
      {submittedReportDetailOpen && selectedSubmittedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg">{selectedSubmittedReport.title}</h2>
              <button
                onClick={() => {
                  setSubmittedReportDetailOpen(false);
                  setSelectedSubmittedReport(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Report ID & Meta */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Report ID:</span>
                  <p className="font-mono text-gray-700">{selectedSubmittedReport.id}</p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p className="text-blue-700 font-medium">📤 Submitted</p>
                </div>
                <div>
                  <span className="text-gray-400">Submitted:</span>
                  <p className="text-gray-700">{new Date(selectedSubmittedReport.timestamp).toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}</p>
                </div>
              </div>

              {/* Category & Location */}
              <div className="flex gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Category</span>
                  <p className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg inline-block text-sm font-medium mt-1">{selectedSubmittedReport.category}</p>
                </div>
                <div className="flex-1">
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Location
                  </span>
                  <p className="text-gray-700 mt-1">{selectedSubmittedReport.location}</p>
                </div>
              </div>

              {/* Patrol Officer Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Resolution Submitted by</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>
                    {selectedSubmittedReport.resolved_by?.substring(0, 2).toUpperCase() || "P"}
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">{selectedSubmittedReport.resolved_by || "Unknown Patrol Officer"}</p>
                    <p className="text-gray-400 text-xs">Patrol Officer</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Incident Description</p>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">
                  {selectedSubmittedReport.description || "No description provided"}
                </div>
              </div>

              {/* Resolution Notes */}
              {selectedSubmittedReport.resolution_notes && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Patrol Officer's Resolution Notes</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-gray-700 text-sm leading-relaxed">
                    {selectedSubmittedReport.resolution_notes}
                  </div>
                </div>
              )}

              {/* Evidence Photo */}
              {selectedSubmittedReport.resolution_evidence_url && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Evidence Photo</p>
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={selectedSubmittedReport.resolution_evidence_url} 
                      alt="Evidence" 
                      className="w-full max-h-96 object-cover cursor-pointer hover:opacity-90"
                      onClick={() => {
                        setSelectedImageUrl(selectedSubmittedReport.resolution_evidence_url);
                        setImageViewerOpen(true);
                      }}
                      title="Click to view full size"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    handleApproveSubmittedResolution(selectedSubmittedReport.id);
                    setSubmittedReportDetailOpen(false);
                  }}
                  disabled={processingSubmittedId === selectedSubmittedReport.id}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    processingSubmittedId === selectedSubmittedReport.id
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {processingSubmittedId === selectedSubmittedReport.id ? "Approving..." : "✓ Approve Resolution"}
                </button>
                <button
                  onClick={() => {
                    handleRejectSubmittedResolution(selectedSubmittedReport.id);
                    setSubmittedReportDetailOpen(false);
                  }}
                  disabled={processingSubmittedId === selectedSubmittedReport.id}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    processingSubmittedId === selectedSubmittedReport.id
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {processingSubmittedId === selectedSubmittedReport.id ? "Rejecting..." : "✗ Reject Resolution"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Verification Queue Tab ── */}
      {activeTab === "verification" && (
        <div className="space-y-4">
          {stats && stats.pendingVerification > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-amber-700 text-sm">
                <strong>{stats.pendingVerification} users</strong> are awaiting ID verification.
              </p>
            </div>
          ) : null}
          {pendingUsersLoading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl p-5 h-96 animate-pulse" />
              ))}
            </div>
          ) : pendingUsers && pendingUsers.length > 0 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingUsers.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col"
                >
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: "#800000" }}>
                      {(user.first_name?.[0] || "A") + (user.last_name?.[0] || "B")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-gray-400 text-xs truncate">{user.barangay} · {new Date(user.joined).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</div>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">Pending</span>
                  </div>

                  {/* User Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-gray-600 truncate ml-2">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-gray-600">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Role:</span>
                      <span className="text-gray-600 capitalize">{user.role}</span>
                    </div>
                  </div>

                  {/* ID Document Section */}
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-4 flex-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700">ID Document</div>
                      <div className="text-gray-400 text-xs">Submitted for verification</div>
                    </div>
                    {user.id_document_url ? (
                      <button
                        onClick={() => openImageViewer(user.id_document_url || "")}
                        className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => user.id && handleApproveUser(user.id, `${user.first_name} ${user.last_name}`)}
                      disabled={processingUserId === user.id}
                      className="flex-1 py-2 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                      style={{ backgroundColor: processingUserId === user.id ? "#ccc" : "#16a34a" }}
                    >
                      {processingUserId === user.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => user.id && handleRejectUser(user.id, `${user.first_name} ${user.last_name}`)}
                      disabled={processingUserId === user.id}
                      className="flex-1 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingUserId === user.id ? "..." : "Reject"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UserCheck}
              title="No pending verifications"
              description="User ID verification requests will appear here"
            />
          )}
        </div>
      )}

      {/* ── Image Viewer Modal ── */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        imageUrl={selectedImageUrl}
        title="Report Image"
        onClose={() => setImageViewerOpen(false)}
      />

      {/* ── Report Detail Modal ── */}
      {reportDetailOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
              <button
                onClick={() => setReportDetailOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Title & Status */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedReport.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${statusColors[selectedReport.status]?.bg} ${statusColors[selectedReport.status]?.text}`}>
                    {statusColors[selectedReport.status]?.label}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{selectedReport.id}</p>
              </div>

              {/* meta info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Reporter</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>
                      {selectedReport.avatar}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedReport.reporter}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Category</p>
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">{selectedReport.category}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Date Reported</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedReport.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Location</p>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{selectedReport.location}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Description</p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
              </div>

              {/* Image */}
              {selectedReport.image_url && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Report Image</p>
                  <img
                    src={selectedReport.image_url}
                    alt="Report"
                    className="w-full rounded-lg max-h-64 object-cover border border-gray-200"
                  />
                </div>
              )}

              {/* Admin Notes from Reporter */}
              {selectedReport.admin_notes && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Private Notes for Admin</p>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReport.admin_notes}</p>
                  </div>
                </div>
              )}

              {/* Engagement */}
              <div className="flex gap-6 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Upvotes</p>
                  <p className="text-lg font-bold text-gray-900">{selectedReport.upvotes}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Comments</p>
                  <p className="text-lg font-bold text-gray-900">{selectedReport.comments}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Verified</p>
                  <p className="text-lg font-bold text-gray-900">{selectedReport.verified ? "✓" : "—"}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setReportDetailOpen(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={
          confirmAction?.type === "approve"
            ? "Approve User"
            : confirmAction?.type === "reject"
              ? "Reject Application"
              : "Delete Report"
        }
        message={
          confirmAction?.type === "approve"
            ? `Ready to approve ${confirmAction.userName}? They will be moved to verified users and can access the app.`
            : confirmAction?.type === "reject"
              ? `Are you sure you want to reject ${confirmAction.userName}'s application? They will be removed from the system.`
              : "Delete this report? This action cannot be undone."
        }
        confirmText={
          confirmAction?.type === "approve"
            ? "Approve"
            : confirmAction?.type === "reject"
              ? "Reject"
              : "Delete"
        }
        isDangerous={confirmAction?.type === "delete-report" || confirmAction?.type === "reject"}
        onConfirm={executeConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        isLoading={processingUserId !== null}
      />

      {/* ── Promote to Patrol Modal ── */}
      <PromoteToPatrolModal
        isOpen={promoteModalOpen}
        onClose={() => {
          setPromoteModalOpen(false);
          setSelectedUserForPromotion(null);
        }}
        user={selectedUserForPromotion}
        onSuccess={() => {
          refetchVerifiedUsers();
          showToast("User promoted to patrol officer!", "success");
        }}
      />
    </div>
  );
}