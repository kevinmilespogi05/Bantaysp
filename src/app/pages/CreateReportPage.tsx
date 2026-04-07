import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft, MapPin, Upload, X, CheckCircle,
  FileText, Camera, Send, Info, File, AlertCircle,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../context/AuthContext";
import { createReport } from "../services/api";

// Fix default leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const categories = [
  "Suspicious Activity", "Infrastructure", "Environmental",
  "Public Disturbance", "Natural Disaster", "Crime", "Accident", "Other",
];

const priorities = [
  { value: "low", label: "Low", desc: "Non-urgent, minor concern", color: "#16a34a", bg: "#16a34a15" },
  { value: "medium", label: "Medium", desc: "Needs attention soon", color: "#d97706", bg: "#d9770615" },
  { value: "high", label: "High", desc: "Urgent — immediate response needed", color: "#dc2626", bg: "#dc262615" },
];

// Marker placer component
function LocationPicker({
  position,
  setPosition,
}: {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const m = e.target as L.Marker;
          const pos = m.getLatLng();
          setPosition([pos.lat, pos.lng]);
        },
      }}
    />
  ) : null;
}

interface FilePreview {
  name: string;
  type: "image" | "file";
  preview?: string;
  size: number;
}

export function CreateReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    location: "",
  });
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 5 - files.length);
    const newFiles: FilePreview[] = selected.map((file) => ({
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "file",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated;
    });
  };

  const onMarkerSet = useCallback((pos: [number, number]) => {
    setMarkerPos(pos);
    setForm((f) => ({
      ...f,
      location: f.location || `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await createReport({
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      location: form.location,
      reporter: user.name,
      avatar: user.avatar,
      image: null,
    });

    if (error || !data) {
      setSubmitError(error ?? "Failed to submit report. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => navigate("/app/reports"), 2200);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-gray-900 mb-2 font-semibold" style={{ fontSize: "1.4rem" }}>Report Submitted!</h2>
        <p className="text-gray-500 mb-2">Your report has been received and will be reviewed shortly.</p>
        <p className="text-gray-400 text-sm">+50 civic points earned · Redirecting...</p>
        <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-green-600 text-sm">Redirecting to Reports...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/app/reports")}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h2 className="font-semibold text-gray-900">File a New Report</h2>
          <p className="text-gray-400 text-sm">Document an incident in your community</p>
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid xl:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="xl:col-span-2 space-y-5">
            {/* Title */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block font-medium text-gray-700 mb-2 text-sm">
                Report Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief, descriptive title of the incident..."
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                onFocus={(e) => (e.target.style.borderColor = "#800000")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block font-medium text-gray-700 mb-2 text-sm">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened in detail. Include time of incident, number of people involved, any identifying information..."
                rows={5}
                required
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none resize-none bg-white"
                onFocus={(e) => (e.target.style.borderColor = "#800000")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <p className="text-gray-400 text-xs mt-1">{form.description.length}/500 characters</p>
            </div>

            {/* Category & Priority */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2 text-sm">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, category: c })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border min-h-[44px] ${
                        form.category === c
                          ? "border-transparent text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white"
                      }`}
                      style={form.category === c ? { backgroundColor: "#800000" } : {}}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-2 text-sm">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p.value })}
                      className={`p-3 rounded-xl text-left border-2 transition-all min-h-[44px] ${
                        form.priority === p.value ? "border-current" : "border-gray-100 hover:border-gray-200"
                      }`}
                      style={
                        form.priority === p.value
                          ? { borderColor: p.color, backgroundColor: p.bg }
                          : {}
                      }
                    >
                      <div className="font-semibold text-sm mb-0.5" style={{ color: p.color }}>{p.label}</div>
                      <div className="text-gray-400 hidden sm:block" style={{ fontSize: "11px" }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location + Map */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <label className="block font-medium text-gray-700 mb-2 text-sm">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative mb-3">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Specific address or landmark..."
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none bg-white"
                  onFocus={(e) => (e.target.style.borderColor = "#800000")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: "240px" }}>
                <MapContainer center={[15.0648, 120.1982]} zoom={14} className="w-full h-full" zoomControl>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                  />
                  <LocationPicker position={markerPos} setPosition={onMarkerSet} />
                </MapContainer>
              </div>
              <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {markerPos
                  ? `Pin set: ${markerPos[0].toFixed(5)}, ${markerPos[1].toFixed(5)} — drag to adjust`
                  : "Click on the map to drop a pin at the incident location"}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* File Upload */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block font-medium text-gray-700 text-sm">Photos / Evidence</label>
                  <p className="text-gray-400 text-xs">{files.length}/5 files attached</p>
                </div>
                <Camera className="w-4 h-4 text-gray-400" />
              </div>
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 group">
                      {f.type === "image" && f.preview ? (
                        <img src={f.preview} alt={f.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                          <File className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-2 hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-medium">Upload Photos or Files</span>
                  <span className="text-xs">Images, PDF, DOC up to 10MB</span>
                </button>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-blue-700 font-medium text-sm">Reporting Tips</span>
              </div>
              <ul className="space-y-1.5">
                {[
                  "Be specific with location details",
                  "Include time of incident",
                  "Attach photos as evidence",
                  "Stay safe — don't put yourself at risk",
                  "Only submit verified incidents",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-blue-600 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Points Info */}
            <div className="rounded-2xl p-4 text-white" style={{ backgroundColor: "#800000" }}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium text-sm">Civic Points</span>
              </div>
              <div className="text-white/80 text-xs leading-relaxed">
                Earn <strong className="text-white">+50 points</strong> for each verified report. Resolve an issue and earn bonus points!
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !form.title || !form.description || !form.category || !form.location}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:scale-100 min-h-[52px]"
              style={{ backgroundColor: "#800000" }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}