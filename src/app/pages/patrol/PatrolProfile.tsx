import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Shield, Radio, Clock, CheckCircle, Zap, Navigation,
  Star, Award, TrendingUp, Activity, LogOut, BarChart3,
} from "lucide-react";
import {
  useApi, fetchPatrolStats, fetchPatrolHistory,
} from "../../services/api";
import { PatrolEmptyState } from "../../components/ui/DataStates";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

// ─── Static config ────────────────────────────────────────────────────────────

const performanceRadar = [
  { subject: "Response Time",     A: 88 },
  { subject: "Resolution Rate",   A: 94 },
  { subject: "Evidence Quality",  A: 76 },
  { subject: "Community Rating",  A: 82 },
  { subject: "Patrol Coverage",   A: 70 },
  { subject: "Incident Accuracy", A: 91 },
];

const officerBadges = [
  { name: "First Responder",  icon: Zap,          earned: true,  color: "#f59e0b", desc: "First case resolved"     },
  { name: "Quick Draw",       icon: Clock,         earned: true,  color: "#3b82f6", desc: "< 5 min response"        },
  { name: "Perfect Week",     icon: Star,          earned: true,  color: "#a855f7", desc: "100% clearance week"     },
  { name: "Street Veteran",   icon: Shield,        earned: true,  color: "#800000", desc: "50 cases resolved"       },
  { name: "Evidence Expert",  icon: CheckCircle,   earned: false, color: "#6b7280", desc: "100 photos uploaded"     },
  { name: "Top Performer",    icon: Award,         earned: false, color: "#6b7280", desc: "Rank #1 monthly"         },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PatrolProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: patrolStats, loading: statsLoading } = useApi(fetchPatrolStats);
  const { data: history,     loading: historyLoading } = useApi(fetchPatrolHistory);

  const shiftProgress = 58; // % of shift completed — production: compute from shiftStart/shiftEnd

  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 pb-24 lg:pb-6">

      {/* ── Officer Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 overflow-hidden"
        style={{ borderColor: "#800000", backgroundColor: "#161b22" }}
      >
        <div className="p-3 sm:p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end opacity-5 pr-4">
            <Shield className="w-24 sm:w-32 h-24 sm:h-32" style={{ color: "#800000" }} />
          </div>

          <div className="flex items-start gap-3 sm:gap-4 relative">
            <div className="relative shrink-0">
              <div
                className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl"
                style={{ backgroundColor: "#800000" }}
              >
                {user.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-slate-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-800 animate-ping" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h2 className="text-white font-bold text-sm sm:text-base">{user.first_name} {user.last_name}</h2>
                <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: "#800000" }}>
                  PATROL
                </span>
              </div>
              <div className="text-slate-400 text-xs sm:text-sm mb-2">{(user as any).rank ?? "Patrol Officer"}</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-slate-700 text-xs" style={{ backgroundColor: "#0d1117" }}>
                  <Radio className="w-3 h-3 text-green-400 shrink-0" />
                  <span className="text-green-400 truncate">{(user as any).unit ?? "Unit —"}</span>
                </div>
                <div className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-slate-700 text-xs" style={{ backgroundColor: "#0d1117" }}>
                  <Shield className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-slate-400 truncate">{(user as any).badgeNumber ?? "Badge —"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Progress */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-400 text-xs font-medium">Day Shift</span>
              </div>
              <span className="text-slate-500 text-xs whitespace-nowrap">
                {(user as any).shiftStart ?? "06:00"} – {(user as any).shiftEnd ?? "18:00"}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${shiftProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: "#800000" }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-slate-600 text-xs">{shiftProgress}% complete</span>
              <span className="text-slate-600 text-xs">~5h remaining</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Today's Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Cases Today",  value: statsLoading ? "…" : (patrolStats?.today.completed  ?? "—"),       icon: CheckCircle, color: "#22c55e" },
          { label: "Avg Response", value: statsLoading ? "…" : (patrolStats?.today.avgResponse ?? "—"),       icon: Zap,         color: "#f59e0b" },
          { label: "Patrol km",    value: statsLoading ? "…" : (patrolStats?.today.distance   ?? "—"),       icon: Navigation,  color: "#3b82f6" },
          { label: "Weekly Rank",  value: statsLoading ? "…" : `#${patrolStats?.today.rank    ?? "—"}`,       icon: Star,        color: "#a855f7" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-2.5 sm:p-4 border border-slate-700/50 text-center"
            style={{ backgroundColor: "#161b22" }}
          >
            <s.icon className="w-4 sm:w-5 h-4 sm:h-5 mx-auto mb-1.5 sm:mb-2" style={{ color: s.color }} />
            <div className="text-white font-bold text-base sm:text-lg">{s.value}</div>
            <div className="text-slate-500 text-xs">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Performance Radar ── */}
      <div className="rounded-2xl p-3 sm:p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 shrink-0" style={{ color: "#800000" }} />
          <h3 className="text-white font-semibold text-sm">Performance</h3>
        </div>
        <p className="text-slate-500 text-xs mb-4">Current month · All indicators</p>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={performanceRadar}>
            <PolarGrid stroke="#2d3748" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <Radar name="Performance" dataKey="A" stroke="#800000" fill="#800000" fillOpacity={0.25} strokeWidth={2} />
            <Tooltip
              contentStyle={{ backgroundColor: "#161b22", border: "1px solid #374151", borderRadius: "12px" }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#9ca3af" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly Overview ── */}
      <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <h3 className="text-white font-semibold text-sm">Monthly Overview</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {statsLoading ? "…" : (patrolStats?.month.completed ?? "—")}
            </div>
            <div className="text-slate-500 text-xs">Cases Closed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {statsLoading ? "…" : `${patrolStats?.week.clearanceRate ?? "—"}%`}
            </div>
            <div className="text-slate-500 text-xs">Clearance Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {statsLoading ? "…" : (patrolStats?.month.commendations ?? "—")}
            </div>
            <div className="text-slate-500 text-xs">Commendations</div>
          </div>
        </div>
        {patrolStats?.month.topCategory && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-slate-500 text-xs mb-1">Top category this month</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-slate-300 text-sm">{patrolStats.month.topCategory}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Badges ── */}
      <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-semibold text-sm">Officer Badges</h3>
          <span className="ml-auto text-slate-500 text-xs">
            {officerBadges.filter((b) => b.earned).length}/{officerBadges.length} earned
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {officerBadges.map((b, i) => (
            <div
              key={i}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                b.earned ? "border-slate-600" : "border-slate-700/30 opacity-40"
              }`}
              style={{ backgroundColor: b.earned ? "#0d1117" : "#0d0d0d" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${b.color}20` }}>
                <b.icon className="w-4 h-4" style={{ color: b.earned ? b.color : "#4b5563" }} />
              </div>
              <div style={{ color: b.earned ? "#e5e7eb" : "#4b5563", fontSize: "10px" }} className="font-medium">
                {b.name}
              </div>
              <div className="text-slate-600" style={{ fontSize: "9px" }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: "#161b22" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
        </div>
        {historyLoading ? (
          <div className="px-4 py-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-[#800000] rounded-full animate-spin" />
          </div>
        ) : !history || history.length === 0 ? (
          <PatrolEmptyState icon={Activity} title="No resolved cases yet" />
        ) : (
          <div className="divide-y divide-slate-700/30">
            {history.slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-200 text-xs font-medium truncate">{r.title}</div>
                  <div className="text-slate-500 text-xs">{r.responseTime} response</div>
                </div>
                <div className="text-slate-600 text-xs shrink-0">
                  {new Date(r.timeResolved).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={() => navigate("/")}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-900/40 text-red-400 hover:bg-red-950/20 transition-colors text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        End Shift & Sign Out
      </button>
    </div>
  );
}
