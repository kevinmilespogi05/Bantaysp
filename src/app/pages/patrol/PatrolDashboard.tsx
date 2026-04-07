import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle, MapPin, Clock, User, CheckCircle, XCircle,
  Navigation, Zap, Shield, Activity, TrendingUp, Star,
  ChevronRight, Camera, FileText, Phone, Radio, Target,
  ClipboardList, ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApi, fetchActiveCase, fetchAssignedReports, fetchPatrolStats, fetchPatrolHistory } from "../../services/api";
import { PatrolEmptyState, PatrolSkeletonCard } from "../../components/ui/DataStates";

type CaseStatus = "assigned" | "accepted" | "in_progress" | "resolving" | "resolved";

const priorityConfig = {
  critical: { bg: "#7f1d1d", border: "#ef4444", badge: "bg-red-500", text: "CRITICAL", glow: "0 0 30px rgba(239,68,68,0.3)" },
  high: { bg: "#7c2d12", border: "#f97316", badge: "bg-orange-500", text: "HIGH", glow: "0 0 30px rgba(249,115,22,0.25)" },
  medium: { bg: "#713f12", border: "#eab308", badge: "bg-yellow-500", text: "MEDIUM", glow: "0 0 20px rgba(234,179,8,0.2)" },
  low: { bg: "#14532d", border: "#22c55e", badge: "bg-green-500", text: "LOW", glow: "0 0 20px rgba(34,197,94,0.2)" },
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
  return `${Math.floor(diff / 60)}h ago`;
}

