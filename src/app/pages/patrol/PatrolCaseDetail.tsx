import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, MapPin, Clock, User, Phone, AlertTriangle,
  CheckCircle, Navigation, Camera, FileText, Zap, ChevronRight,
  XCircle, MessageSquare, Image as ImageIcon, Loader,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApi, fetchAssignedReports, fetchAvailableReports, acceptPatrolCase } from "../../services/api";

type CaseStatus = "pending" | "accepted" | "in_progress" | "resolving" | "resolved";

const priorityConfig: Record<string, { color: string; bg: string; border: string; label: string; glow: string }> = {
  critical: { color: "#ef4444", bg: "#7f1d1d", border: "#ef4444", label: "CRITICAL", glow: "0 0 24px rgba(239,68,68,0.25)" },
  high: { color: "#f97316", bg: "#7c2d12", border: "#f97316", label: "HIGH", glow: "0 0 24px rgba(249,115,22,0.2)" },
  medium: { color: "#eab308", bg: "#713f12", border: "#eab308", label: "MEDIUM", glow: "" },
  low: { color: "#22c55e", bg: "#14532d", border: "#22c55e", label: "LOW", glow: "" },
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (diff < 60) return `${Math.floor(diff)} min ago`;
  return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60)}m ago`;
}

export function PatrolCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<CaseStatus>("pending");
  const [showResolution, setShowResolution] = useState(false);
  const [resNotes, setResNotes] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [comment, setComment] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch both assigned and available reports
  const { data: assignedReports, loading: assignedLoading } = useApi(fetchAssignedReports);
  const { data: availableReports, loading: availableLoading } = useApi(fetchAvailableReports);
  
  // Search in both lists
  const allReports = [...(assignedReports ?? []), ...(availableReports ?? [])];
  const report = allReports.find((r) => r.id === id);
  const loading = assignedLoading || availableLoading;
  const pCfg = priorityConfig[report?.priority ?? "medium"] ?? priorityConfig.medium;

  const handleAcceptCase = async () => {
    if (!id) return;
    
    setAcceptLoading(true);
    setAcceptError(null);
    
    try {
      // Pass the user ID as the patrol ID
      const response = await acceptPatrolCase(id, user.id);
      
      if (response.error) {
        setAcceptError(response.error);
        console.error("[PatrolCaseDetail] Accept failed:", response.error);
        return;
      }
      
      console.log("[PatrolCaseDetail] ✅ Case accepted successfully");
      setStatus("accepted");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to accept case";
      setAcceptError(errorMsg);
      console.error("[PatrolCaseDetail] Accept error:", err);
    } finally {
      setAcceptLoading(false);
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading case details...</p>
        </div>
      </div>
    );
  }

  // Handle case not found
  if (!report) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-white font-semibold text-lg mb-2">Case Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">This case is not available or has been archived.</p>
        <button
          onClick={() => navigate("/app/patrol/assigned")}
          className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: "#800000" }}
        >
          Back to Assigned Reports
        </button>
      </div>
    );
  }

  const submitResolution = () => {
    if (!photoUploaded) return;
    setShowResolution(false);
    setStatus("resolved");
  };

  if (status === "resolved") {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Case Resolved! 🎉</h2>
          <p className="text-slate-400 text-sm mb-2">{report.id} · {report.title}</p>
          <p className="text-slate-500 text-xs mb-6">Resolution submitted for admin review. Great work, Officer!</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/app/patrol/history")}
              className="px-5 py-2.5 rounded-xl bg-green-500/20 text-green-300 text-sm hover:bg-green-500/30 transition-colors"
            >
              View History
            </button>
            <button
              onClick={() => navigate("/app/patrol/assigned")}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: "#800000" }}
            >
              Next Case
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-slate-700/50" style={{ backgroundColor: "#0d1117" }}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{report.title}</div>
          <div className="text-slate-400 text-xs">{report.id}</div>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: pCfg.color }}
        >
          {pCfg.label}
        </span>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* ── Priority Strip ───────────────────────────── */}
        <div
          className="rounded-2xl border-2 p-4"
          style={{ borderColor: pCfg.border, backgroundColor: pCfg.bg, boxShadow: pCfg.glow }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-300" />
            <span className="text-red-200 text-xs font-bold">{report.category}</span>
          </div>
          <h2 className="text-white font-bold mb-3" style={{ fontSize: "1.05rem" }}>{report.title}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-white/50 shrink-0" />
              <span className="text-white/80 text-xs">{report.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="text-blue-300 text-xs font-medium">{report.distance} away</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/50 shrink-0" />
              <span className="text-white/70 text-xs">{timeAgo(report.timeReported)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-white/50 shrink-0" />
              <span className="text-white/70 text-xs">{report.reporter}</span>
            </div>
          </div>
        </div>

        {/* ── Status Tracker ────────────────────────────── */}
        <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
          <h3 className="text-slate-300 text-sm font-semibold mb-3">Response Status</h3>
          <div className="flex items-center">
            {(["pending", "accepted", "in_progress", "resolved"] as const).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    status === s ? "text-white ring-2 ring-offset-2 ring-offset-slate-800" :
                    ["pending", "accepted", "in_progress"].indexOf(s) < ["pending", "accepted", "in_progress"].indexOf(status) || status === "resolved"
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-500"
                  }`}
                  style={status === s ? { backgroundColor: "#800000", ringColor: "#800000" } : {}}
                  >
                    {(["pending", "accepted", "in_progress"].indexOf(s) < ["pending", "accepted", "in_progress"].indexOf(status) || status === "resolved") && s !== status
                      ? "✓" : i + 1}
                  </div>
                  <span className={`text-center leading-tight ${status === s ? "text-white" : "text-slate-500"}`} style={{ fontSize: "9px", maxWidth: "50px" }}>
                    {s === "pending" ? "Queued" : s === "accepted" ? "Accepted" : s === "in_progress" ? "Responding" : "Done"}
                  </span>
                </div>
                {i < 3 && (
                  <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: ["pending", "accepted", "in_progress"].indexOf(s) < ["pending", "accepted", "in_progress"].indexOf(status) ? "#22c55e" : "#2d3748" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Report Details ───────────────────────────── */}
        <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: "#161b22" }}>
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-slate-300 text-sm font-semibold">Incident Details</h3>
          </div>
          <div className="p-4">
            <p className="text-slate-300 text-sm leading-relaxed">{report.description}</p>
          </div>
        </div>

        {/* ── Reporter Info ────────────────────────────── */}
        <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
          <h3 className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">Reporter</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
              {report.reporterAvatar}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{report.reporter}</div>
              <div className="text-slate-500 text-xs">Community Reporter</div>
            </div>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-600 text-slate-400 hover:text-white transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-600 text-slate-400 hover:text-white transition-colors">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Acceptance Info ─────────────────────────── */}
        {report.acceptedBy && (
          <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
            <h3 className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">Accepted By</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 bg-blue-600">
                {report.acceptedBy.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">{report.acceptedBy}</div>
                <div className="text-slate-500 text-xs">Patrol Officer</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Map Preview ─────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden border border-slate-700/50 relative cursor-pointer"
          onClick={() => navigate("/app/patrol/map")}
          style={{ height: "140px" }}
        >
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#1e2432" }}>
            <svg className="absolute inset-0 w-full h-full opacity-20">
              <defs>
                <pattern id="mini-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#4a5568" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mini-grid)"/>
            </svg>
            <div className="relative flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-slate-400 text-xs">{report.location}</span>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white font-medium border border-slate-600" style={{ backgroundColor: "#161b22" }}>
            <Navigation className="w-3 h-3 text-blue-400" />
            Open Map · {report.distance}
          </div>
        </div>

        {/* ── Upload Evidence ──────────────────────────── */}
        <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
          <h3 className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">Field Updates</h3>
          <div className="flex gap-2 mb-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
              <Camera className="w-4 h-4" /> Upload Photo
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
              <FileText className="w-4 h-4" /> Add Note
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add field note..."
              className="flex-1 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-600 text-sm px-3 py-2 outline-none focus:border-slate-400"
            />
            <button
              onClick={() => setComment("")}
              disabled={!comment}
              className="px-3 py-2 rounded-xl text-white text-sm disabled:opacity-40 transition-colors"
              style={{ backgroundColor: "#800000" }}
            >
              Send
            </button>
          </div>
        </div>

        {/* ── Action Buttons ────────────────────────────── */}
        <div className="space-y-2">
          {acceptError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-red-500/15 text-red-400 text-sm border border-red-500/30"
            >
              {acceptError}
            </motion.div>
          )}
          {status === "pending" && (
            <button
              onClick={handleAcceptCase}
              disabled={acceptLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
              style={{ backgroundColor: "#16a34a" }}
            >
              {acceptLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" /> Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Accept This Case
                </>
              )}
            </button>
          )}
          {status === "accepted" && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/app/patrol/map")}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
              >
                <Navigation className="w-5 h-5" /> Navigate
              </button>
              <button
                onClick={() => setStatus("in_progress")}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-all"
              >
                <Zap className="w-5 h-5" /> In Progress
              </button>
            </div>
          )}
          {status === "in_progress" && (
            <button
              onClick={() => setShowResolution(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
              style={{ backgroundColor: "#16a34a" }}
            >
              <CheckCircle className="w-5 h-5" /> Mark as Resolved
            </button>
          )}
          {status !== "pending" && (
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Return to Queue
            </button>
          )}
        </div>
      </div>

      {/* ── Resolution Modal ─────────────────────────── */}
      <AnimatePresence>
        {showResolution && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-40" onClick={() => setShowResolution(false)} />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-[480px] md:mx-auto md:top-1/2 md:-translate-y-1/2 z-50 rounded-t-3xl md:rounded-2xl border border-slate-700 shadow-2xl"
              style={{ backgroundColor: "#161b22" }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Mark as Resolved</h3>
                    <p className="text-slate-400 text-xs">Upload evidence to close {report.id}</p>
                  </div>
                </div>

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
                      <span className="text-slate-400 text-sm">Tap to capture scene photo</span>
                    </button>
                  ) : (
                    <div className="w-full rounded-2xl border-2 border-green-500/50 p-4 flex items-center gap-3 bg-green-500/10">
                      <ImageIcon className="w-5 h-5 text-green-400 shrink-0" />
                      <div>
                        <div className="text-green-300 text-sm font-medium">Photo captured</div>
                        <div className="text-green-500/60 text-xs">{report.id}_evidence.jpg</div>
                      </div>
                      <button onClick={() => setPhotoUploaded(false)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">Remove</button>
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    📝 Resolution Notes <span className="text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    value={resNotes}
                    onChange={(e) => setResNotes(e.target.value)}
                    placeholder="Describe the outcome..."
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-500 text-sm p-3 resize-none outline-none focus:border-slate-400"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowResolution(false)} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={submitResolution}
                    disabled={!photoUploaded}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
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
    </div>
  );
}