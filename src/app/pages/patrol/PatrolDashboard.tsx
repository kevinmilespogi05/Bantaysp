import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle, MapPin, Clock, User, CheckCircle, XCircle,
  Navigation, Zap, Shield, Activity, TrendingUp, Star,
  ChevronRight, Camera, FileText, Phone, Radio, Target,
  ClipboardList, ArrowRight, LogOut, Loader, Image as ImageIcon, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApi, fetchActiveCase, fetchAssignedReports, fetchPatrolStats, fetchPatrolHistory, cancelPatrolCase, startPatrolResponse, resolvePatrolCase, uploadToCloudinary, addPatrolComment } from "../../services/api";
import { PatrolEmptyState, PatrolSkeletonCard } from "../../components/ui/DataStates";

type CaseStatus = "assigned" | "accepted" | "in_progress" | "submitted" | "resolving" | "resolved";

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
  const { user, session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [caseStatus, setCaseStatus] = useState<CaseStatus>("accepted");
  const [showResolution, setShowResolution] = useState(false);
  const [resNotes, setResNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [inProgressLoading, setInProgressLoading] = useState(false);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // ── Data from API service ─────────────────────────────────────────────────
  const { data: activeCase, loading: caseLoading, refetch: refetchActiveCase } = useApi(() => fetchActiveCase(user.id));
  const { data: assignedReports, loading: assignedLoading } = useApi(fetchAssignedReports);
  const { data: patrolStats, loading: statsLoading } = useApi(fetchPatrolStats);
  const { data: patrolHistory, loading: historyLoading } = useApi(fetchPatrolHistory);

  // Attach stream to video element when camera becomes active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      console.log("[PatrolDashboard] Attaching stream to video element");
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Sync caseStatus with activeCase.status from database
  useEffect(() => {
    if (activeCase?.status) {
      setCaseStatus(activeCase.status as CaseStatus);
    }
  }, [activeCase?.status]);

  const handleAccept = () => setCaseStatus("accepted");
  const handleDecline = () => { setShowDeclineConfirm(true); };
  const confirmDecline = () => { setDeclined(true); setShowDeclineConfirm(false); };
  
  const handleInProgress = async () => {
    if (!activeCase) return;
    setInProgressLoading(true);
    try {
      const response = await startPatrolResponse(activeCase.id);
      if (response.error) {
        console.error("[PatrolDashboard] Failed to mark as in_progress:", response.error);
        return;
      }
      console.log("[PatrolDashboard] ✅ Case marked as in_progress, refetching...");
      // Refetch active case to sync with database
      setTimeout(() => refetchActiveCase(), 100);
    } catch (err) {
      console.error("[PatrolDashboard] Error:", err);
    } finally {
      setInProgressLoading(false);
    }
  };
  
  const handleResolve = () => setShowResolution(true);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setResolutionError("Please select an image file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setResolutionError("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
    setShowCamera(false);
  };

  const startCamera = async () => {
    try {
      console.log("[PatrolDashboard] Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      console.log("[PatrolDashboard] Stream stored, camera active set");
    } catch (err) {
      console.error("[PatrolDashboard] Camera error:", err);
      setResolutionError("Unable to access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `patrol_evidence_${Date.now()}.jpg`, { type: "image/jpeg" });
            setPhotoFile(file);
            setPhotoPreview(canvasRef.current!.toDataURL("image/jpeg"));
            stopCamera();
          }
        }, "image/jpeg", 0.95);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setShowCamera(false);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const submitResolution = async () => {
    if (!photoFile || !activeCase) return;
    
    setResolutionLoading(true);
    setUploadingPhoto(true);
    setResolutionError(null);
    
    try {
      // Upload photo to Cloudinary
      console.log("[PatrolDashboard] Uploading photo to Cloudinary...");
      const uploadResult = await uploadToCloudinary(photoFile);
      
      if (uploadResult.error || !uploadResult.data?.url) {
        setResolutionError("Failed to upload photo: " + uploadResult.error);
        console.error("[PatrolDashboard] Upload failed:", uploadResult.error);
        setResolutionLoading(false);
        setUploadingPhoto(false);
        return;
      }
      
      const evidenceUrl = uploadResult.data.url;
      console.log("[PatrolDashboard] Photo uploaded to Cloudinary:", evidenceUrl);
      
      setUploadingPhoto(false);
      
      // Call API to resolve the case with evidence URL and notes
      const response = await resolvePatrolCase(activeCase.id, resNotes, evidenceUrl, activeCase.category);
      
      if (response.error) {
        setResolutionError(response.error);
        console.error("[PatrolDashboard] Resolution failed:", response.error);
        setResolutionLoading(false);
        return;
      }
      
      console.log("[PatrolDashboard] ✅ Case resolved successfully");
      
      // Post resolution notes as patrol comment visible to residents
      if (resNotes.trim() && session?.access_token) {
        try {
          const { error: commentError } = await addPatrolComment(activeCase.id, resNotes, "patrol");
          if (commentError) {
            console.warn("[PatrolDashboard] Failed to post comment, but resolution was successful", commentError);
          } else {
            console.log("[PatrolDashboard] ✅ Patrol comment posted");
          }
        } catch (err) {
          console.warn("[PatrolDashboard] Comment error:", err);
        }
      }
      
      setShowResolution(false);
      setCaseStatus("submitted");
      setPhotoFile(null);
      setPhotoPreview(null);
      setResNotes("");
      
      // Refetch active case to sync with database
      setTimeout(() => refetchActiveCase(), 100);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to resolve case";
      setResolutionError(errorMsg);
      console.error("[PatrolDashboard] Resolution error:", err);
    } finally {
      setResolutionLoading(false);
      setUploadingPhoto(false);
    }
  };

  const stats = patrolStats ? [
    { label: "Completed Today", value: patrolStats.today.completed.toString(), icon: CheckCircle, color: "#22c55e" },
    { label: "Avg Response", value: patrolStats.today.avgResponse, icon: Zap, color: "#f59e0b" },
    { label: "Patrol Distance", value: patrolStats.today.distance, icon: Navigation, color: "#3b82f6" },
    { label: "Weekly Rank", value: `#${patrolStats.today.rank}`, icon: Star, color: "#a855f7" },
  ] : [];

  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 pb-24 lg:pb-6">
      {/* ── Shift Status Banner ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-700/50 gap-2"
        style={{ backgroundColor: "#161b22" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-green-400 text-xs font-semibold">ON DUTY</span>
          <span className="text-slate-600 text-xs hidden xs:block">·</span>
          <span className="text-slate-300 text-xs">{user.unit}</span>
          <span className="text-slate-600 text-xs hidden sm:block">·</span>
          <span className="text-slate-400 text-xs hidden sm:block">{user.badgeNumber}</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-700/30 text-slate-300 text-xs flex-1 sm:flex-none">
            <Radio className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate">Shift: {user.shiftStart}–{user.shiftEnd}</span>
          </div>
          <button
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center justify-center gap-1 ml-auto px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-slate-100 text-xs font-medium transition-all border border-slate-600 hover:border-slate-500 shrink-0"
            title="End shift and return home"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">End</span>
          </button>
        </div>
      </motion.div>

      {/* ── ACTIVE CASE CARD ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {declined ? (
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
        ) : activeCase ? (
          <motion.div
            key="active-case"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {caseStatus !== "resolved" && caseStatus !== "submitted" ? (
              <div
                className="rounded-2xl border-2 overflow-hidden relative"
                style={{
                  borderColor: "#475569",
                  backgroundColor: "#1e293b",
                }}
              >
                {/* Top Strip */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-300 animate-pulse" />
                    <span className="text-red-200 text-xs font-bold tracking-wider">ACTIVE CASE — {activeCase?.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {activeCase?.category}
                    </span>
                    <button
                      onClick={() => navigate(`/app/patrol/case/${activeCase?.id}`)}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-all"
                      title="View full case details"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Details
                    </button>
                  </div>
                </div>

                {/* Case Info */}
                <div className="px-4 py-4">
                  <h2 className="text-white mb-3" style={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}>
                    {activeCase?.title}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white/50 text-xs">Location</div>
                        <div className="text-white text-xs font-medium leading-tight truncate">{activeCase?.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white/50 text-xs">Distance</div>
                        <div className="text-white text-xs font-medium">{activeCase?.distance} · ~{activeCase?.eta}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white/50 text-xs">Reported</div>
                        <div className="text-white text-xs font-medium">{timeAgo(activeCase?.timeReported)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white/50 text-xs">Reporter</div>
                        <div className="text-white text-xs font-medium truncate">{activeCase?.reporter}</div>
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
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {(["assigned", "accepted", "in_progress", "submitted", "resolved"] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
                          caseStatus === s
                            ? "bg-white text-gray-900 font-semibold"
                            : ["assigned", "accepted", "in_progress", "submitted"].indexOf(s) < ["assigned", "accepted", "in_progress", "submitted"].indexOf(caseStatus)
                              ? "bg-green-500/20 text-green-300"
                              : "bg-white/10 text-white/30"
                        }`}>
                          {s === "assigned" && "📋 Assigned"}
                          {s === "accepted" && "✅ Accepted"}
                          {s === "in_progress" && "🚨 Responding"}
                          {s === "submitted" && "📤 Submitted"}
                          {s === "resolved" && "✔️ Resolved"}
                        </div>
                        {i < 4 && <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {caseStatus === "assigned" && (
                      <>
                        <button
                          onClick={handleAccept}
                          className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <CheckCircle className="w-4 h-4" /> <span>Accept</span>
                        </button>
                        <button
                          onClick={handleDecline}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 sm:py-3 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs sm:text-sm transition-all"
                        >
                          <XCircle className="w-4 h-4" /> <span className="hidden xs:inline">Decline</span>
                        </button>
                        <button
                          onClick={() => navigate("/app/patrol/map")}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-all"
                        >
                          <Navigation className="w-4 h-4" /> <span className="hidden xs:inline">Map</span>
                        </button>
                      </>
                    )}
                    {caseStatus === "accepted" && (
                      <>
                        <button
                          onClick={() => navigate("/app/patrol/map")}
                          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-all hover:scale-[1.02]"
                        >
                          <Navigation className="w-4 h-4" /> <span>Navigate</span>
                        </button>
                        <button
                          onClick={handleInProgress}
                          disabled={inProgressLoading}
                          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-70"
                        >
                          {inProgressLoading ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" /> In Progress
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" /> In Progress
                            </>
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            if (!activeCase?.id) return;
                            setCancelLoading(true);
                            try {
                              const response = await cancelPatrolCase(activeCase.id, user.id);
                              if (response.error) {
                                console.error("[PatrolDashboard] Cancel failed:", response.error);
                              } else {
                                setDeclined(true);
                                setCaseStatus("assigned");
                                console.log("[PatrolDashboard] ✅ Case canceled");
                              }
                            } catch (err) {
                              console.error("[PatrolDashboard] Cancel error:", err);
                            } finally {
                              setCancelLoading(false);
                            }
                          }}
                          disabled={cancelLoading}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 sm:py-3 rounded-xl border border-red-500/50 text-red-400 hover:text-red-300 hover:border-red-400 text-xs sm:text-sm transition-all disabled:opacity-50"
                        >
                          {cancelLoading ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </>
                    )}
                    {caseStatus === "in_progress" && (
                      <>
                        <button
                          onClick={handleResolve}
                          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-white font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{ backgroundColor: "#16a34a" }}
                        >
                          <CheckCircle className="w-4 h-4" /> <span>Resolved</span>
                        </button>
                        <button
                          onClick={() => navigate("/app/patrol/map")}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 sm:py-3 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs sm:text-sm transition-all"
                        >
                          <Navigation className="w-4 h-4" /> <span className="hidden xs:inline">Map</span>
                        </button>
                        <button
                          onClick={() => {}}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 sm:py-3 rounded-xl border border-white/20 text-white/60 hover:text-white text-xs sm:text-sm transition-all"
                        >
                          <Camera className="w-4 h-4" /> <span className="hidden xs:inline">Photo</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : caseStatus === "submitted" ? (
              /* Resolution Submitted State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border-2 border-blue-500/30 p-6"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}>
                    <Clock className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-blue-200 text-lg font-bold mb-1">Awaiting Admin Review</h3>
                    <p className="text-blue-300/70 text-sm">
                      Your resolution for {activeCase?.id} has been submitted. An admin is reviewing the evidence and notes. You'll be notified once verified.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => navigate("/app/patrol/assigned")}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-sm font-medium transition-colors"
                  >
                    View Queue
                  </button>
                  <button
                    onClick={() => navigate("/app/patrol/history")}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/10 transition-colors"
                  >
                    View History
                  </button>
                </div>
              </motion.div>
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
                  {activeCase?.id} has been verified and marked as resolved.
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
        ) : null}
      </AnimatePresence>

      {/* ── No Active Case State ─────────────────────────── */}
      {!declined && !activeCase && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-700 p-6 text-center"
          style={{ backgroundColor: "#161b22" }}
        >
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-slate-300 font-semibold mb-1">No Active Case</h3>
          <p className="text-slate-500 text-sm mb-4">You don't have any active cases assigned. Check the queue to accept new cases.</p>
          <button
            onClick={() => navigate("/app/patrol/assigned")}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "#1d4ed8" }}
          >
            View Available Cases
          </button>
        </motion.div>
      )}

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-2xl p-3 sm:p-4 border border-slate-700/50"
            style={{ backgroundColor: "#161b22" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
              <span className="text-slate-400 text-xs truncate">{s.label}</span>
            </div>
            <div className="text-white font-bold text-lg sm:text-xl">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Bottom Grid ──────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        {/* Assigned Queue */}
        <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: "#161b22" }}>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 shrink-0" style={{ color: "#800000" }} />
              <span className="text-white text-sm font-semibold">Case Queue</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs text-white font-bold" style={{ backgroundColor: "#800000" }}>
                {assignedReports?.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/app/patrol/assigned")}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span className="hidden xs:inline">View all</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-700/30">
            {assignedReports?.slice(0, 3).map((r) => {
              const catColor = categoryColors[r.category] ?? "#6b7280";
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/app/patrol/case/${r.id}`)}
                  className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
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
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-white text-sm font-semibold hidden xs:block">Recent Resolved</span>
              <span className="text-white text-sm font-semibold xs:hidden">Resolved</span>
            </div>
            <button
              onClick={() => navigate("/app/patrol/history")}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span className="hidden xs:inline">All history</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-700/30">
            {(patrolHistory ?? []).slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-700/20 transition-colors">
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
      <div className="rounded-2xl border border-slate-700/50 p-3 sm:p-4" style={{ backgroundColor: "#161b22" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 shrink-0" style={{ color: "#800000" }} />
          <span className="text-white text-sm font-semibold">Performance</span>
          <span className="ml-auto text-slate-500 text-xs hidden xs:block">April 2026</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">{patrolStats?.month.completed ?? "—"}</div>
            <div className="text-slate-400 text-xs mb-2">Cases</div>
            <div className="h-1.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full" style={{ width: "76%", backgroundColor: "#800000" }} />
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">{patrolStats?.week.clearanceRate ?? "—"}%</div>
            <div className="text-slate-400 text-xs mb-2">Clearance</div>
            <div className="h-1.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${patrolStats?.week.clearanceRate ?? 0}%` }} />
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">{patrolStats?.month.commendations ?? "—"}</div>
            <div className="text-slate-400 text-xs mb-2">Rewards</div>
            <div className="flex justify-center gap-1">
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
              className="fixed inset-0 bg-black/70 z-40 min-h-screen"
              onClick={() => {
                stopCamera();
                setShowResolution(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:top-1/2 md:-translate-y-1/2 md:w-[480px] md:mx-auto z-50 rounded-t-3xl md:rounded-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "#161b22" }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Mark as Resolved</h3>
                    <p className="text-slate-400 text-xs">Upload evidence to close this case</p>
                  </div>
                </div>

                {/* Photo Evidence Section */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    📷 Photo Evidence <span className="text-red-400">*required</span>
                  </label>

                  {/* Camera Preview */}
                  {cameraActive && (
                    <div className="rounded-2xl border-2 border-slate-600 mb-3 overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-64 object-cover"
                      />
                      <div className="flex gap-2 p-3">
                        <button
                          onClick={capturePhoto}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white text-sm font-medium transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" /> Capture
                        </button>
                        <button
                          onClick={stopCamera}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Photo Preview or Upload Buttons */}
                  {!photoPreview ? (
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={startCamera}
                        disabled={uploadingPhoto || resolutionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 disabled:opacity-50 text-sm font-medium transition-colors"
                      >
                        <Camera className="w-4 h-4" /> Take Photo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto || resolutionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-sm font-medium transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" /> Upload Photo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="rounded-xl border border-green-500/50 p-2 bg-green-500/10 mb-2">
                        <img
                          src={photoPreview}
                          alt="Evidence preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                      <button
                        onClick={removePhoto}
                        disabled={uploadingPhoto || resolutionLoading}
                        className="text-slate-400 hover:text-slate-300 text-xs disabled:opacity-50 transition-colors"
                      >
                        ✎ Change Photo
                      </button>
                    </div>
                  )}

                  {/* Error Message */}
                  {resolutionError && (
                    <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-300 text-xs">{resolutionError}</p>
                    </div>
                  )}

                  {/* Upload Status */}
                  {uploadingPhoto && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-3">
                      <Loader className="w-4 h-4 animate-spin text-blue-400" />
                      <span className="text-blue-300 text-xs">Uploading photo...</span>
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
                    disabled={resolutionLoading}
                    placeholder="Describe how the incident was resolved..."
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-500 text-sm p-3 resize-none outline-none focus:border-slate-400 transition-colors disabled:opacity-50"
                    rows={3}
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      stopCamera();
                      setShowResolution(false);
                    }}
                    disabled={resolutionLoading}
                    className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitResolution}
                    disabled={!photoFile || resolutionLoading}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: (photoFile && !resolutionLoading) ? "#16a34a" : "#374151" }}
                  >
                    {resolutionLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>Submit Resolution</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

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