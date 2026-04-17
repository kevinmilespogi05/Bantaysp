import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, MapPin, Clock, User, Phone, AlertTriangle,
  CheckCircle, Navigation, Camera, FileText, Zap, ChevronRight,
  XCircle, MessageSquare, Image as ImageIcon, Loader, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApi, fetchAssignedReports, fetchAvailableReports, fetchPatrolCase, acceptPatrolCase, startPatrolResponse, resolvePatrolCase, uploadToCloudinary } from "../../services/api";

type CaseStatus = "pending" | "accepted" | "in_progress" | "submitted" | "resolving" | "resolved";

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
  const { user, session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<CaseStatus>("pending");
  const [showResolution, setShowResolution] = useState(false);
  const [resNotes, setResNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [comment, setComment] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [responseLoading, setResponseLoading] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Fetch the specific case directly (most reliable for in-progress cases)
  const { data: specificCase, loading: caseLoading, refetch: refetchCase } = useApi(
    () => id ? fetchPatrolCase(id) : Promise.resolve({ data: null, error: null }),
    [id]
  );

  // Also fetch lists as fallback
  const { data: assignedReports, loading: assignedLoading, refetch: refetchAssigned } = useApi(fetchAssignedReports);
  const { data: availableReports, loading: availableLoading, refetch: refetchAvailable } = useApi(fetchAvailableReports);
  
  // Prioritize specific case data, fall back to lists if not found
  const report = specificCase ?? [...(assignedReports ?? []), ...(availableReports ?? [])].find((r) => r.id === id);
  const loading = caseLoading || assignedLoading || availableLoading;
  const pCfg = priorityConfig[report?.priority ?? "medium"] ?? priorityConfig.medium;

  // Sync local status with actual report status from database
  useEffect(() => {
    if (report && report.status) {
      const dbStatus = report.status;
      // Map database statuses to UI statuses
      if (dbStatus === "submitted") {
        // Patrol has submitted resolution, awaiting admin verification
        setStatus("submitted");
      } else if (dbStatus === "in_progress") {
        setStatus("in_progress");
      } else if (dbStatus === "resolved") {
        setStatus("resolved");
      } else if (dbStatus === "accepted") {
        // Patrol has accepted the case, waiting for "In Progress" button click
        setStatus("accepted");
      } else if (dbStatus === "approved") {
        // Case is approved, no patrol assigned yet
        setStatus("pending");
      } else if (dbStatus === "pending_verification") {
        setStatus("pending");
      } else {
        setStatus("pending");
      }
      console.log("[PatrolCaseDetail] Synced status from database:", dbStatus, "UI status:", status);
    }
  }, [report?.id, report?.status]);

  // Attach stream to video element when camera becomes active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      console.log("[PatrolCaseDetail] Attaching stream to video element");
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

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
      // Refetch all case data sources to sync updated status from database
      refetchCase();
      refetchAssigned();
      refetchAvailable();
      // Set to accepted so user can click "In Progress" button
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

  const submitResolution = async () => {
    if (!photoFile || !id) return;
    
    setResolutionLoading(true);
    setResolutionError(null);
    
    try {
      // Upload photo to Cloudinary
      console.log("[PatrolCaseDetail] Uploading photo to Cloudinary...");
      const uploadResult = await uploadToCloudinary(photoFile);
      
      if (uploadResult.error || !uploadResult.data?.url) {
        setResolutionError("Failed to upload photo: " + uploadResult.error);
        console.error("[PatrolCaseDetail] Upload failed:", uploadResult.error);
        setResolutionLoading(false);
        return;
      }
      
      const evidenceUrl = uploadResult.data.url;
      console.log("[PatrolCaseDetail] Photo uploaded to Cloudinary:", evidenceUrl);
      
      // Call API to resolve the case with evidence URL and notes
      const response = await resolvePatrolCase(id, resNotes, evidenceUrl, report?.category);
      
      if (response.error) {
        setResolutionError(response.error);
        console.error("[PatrolCaseDetail] Resolution failed:", response.error);
        setResolutionLoading(false);
        return;
      }
      
      console.log("[PatrolCaseDetail] ✅ Case resolved successfully");
      
      // Post resolution notes as patrol comment visible to residents
      if (resNotes.trim() && session?.access_token) {
        try {
          const commentResponse = await fetch("http://localhost:3000/patrol-comments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              report_id: id,
              comment_text: resNotes,
              author_role: "patrol",
            }),
          });
          
          if (!commentResponse.ok) {
            console.warn("[PatrolCaseDetail] Failed to post comment, but resolution was successful");
          } else {
            console.log("[PatrolCaseDetail] ✅ Patrol comment posted");
          }
        } catch (err) {
          console.warn("[PatrolCaseDetail] Comment error:", err);
        }
      }
      
      // Refetch case to sync updated status from database
      refetchCase();
      refetchAssigned();
      refetchAvailable();
      setShowResolution(false);
      setStatus("submitted");
      setPhotoFile(null);
      setPhotoPreview(null);
      setResNotes("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to resolve case";
      setResolutionError(errorMsg);
      console.error("[PatrolCaseDetail] Resolution error:", err);
    } finally {
      setResolutionLoading(false);
    }
  };

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
      console.log("[PatrolCaseDetail] Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      console.log("[PatrolCaseDetail] Stream stored, camera active set");
    } catch (err) {
      console.error("[PatrolCaseDetail] Camera error:", err);
      setResolutionError("Unable to access camera. Please check permissions.");
    }
  };

  const submitFieldNote = async () => {
    if (!comment.trim() || !id) return;

    setCommentLoading(true);
    setCommentError(null);

    try {
      if (!session?.access_token) {
        throw new Error("Authentication required. Please log in.");
      }

      const response = await fetch("http://localhost:3000/patrol-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          report_id: id,
          comment_text: comment,
          author_role: "patrol",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit note");
      }

      console.log("[PatrolCaseDetail] ✅ Field note submitted as patrol comment");
      setComment("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit note";
      setCommentError(errorMsg);
      console.error("[PatrolCaseDetail] Field note error:", err);
    } finally {
      setCommentLoading(false);
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

  const handleStartResponse = async () => {
    console.log("[PatrolCaseDetail] handleStartResponse called, id:", id);
    if (!id) {
      console.warn("[PatrolCaseDetail] No case ID available");
      return;
    }
    
    setResponseLoading(true);
    setResponseError(null);
    
    try {
      console.log("[PatrolCaseDetail] Calling startPatrolResponse for case:", id);
      const response = await startPatrolResponse(id);
      console.log("[PatrolCaseDetail] Response received:", response);
      
      if (response.error) {
        console.error("[PatrolCaseDetail] Start response failed with error:", response.error);
        setResponseError(response.error);
        return;
      }
      
      console.log("[PatrolCaseDetail] ✅ Case marked as in_progress, response data received");
      
      // Refetch case to sync updated status from database
      // Don't set status locally - let the database drive it
      setTimeout(() => {
        console.log("[PatrolCaseDetail] Refetching case data");
        refetchCase();
        refetchAssigned();
        refetchAvailable();
      }, 100);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start response";
      console.error("[PatrolCaseDetail] Start response exception:", err);
      setResponseError(errorMsg);
    } finally {
      setResponseLoading(false);
    }
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
          onClick={() => navigate("/app/patrol")}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{report.title}</div>
          <div className="text-slate-400 text-xs">{report.id}</div>
        </div>
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
            {(["pending", "accepted", "in_progress", "submitted", "resolved"] as const).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    status === s ? "text-white ring-2 ring-offset-2 ring-offset-slate-800" :
                    ["pending", "accepted", "in_progress", "submitted"].indexOf(s) < ["pending", "accepted", "in_progress", "submitted"].indexOf(status) || status === "resolved"
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-500"
                  }`}
                  style={status === s ? { backgroundColor: "#800000", ringColor: "#800000" } : {}}
                  >
                    {(["pending", "accepted", "in_progress", "submitted"].indexOf(s) < ["pending", "accepted", "in_progress", "submitted"].indexOf(status) || status === "resolved") && s !== status
                      ? "✓" : i + 1}
                  </div>
                  <span className={`text-center leading-tight ${status === s ? "text-white" : "text-slate-500"}`} style={{ fontSize: "9px", maxWidth: "60px" }}>
                    {s === "pending" ? "Queued" : s === "accepted" ? "Accepted" : s === "in_progress" ? "Responding" : s === "submitted" ? "Submitted" : "Resolved"}
                  </span>
                </div>
                {i < 4 && (
                  <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: ["pending", "accepted", "in_progress", "submitted"].indexOf(s) < ["pending", "accepted", "in_progress", "submitted"].indexOf(status) ? "#22c55e" : "#2d3748" }} />
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              <Camera className="w-4 h-4" /> Upload Photo
            </button>
            <button
              onClick={() => commentInputRef.current?.focus()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4" /> Add Note
            </button>
          </div>
          <div className="flex gap-2">
            <input
              ref={commentInputRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitFieldNote()}
              placeholder="Add field note..."
              className="flex-1 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-600 text-sm px-3 py-2 outline-none focus:border-slate-400"
            />
            <button
              onClick={submitFieldNote}
              disabled={!comment.trim() || commentLoading}
              className="px-3 py-2 rounded-xl text-white text-sm disabled:opacity-40 transition-colors"
              style={{ backgroundColor: "#800000" }}
            >
              {commentLoading ? "Sending..." : "Send"}
            </button>
          </div>
          {commentError && (
            <p className="text-red-400 text-xs mt-2">{commentError}</p>
          )}
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
          {responseError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-red-500/15 text-red-400 text-sm border border-red-500/30"
            >
              {responseError}
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
                onClick={() => {
                  console.log("[PatrolCaseDetail] 'In Progress' button clicked");
                  handleStartResponse();
                }}
                disabled={responseLoading}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-all disabled:opacity-70"
              >
                {responseLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" /> Starting...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> In Progress
                  </>
                )}
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
          {status === "submitted" && (
            <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}>
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-blue-200 text-sm font-medium">Awaiting Admin Review</div>
                <div className="text-blue-300/70 text-xs">Your resolution has been submitted. An admin will review the evidence and approve the case shortly.</div>
              </div>
            </div>
          )}
          {status !== "pending" && status !== "submitted" && (
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-40 min-h-screen" onClick={() => { setShowResolution(false); stopCamera(); }} />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-[480px] md:mx-auto md:top-1/2 md:-translate-y-1/2 z-50 rounded-t-3xl md:rounded-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
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

                {resolutionError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl bg-red-500/15 text-red-400 text-sm border border-red-500/30"
                  >
                    {resolutionError}
                  </motion.div>
                )}

                <div className="mb-4">
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    📷 Photo Evidence <span className="text-red-400">*required</span>
                  </label>
                  {!photoPreview ? (
                    <div className="space-y-2">
                      <button
                        onClick={startCamera}
                        disabled={resolutionLoading || uploadingPhoto || cameraActive}
                        className="w-full border-2 border-slate-600 rounded-xl p-4 flex items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                      >
                        <Camera className="w-5 h-5 text-blue-400" />
                        <div className="text-left">
                          <div className="text-slate-200 text-sm font-medium">Take Photo</div>
                          <div className="text-slate-500 text-xs">Use camera to capture evidence</div>
                        </div>
                      </button>

                      {cameraActive && (
                        <div className="rounded-xl overflow-hidden bg-black">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            muted
                            playsInline 
                            className="w-full aspect-video object-cover"
                          />
                          <div className="p-3 flex gap-3">
                            <button
                              onClick={capturePhoto}
                              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
                            >
                              <Camera className="w-4 h-4 inline mr-2" /> Capture
                            </button>
                            <button
                              onClick={stopCamera}
                              className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {!cameraActive && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={resolutionLoading || uploadingPhoto}
                          className="w-full border-2 border-slate-600 rounded-xl p-4 flex items-center justify-center gap-3 hover:border-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                        >
                          <ImageIcon className="w-5 h-5 text-green-400" />
                          <div className="text-left">
                            <div className="text-slate-200 text-sm font-medium">Upload Photo</div>
                            <div className="text-slate-500 text-xs">Choose from device files</div>
                          </div>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="w-full rounded-xl border-2 border-green-500/50 overflow-hidden bg-green-500/10">
                      <img src={photoPreview} alt="Evidence" className="w-full h-48 object-cover" />
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <div className="text-green-300 text-sm font-medium">Photo captured</div>
                          <div className="text-green-500/60 text-xs">Ready to submit</div>
                        </div>
                        <button 
                          onClick={removePhoto}
                          disabled={resolutionLoading || uploadingPhoto}
                          className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs hover:bg-slate-700 disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>
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
                    disabled={resolutionLoading || uploadingPhoto}
                    placeholder="Describe the outcome..."
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 text-white placeholder-slate-500 text-sm p-3 resize-none outline-none focus:border-slate-400 disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setShowResolution(false); stopCamera(); }} 
                    disabled={resolutionLoading || uploadingPhoto}
                    className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitResolution}
                    disabled={!photoFile || resolutionLoading || uploadingPhoto}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
                    style={{ backgroundColor: (photoFile && !resolutionLoading && !uploadingPhoto) ? "#16a34a" : "#374151" }}
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin inline mr-2" /> Uploading Photo...
                      </>
                    ) : resolutionLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin inline mr-2" /> Submitting...
                      </>
                    ) : (
                      "Submit Resolution"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}