export function PatrolDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseStatus, setCaseStatus] = useState<CaseStatus>("assigned");
  const [showResolution, setShowResolution] = useState(false);
  const [resNotes, setResNotes] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declined, setDeclined] = useState(false);

  // ── Data from API service ─────────────────────────────────────────────────
  const { data: activeCase, loading: caseLoading } = useApi(fetchActiveCase);
  const { data: assignedReports, loading: assignedLoading } = useApi(fetchAssignedReports);
  const { data: patrolStats, loading: statsLoading } = useApi(fetchPatrolStats);
  const { data: patrolHistory, loading: historyLoading } = useApi(fetchPatrolHistory);

  const pCfg = activeCase
    ? priorityConfig[activeCase.priority as keyof typeof priorityConfig] ?? priorityConfig.medium
    : priorityConfig.medium;

  const handleAccept = () => setCaseStatus("accepted");
  const handleDecline = () => { setShowDeclineConfirm(true); };
  const confirmDecline = () => { setDeclined(true); setShowDeclineConfirm(false); };
  const handleInProgress = () => setCaseStatus("in_progress");
  const handleResolve = () => setShowResolution(true);
  const submitResolution = () => {
    if (!photoUploaded) return;
    setShowResolution(false);
    setCaseStatus("resolved");
  };

  const stats = patrolStats ? [
    { label: "Completed Today", value: patrolStats.today.completed.toString(), icon: CheckCircle, color: "#22c55e" },
    { label: "Avg Response", value: patrolStats.today.avgResponse, icon: Zap, color: "#f59e0b" },
    { label: "Patrol Distance", value: patrolStats.today.distance, icon: Navigation, color: "#3b82f6" },
    { label: "Weekly Rank", value: `#${patrolStats.today.rank}`, icon: Star, color: "#a855f7" },
  ] : [];

  return (
    <div className="p-4 md:p-5 space-y-4 pb-24 md:pb-6">
      {/* ── Shift Status Banner ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl px-4 py-3 border border-slate-700/50"
        style={{ backgroundColor: "#161b22" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-semibold">ON DUTY</span>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-slate-300 text-xs">{user.unit}</span>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-slate-400 text-xs">{user.badgeNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 text-xs">Shift: {user.shiftStart}–{user.shiftEnd}</span>
        </div>
      </motion.div>

      {/* ── ACTIVE CASE CARD ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!declined ? (
          <motion.div
            key="active-case"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {caseStatus !== "resolved" ? (
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
                  </div>
                </div>

                {/* Case Info */}
                <div className="px-4 py-4">
                  <h2 className="text-white mb-3" style={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}>
                    {activeCase?.title}
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-300 shrink-0" />
                      <div>
                        <div className="text-white/50 text-xs">Location</div>
                        <div className="text-white text-xs font-medium leading-tight">{activeCase?.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-300 shrink-0" />
                      <div>
                        <div className="text-white/50 text-xs">Distance</div>
                        <div className="text-white text-xs font-medium">{activeCase?.distance} · ~{activeCase?.eta}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                      <div>
                        <div className="text-white/50 text-xs">Reported</div>
                        <div className="text-white text-xs font-medium">{timeAgo(activeCase?.timeReported)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-300 shrink-0" />
                      <div>
                        <div className="text-white/50 text-xs">Reporter</div>
                        <div className="text-white text-xs font-medium">{activeCase?.reporter}</div>
                      </div>
                    </div>
                  </div>

                  {/* Reporter Notes */}
                  <div className="rounded-xl p-3 mb-4 border border-white/10" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-white/50" />
                      <span className="text-white/50 text-xs">Reporter's Notes</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">{activeCase?.reporterNotes}</p>
                  </div>

                  {/* Status Flow */}
                  <div className="flex items-center gap-2 mb-4">
                    {(["assigned", "accepted", "in_progress", "resolved"] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                          caseStatus === s
                            ? "bg-white text-gray-900 font-semibold"
                            : ["assigned", "accepted", "in_progress"].indexOf(s) < ["assigned", "accepted", "in_progress"].indexOf(caseStatus)
                              ? "bg-green-500/20 text-green-300"
                              : "bg-white/10 text-white/30"
                        }`}>
                          {s === "assigned" && "📋 Assigned"}
                          {s === "accepted" && "✅ Accepted"}
                          {s === "in_progress" && "🚨 Responding"}
                          {s === "resolved" && "✔️ Resolved"}
                        </div>
                        {i < 3 && <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {caseStatus === "assigned" && (
                      <>
                        <button
                          onClick={handleAccept}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept Case
                        </button>
                        <button
                          onClick={handleDecline}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-all"
                        >
                          <XCircle className="w-4 h-4" /> Decline
                        </button>
                        <button
                          onClick={() => navigate("/app/patrol/map")}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
                        >
                          <Navigation className="w-4 h-4" /> View Map
                        </button>
                      </>
                    )}
                    {caseStatus === "accepted" && (
                      <>
                        <button
                          onClick={() => navigate("/app/patrol/map")}
                          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all hover:scale-[1.02]"
                        >
                          <Navigation className="w-4 h-4" /> Navigate to Scene
                        </button>
                        <button
                          onClick={handleInProgress}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium transition-all"
                        >
                          <Zap className="w-4 h-4" /> Mark In Progress
                        </button>
                        <button
                          onClick={() => {}}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-white/60 hover:text-white text-sm transition-all"
                        >
                          <Phone className="w-4 h-4" /> Call Reporter
                        </button>
                      </>
                    )}
                    {caseStatus === "in_progress" && (
                      <>
                        <button
                          onClick={handleResolve}
                          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{ backgroundColor: "#16a34a" }}
                        >
                          <CheckCircle className="w-5 h-5" /> Mark as Resolved
                        </button>
                        <button
                          onClick={() => navigate("/app/patrol/map")}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-sm transition-all"
                        >
                          <Navigation className="w-4 h-4" /> Map
                        </button>
                        <button
                          onClick={() => {}}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/20 text-white/60 hover:text-white text-sm transition-all"
                        >
                          <Camera className="w-4 h-4" /> Upload Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Resolved State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border-2 border-green-500 p-6 text-center"
                style={{ backgroundColor: "#052e16", boxShadow: "0 0 30px rgba(34,197,94,0.25)" }}
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-green-300 text-lg font-bold mb-1">Case Resolved! 🎉</h3>
                <p className="text-green-500/70 text-sm mb-4">
                  {activeCase?.id} has been marked as resolved and submitted for review.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate("/app/patrol/history")}
                    className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 text-sm hover:bg-green-500/30 transition-colors"
                  >
                    View in History
                  </button>
                  <button
                    onClick={() => navigate("/app/patrol/assigned")}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                  >
                    Next Case
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* Declined State */
          <motion.div
            key="declined"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-700 p-6 text-center"
            style={{ backgroundColor: "#161b22" }}
          >
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-1">Case Declined</h3>
            <p className="text-slate-500 text-sm mb-4">Case returned to dispatch queue.</p>
            <button
              onClick={() => navigate("/app/patrol/assigned")}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#800000" }}
            >
              View Assigned Queue
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-2xl p-4 border border-slate-700/50"
            style={{ backgroundColor: "#161b22" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-slate-400 text-xs">{s.label}</span>
            </div>
            <div className="text-white font-bold" style={{ fontSize: "1.4rem" }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Bottom Grid ──────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Assigned Queue */}
        <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: "#161b22" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" style={{ color: "#800000" }} />
              <span className="text-white text-sm font-semibold">Case Queue</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs text-white font-bold" style={{ backgroundColor: "#800000" }}>
                {assignedReports?.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/app/patrol/assigned")}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-700/30">
            {assignedReports?.slice(0, 3).map((r) => {
              const pColor = r.priority === "high" ? "#ef4444" : r.priority === "medium" ? "#f59e0b" : "#22c55e";
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/app/patrol/case/${r.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-xs font-medium truncate">{r.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-slate-500 text-xs truncate">{r.distance}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Resolved */}
        <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: "#161b22" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm font-semibold">Recent Resolved</span>
            </div>
            <button
              onClick={() => navigate("/app/patrol/history")}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              All history <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-700/30">
            {(patrolHistory ?? []).slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors">
                <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-200 text-xs font-medium truncate">{r.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-slate-500 text-xs">Response: {r.responseTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Performance Summary ───────────────────────────── */}
      <div className="rounded-2xl border border-slate-700/50 p-4" style={{ backgroundColor: "#161b22" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: "#800000" }} />
          <span className="text-white text-sm font-semibold">Performance Overview</span>
          <span className="ml-auto text-slate-500 text-xs">April 2026</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{patrolStats?.month.completed ?? "—"}</div>
            <div className="text-slate-400 text-xs">Cases This Month</div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full" style={{ width: "76%", backgroundColor: "#800000" }} />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{patrolStats?.week.clearanceRate ?? "—"}%</div>
            <div className="text-slate-400 text-xs">Clearance Rate</div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${patrolStats?.week.clearanceRate ?? 0}%` }} />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{patrolStats?.month.commendations ?? "—"}</div>
            <div className="text-slate-400 text-xs">Commendations</div>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2].map((i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Resolution Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showResolution && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowResolution(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:top-1/2 md:-translate-y-1/2 md:w-[480px] md:mx-auto z-50 rounded-t-3xl md:rounded-2xl border border-slate-700 shadow-2xl"
              style={{ backgroundColor: "#161b22" }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Mark as Resolved</h3>
                    <p className="text-slate-400 text-xs">Provide evidence to close this case</p>
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    📷 Photo Evidence <span className="text-red-400">*required</span>
                  </label>
                  {!photoUploaded ? (
                    <button
                      onClick={() => setPhotoUploaded(true)}
                      className="w-full border-2 border-dashed border-slate-600 rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-slate-400 transition-colors"
                    >
                      <Camera className="w-8 h-8 text-slate-500" />
                      <span className="text-slate-400 text-sm">Tap to take photo or upload</span>
                      <span className="text-slate-600 text-xs">Camera-first · JPG, PNG supported</span>
                    </button>
                  ) : (
                    <div className="w-full rounded-2xl border-2 border-green-500/50 p-4 flex items-center gap-3 bg-green-500/10">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      <div>
                        <div className="text-green-300 text-sm font-medium">Photo captured</div>
                        <div className="text-green-500/60 text-xs">scene_evidence_07.jpg</div>
                      </div>
                      <button onClick={() => setPhotoUploaded(false)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-5">
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    📝 Resolution Notes <span className="text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    value={resNotes}
                    onChange={(e) => setResNotes(e.target.value)}
                    placeholder="Describe how the incident was resolved..."
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-500 text-sm p-3 resize-none outline-none focus:border-slate-400 transition-colors"
                    rows={3}
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResolution(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitResolution}
                    disabled={!photoUploaded}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: photoUploaded ? "#16a34a" : "#374151" }}
                  >
                    Submit Resolution
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Decline Confirm ──────────────────────────────── */}
      <AnimatePresence>
        {showDeclineConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:w-80 md:left-1/2 md:-translate-x-1/2 z-50 rounded-2xl border border-slate-700 p-5 shadow-2xl"
              style={{ backgroundColor: "#1e293b" }}
            >
              <h3 className="text-white font-bold mb-1">Decline this case?</h3>
              <p className="text-slate-400 text-sm mb-4">The case will be returned to dispatch and reassigned.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeclineConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmDecline} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                  Decline Case
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}