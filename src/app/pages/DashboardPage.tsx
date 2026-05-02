import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  FileText, CheckCircle, Clock, TrendingUp, Plus,
  MapPin, Eye, ArrowRight, Users, Trophy,
  AlertTriangle, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  useApi,
  fetchDashboardStats,
  fetchReports,
  fetchMonthlyTrends,
  fetchCategoryData,
  fetchWeeklyActivity,
  fetchLeaderboard,
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

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending_verification: { bg: "bg-amber-100", text: "text-amber-700",  label: "Pending Verification" },
  approved:    { bg: "bg-blue-100",  text: "text-blue-700",   label: "Approved" },
  in_progress: { bg: "bg-cyan-100", text: "text-cyan-700", label: "In Progress" },
  resolved:    { bg: "bg-green-100", text: "text-green-700",  label: "Resolved" },
};


// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const firstName = user.first_name;
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // ── Data fetching via service layer ──────────────────────────────────────
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApi(fetchDashboardStats);
  const { data: reports, loading: reportsLoading, error: reportsError } = useApi(fetchReports);
  const { data: monthly, loading: chartsLoading } = useApi(fetchMonthlyTrends);
  const { data: categories } = useApi(fetchCategoryData);
  const { data: weekly } = useApi(fetchWeeklyActivity);
  const { data: leaderboard, loading: lbLoading } = useApi(fetchLeaderboard);

  const visibleReports = (reports ?? []).filter((r) => r.status !== "pending_verification");

  // ── KPI card definitions (derived from API data) ─────────────────────────

  const kpiCards = stats
    ? [
        { label: "Total Reports",   value: (stats.totalReports || 0).toLocaleString(),  change: null, icon: FileText,     color: "#800000", bg: "#80000015" },
        { label: "Pending",         value: (stats.pending || 0).toLocaleString(),        change: null, icon: Clock,        color: "#d97706", bg: "#d9770615" },
        { label: "In Progress",     value: (stats.inProgress || 0).toLocaleString(),     change: null, icon: Zap,          color: "#2563eb", bg: "#2563eb15" },
        { label: "Resolved",        value: (stats.resolved || 0).toLocaleString(),       change: null, icon: CheckCircle,  color: "#16a34a", bg: "#16a34a15" },
        { label: "Active Citizens", value: (stats.activeCitizens || 0).toLocaleString(), change: null, icon: Users,        color: "#7c3aed", bg: "#7c3aed15" },
        { label: "Response Rate",   value: `${stats.responseRate || 0}%`,              change: null, icon: TrendingUp,   color: "#0891b2", bg: "#0891b215" },
      ]
    : null;

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ backgroundColor: "#800000" }}
      >
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-15 hidden md:block">
          <BantayLogo size={120} className="rounded-full" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-white mb-1" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
              {greeting}, {firstName}! 👋
            </h2>
            <p className="text-white/70 text-sm">{today} · San Pablo, Castillejos</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/app/reports/create")}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all hover:scale-105"
              style={{ color: "#800000" }}
            >
              <Plus className="w-4 h-4" /> File Report
            </button>
            <button
              onClick={() => navigate("/app/reports")}
              className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-sm text-white font-medium hover:bg-white/30 transition-all"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Grid ── */}
      {statsLoading ? (
        <SkeletonGrid count={6} />
      ) : statsError ? (
        <ErrorState message={statsError} onRetry={refetchStats} compact />
      ) : !kpiCards ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`kpi-skeleton-${i}`} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="h-9 w-9 rounded-xl bg-gray-100 mb-3" />
              <div className="text-2xl font-bold text-gray-200">—</div>
              <div className="text-gray-300 text-xs mt-0.5">No data</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="font-bold text-gray-900" style={{ fontSize: "1.4rem" }}>{kpi.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Monthly Trends */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Monthly Report Trends</h3>
              <p className="text-gray-400 text-xs mt-0.5">Filed vs. Resolved over 6 months</p>
            </div>
            {monthly && monthly.length > 0 && (
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#800000" }} />
                  <span className="text-gray-500">Filed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-gray-500">Resolved</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ height: 220 }}>
            {chartsLoading ? (
              <SkeletonChart height={220} />
            ) : !monthly || monthly.length === 0 ? (
              <ChartEmptyState label="Monthly trend data will appear once reports are filed" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="gFiled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#800000" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#800000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={(value) => Number(value).toString()} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Area type="linear" dataKey="reports" stroke="#800000" strokeWidth={2} fill="url(#gFiled)" name="Filed" />
                  <Area type="linear" dataKey="resolved" stroke="#16a34a" strokeWidth={2} fill="url(#gResolved)" name="Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Report Categories</h3>
          <p className="text-gray-400 text-xs mb-4">Distribution by type</p>
          <div style={{ height: 160 }}>
            {chartsLoading ? (
              <SkeletonChart height={160} />
            ) : !categories || categories.length === 0 ? (
              <ChartEmptyState label="Categories will appear once reports are filed" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {categories.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {categories && categories.length > 0 && (
            <div className="space-y-2 mt-2">
              {categories.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-gray-600" style={{ fontSize: "11px" }}>{c.name}</span>
                  </div>
                  <span className="font-medium text-gray-900" style={{ fontSize: "12px" }}>{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Recent Reports</h3>
              <p className="text-gray-400 text-xs">Latest community incidents</p>
            </div>
            <button
              onClick={() => navigate("/app/reports")}
              className="flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: "#800000" }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {reportsLoading ? (
            <SkeletonList rows={5} />
          ) : reportsError ? (
            <ErrorState message={reportsError} compact />
          ) : !visibleReports || visibleReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Community reports filed by residents will appear here."
              action={
                <button
                  onClick={() => navigate("/app/reports/create")}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white"
                  style={{ backgroundColor: "#800000" }}
                >
                  <Plus className="w-4 h-4" /> File first report
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {visibleReports.slice(0, 5).map((r) => {
                const s = statusConfig[r.status];
                return (
                  <div
                    key={r.id}
                    onClick={() => navigate("/app/reports")}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{r.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-gray-400 text-xs truncate">{r.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s?.bg} ${s?.text}`}>{s?.label || r.status}</span>
                      <span className="text-gray-400 text-xs hidden md:block">
                        {new Date(r.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </span>
                      <Eye className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Weekly Activity */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-1">Weekly Activity</h3>
            <p className="text-gray-400 text-xs mb-3">Reports filed this week</p>
            <div style={{ height: 100 }}>
              {chartsLoading ? (
                <SkeletonChart height={100} />
              ) : !weekly || weekly.length === 0 ? (
                <ChartEmptyState label="No activity this week yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} barSize={16}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="reports" fill="#800000" radius={[4, 4, 0, 0]} name="Reports" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Citizens */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Top Citizens</h3>
                <p className="text-gray-400 text-xs">This month's leaders</p>
              </div>
              <button onClick={() => navigate("/app/leaderboard")} className="text-xs font-medium hover:underline" style={{ color: "#800000" }}>
                Full board
              </button>
            </div>
            {lbLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                    <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                    <div className="w-10 h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <EmptyState icon={Trophy} title="No leaderboard data yet" compact />
            ) : (
              <div className="space-y-3">
                {leaderboard.slice(0, 4).map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <div key={`lb-${rank}-${entry.id}-${index}`} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{
                          fontSize: "11px", fontWeight: 700,
                          backgroundColor: rank === 1 ? "#d97706" : rank === 2 ? "#9ca3af" : rank === 3 ? "#cd7c2f" : "#e5e7eb",
                          color: rank <= 3 ? "white" : "#6b7280",
                        }}
                      >
                        {rank}
                      </div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
                        {entry.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{entry.first_name} {entry.last_name}</div>
                        <div className="text-gray-400" style={{ fontSize: "11px" }}>{entry.barangay}</div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: "#800000" }}>{entry.points?.toLocaleString() || 0}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "File Report",  icon: Plus,           path: "/app/reports/create", color: "#800000" },
                { label: "Emergency",    icon: AlertTriangle,  path: "/app/emergency",      color: "#dc2626" },
                { label: "Leaderboard", icon: Trophy,         path: "/app/leaderboard",    color: "#d97706" },
                { label: "Profile",      icon: Users,          path: "/app/profile",        color: "#2563eb" },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: `${a.color}08` }}
                >
                  <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  <span className="text-xs font-medium text-gray-600">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}