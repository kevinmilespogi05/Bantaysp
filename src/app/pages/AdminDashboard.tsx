import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  Users, FileText, CheckCircle, Clock, TrendingUp, AlertTriangle,
  MapPin, Shield, UserCheck, BarChart3, Settings, Eye,
  Download, Filter, Search, Radio, ChevronDown, MoreHorizontal, type LucideIcon,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  useApi,
  fetchAdminStats,
  fetchReports,
  fetchBarangayData,
  fetchMonthlyTrends,
  fetchCategoryData,
  fetchLeaderboard,
  updateReport,
  deleteReport,
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
import { useAuth } from "../context/AuthContext";
import { BantayLogo } from "../components/ui/BantayLogo";

// ─── Tab config ───────────────────────────────────────────────────────────────

type AdminTab = "overview" | "reports" | "users" | "verification" | "patrol";

const adminTabs: { key: AdminTab; label: string; icon: LucideIcon }[] = [
  { key: "overview",      label: "Overview",           icon: BarChart3 },
  { key: "reports",       label: "Report Management",  icon: FileText },
  { key: "users",         label: "Users",              icon: Users },
  { key: "verification",  label: "Verification Queue", icon: UserCheck },
  { key: "patrol",        label: "Patrol Monitoring",  icon: Radio },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  in_progress: { bg: "bg-blue-100",  text: "text-blue-700",  label: "In Progress" },
  resolved:    { bg: "bg-green-100", text: "text-green-700", label: "Resolved" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reportSearch, setReportSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const activeTab = (searchParams.get("tab") ?? "overview") as AdminTab;
  const setTab = (tab: AdminTab) => {
    if (tab === "patrol") { navigate("/app/admin/patrol-monitoring"); return; }
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  const { data: stats, loading: statsLoading, error: statsError, refetch: retryStats } = useApi(fetchAdminStats);
  const { data: reports, loading: reportsLoading, error: reportsError, refetch: refetchReports } = useApi(fetchReports);
  const { data: barangayData, loading: chartsLoading } = useApi(fetchBarangayData);
  const { data: monthlyData } = useApi(fetchMonthlyTrends);
  const { data: categoryData } = useApi(fetchCategoryData);
  const { data: leaderboard, loading: lbLoading } = useApi(fetchLeaderboard);

  const filteredReports = (reports ?? []).filter(
    (r) =>
      r.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.reporter.toLowerCase().includes(reportSearch.toLowerCase())
  );

  const handleStatusChange = async (reportId: string, status: Report["status"]) => {
    setUpdatingId(reportId);
    setStatusMenuId(null);
    await updateReport(reportId, { status });
    refetchReports();
    retryStats();
    setUpdatingId(null);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setUpdatingId(reportId);
    await deleteReport(reportId);
    refetchReports();
    retryStats();
    setUpdatingId(null);
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
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`} onClick={() => setStatusMenuId(r.id)}>{s.label}</span>
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
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Eye className="w-3.5 h-3.5 text-gray-400" /></button>
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
          {lbLoading ? (
            <SkeletonList rows={6} />
          ) : !leaderboard || leaderboard.length === 0 ? (
            <EmptyState icon={Users} title="No registered users yet" description="Residents who sign up will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["User", "Barangay", "Badge", "Reports", "Points", "Verified", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaderboard.map((u, i) => (
                    <motion.tr key={u.rank} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>{u.avatar}</div>
                          <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm">{u.barangay}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: u.badge === "Gold" ? "#d9770615" : u.badge === "Silver" ? "#6b728015" : u.badge === "Bronze" ? "#cd7c2f15" : "#3b82f615",
                            color: u.badge === "Gold" ? "#d97706" : u.badge === "Silver" ? "#6b7280" : u.badge === "Bronze" ? "#cd7c2f" : "#3b82f6",
                          }}>{u.badge}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-sm">{u.reports}</td>
                      <td className="px-5 py-3.5 font-bold text-sm" style={{ color: "#800000" }}>{u.points.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        {u.verified
                          ? <span className="flex items-center gap-1 text-green-700 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                          : <span className="text-amber-600 text-xs font-medium">Pending</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><MoreHorizontal className="w-3.5 h-3.5 text-gray-400" /></button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          ) : (
            <EmptyState
              icon={UserCheck}
              title="No pending verifications"
              description="User ID verification requests will appear here"
            />
          )}
          {stats && stats.pendingVerification > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: Math.min(6, stats.pendingVerification) }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: "#800000" }}>
                      {["AB","CD","EF","GH","IJ","KL"][i]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Applicant {i + 1}</div>
                      <div className="text-gray-400 text-xs">Brgy. San Pablo · 2h ago</div>
                    </div>
                    <span className="ml-auto bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">PhilSys ID</div>
                      <div className="text-gray-400 text-xs">ID image submitted</div>
                    </div>
                    <button className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all" style={{ backgroundColor: "#16a34a" }}>Approve</button>
                    <button className="flex-1 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}