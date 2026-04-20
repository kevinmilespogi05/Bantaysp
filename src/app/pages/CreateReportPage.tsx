import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft, MapPin, Upload, X, CheckCircle,
  FileText, Camera, Send, Info, File, AlertCircle, Loader, Crosshair,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../context/AuthContext";
import { createReport } from "../services/api";
import { uploadToCloudinary } from "@/lib/cloudinary";

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

// Reverse geocode helper
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { "Accept": "application/json" } }
    );
    
    if (!response.ok) throw new Error("Geocoding failed");
    
    const data = await response.json();
    const address = data.address || {};
    
    // Build readable address
    const parts = [];
    if (address.road) parts.push(address.road);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.county) parts.push(address.county);
    if (address.province) parts.push(address.province);
    
    const readableAddress = parts.length > 0 
      ? parts.filter((p, i, self) => i === self.indexOf(p)).join(", ")
      : (data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    
    return readableAddress;
  } catch (error) {
    console.warn("[Geolocation] Reverse geocoding failed:", error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

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

// Auto-center map when location is fetched
function MapAutoCenter({
  position,
  isAutoFilled,
}: {
  position: [number, number] | null;
  isAutoFilled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    // Only auto-center if position was just auto-filled (not manually placed)
    if (position && isAutoFilled) {
      // Smoothly fly to the location with increased zoom
      setTimeout(() => {
        map.flyTo(position, 18, {
          duration: 1.2, // Animation duration in seconds
          easeLinearity: 0.25, // Smooth easing
        });
      }, 100); // Small delay to ensure map is ready
    }
  }, [position, isAutoFilled, map]);

  return null;
}

interface FilePreview {
  name: string;
  type: "image" | "file";
  preview?: string;
  size: number;
  file: File;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export function CreateReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isAndroid = /android/i.test(userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isMobileView = /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      setIsMobile(isAndroid || isIOS || isMobileView);
    };
    
    checkMobile();
  }, []);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    admin_notes: "",
  });
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Geolocation state
  const [geoLocation, setGeoLocation] = useState<LocationData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoAutofilled, setGeoAutofilled] = useState(false);

  // Fetch current location
  const fetchCurrentLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not supported by your browser");
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          
          setGeoLocation({ latitude, longitude, address });
          setForm((f) => ({ ...f, location: address }));
          setMarkerPos([latitude, longitude]);
          setGeoAutofilled(true);
          
          console.log("[Geolocation] Auto-filled location:", address);
        } catch (err) {
          console.error("[Geolocation] Error:", err);
          setGeoError("Failed to process location");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        let msg = "Failed to access location";
        if (err.code === 1) msg = "Location access denied — enter manually";
        else if (err.code === 2) msg = "Location unavailable";
        else if (err.code === 3) msg = "Location request timed out";
        
        setGeoError(msg);
        setGeoLoading(false);
        console.warn("[Geolocation] Error:", msg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Auto-fetch location on mount
  useEffect(() => {
    const wasStoredLocationDenied = localStorage.getItem("geolocation-denied-report");
    if (!wasStoredLocationDenied && !geoLocation) {
      setTimeout(() => {
        fetchCurrentLocation();
      }, 800); // Small delay to avoid UI flash
    }
  }, []);

  // Reset auto-fill flag after map animation completes
  useEffect(() => {
    if (geoAutofilled) {
      const timer = setTimeout(() => {
        setGeoAutofilled(false);
      }, 1500); // After map animation (1.2s) + small buffer
      return () => clearTimeout(timer);
    }
  }, [geoAutofilled]);

  // Mark if user denied permission
  useEffect(() => {
    if (geoError?.includes("denied")) {
      localStorage.setItem("geolocation-denied-report", "true");
    }
  }, [geoError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 5 - files.length);
    const newFiles: FilePreview[] = selected.map((file) => ({
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "file",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      size: file.size,
      file: file,
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
    setUploadProgress(null);

    let imageUrl: string | null = null;
    let imageUrls: string[] = [];

    // Step 1: Upload all images to Cloudinary if they exist
    if (files.length > 0) {
      setUploadingImage(true);
      const imageFiles = files.filter(f => f.type === "image");
      
      if (imageFiles.length > 0) {
        try {
          for (let i = 0; i < imageFiles.length; i++) {
            const filePreview = imageFiles[i];
            setUploadProgress(`Uploading image ${i + 1} of ${imageFiles.length}...`);
            const uploadResult = await uploadToCloudinary(filePreview.file);

            if (uploadResult.success) {
              imageUrls.push(uploadResult.url);
            } else {
              setUploadingImage(false);
              setSubmitting(false);
              setSubmitError(`Image upload failed: ${uploadResult.error}`);
              return;
            }
          }
          
          // Set primary image as first uploaded image
          if (imageUrls.length > 0) {
            imageUrl = imageUrls[0];
            setUploadProgress(`Successfully uploaded ${imageUrls.length} image${imageUrls.length !== 1 ? 's' : ''}`);
          }
        } catch (err) {
          setUploadingImage(false);
          setSubmitting(false);
          setSubmitError("Failed to upload images. Please try again.");
          return;
        }
      }

      setUploadingImage(false);
    }

    // Step 2: Create report
    const { data, error } = await createReport({
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      image_url: imageUrl,
      image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      location_lat: geoLocation?.latitude || markerPos?.[0],
      location_lng: geoLocation?.longitude || markerPos?.[1],
      admin_notes: form.admin_notes || undefined,
    });

    if (error || !data) {
      setSubmitError(error ?? "Failed to submit report. Please try again.");
      setSubmitting(false);
      setUploadProgress(null);
      return;
    }

    setSubmitting(false);
    setUploadProgress(null);
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
        <p className="text-gray-400 text-sm">Earn 50 points when verified by admin · Redirecting...</p>
        <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-green-600 text-sm">Redirecting to Reports...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6 pt-3 sm:pt-4 md:pt-0">
        <button
          onClick={() => navigate("/app/reports")}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">File Report</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Document an incident</p>
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="mb-3 sm:mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-red-700 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 pb-20 lg:pb-0">
          {/* Main Form */}
          <div className="xl:col-span-2 space-y-3 sm:space-y-4">
            {/* Title */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <label className="block font-medium text-gray-700 mb-2 text-xs sm:text-sm">
                Report Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief, descriptive title..."
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none bg-white"
                onFocus={(e) => (e.target.style.borderColor = "#800000")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <label className="block font-medium text-gray-700 mb-2 text-xs sm:text-sm">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened in detail..."
                rows={3}
                required
                maxLength={500}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none resize-none bg-white"
                onFocus={(e) => (e.target.style.borderColor = "#800000")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <p className="text-gray-400 text-xs mt-1">{form.description.length}/500</p>
            </div>

            {/* Private Notes to Admin */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <div className="flex items-start gap-2 mb-2">
                <div className="min-w-0">
                  <label className="block font-medium text-gray-700 text-xs sm:text-sm">
                    Private Notes for Admin
                  </label>
                  <p className="text-gray-400 text-xs">Only admins can see</p>
                </div>
              </div>
              <textarea
                value={form.admin_notes}
                onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
                placeholder="Optional context..."
                rows={2}
                maxLength={300}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none resize-none bg-white"
                onFocus={(e) => (e.target.style.borderColor = "#800000")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <p className="text-gray-400 text-xs mt-1">{form.admin_notes.length}/300</p>
            </div>

            {/* Category */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <label className="block font-medium text-gray-700 mb-2 text-xs sm:text-sm">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium transition-all border min-h-[44px] ${
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

            {/* Location + Map */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2 gap-2">
                <label className="block font-medium text-gray-700 text-xs sm:text-sm">
                  Location <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={fetchCurrentLocation}
                  disabled={geoLoading}
                  className="flex items-center gap-1 text-xs font-medium px-2 sm:px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 shrink-0"
                  title="Get current location"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{geoLoading ? 'Getting...' : 'Use Location'}</span>
                </button>
              </div>

              {/* Geolocation status message */}
              {geoError && !geoAutofilled && (
                <div className="mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {geoError}
                </div>
              )}

              {geoAutofilled && (
                <div className="mb-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-700 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  Location auto-filled
                </div>
              )}

              <div className="relative mb-2">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0" />
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Address or landmark..."
                  required
                  className="w-full pl-10 pr-4 py-2 sm:py-3 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none bg-white"
                  onFocus={(e) => (e.target.style.borderColor = "#800000")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>

              <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: "200px" }}>
                <MapContainer center={[15.0648, 120.1982]} zoom={14} className="w-full h-full" zoomControl>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                  />
                  <LocationPicker position={markerPos} setPosition={onMarkerSet} />
                  <MapAutoCenter position={markerPos} isAutoFilled={geoAutofilled} />
                </MapContainer>
              </div>

              <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {markerPos
                  ? `Pin: ${markerPos[0].toFixed(5)}, ${markerPos[1].toFixed(5)}`
                  : "Click map to set location"}
              </p>
            </div>
          </div>

          {/* Sidebar (File Upload, Tips, Points, Submit) */}
          <div className="space-y-3 sm:space-y-4">
            {/* File Upload */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <label className="block font-medium text-gray-700 text-xs sm:text-sm">Photos</label>
                  <p className="text-gray-400 text-xs">{files.length}/5 files</p>
                </div>
                <Camera className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 group">
                      {f.type === "image" && f.preview ? (
                        <img src={f.preview} alt={f.name} className="w-8 h-8 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                          <File className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <X className="w-3 h-3 text-red-500" />
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
              <input
                ref={cameraInputRef}
                type="file"
                capture
                onChange={handleFileChange}
                className="hidden"
              />
              {files.length < 5 && (
                <div className="space-y-2">
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full border-2 border-solid border-blue-300 bg-blue-50 rounded-xl py-2.5 sm:py-3 flex items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-100 transition-colors text-blue-600 font-medium text-xs sm:text-sm min-h-[44px]"
                      title="Capture photo using device camera"
                    >
                      <Camera className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span className="hidden xs:inline">Take Photo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 sm:py-4 flex flex-col items-center gap-1.5 hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-xs sm:text-sm font-medium">Upload</span>
                    <span className="text-xs">up to 10MB</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-blue-700 font-medium text-xs sm:text-sm">Tips</span>
              </div>
              <ul className="space-y-1">
                {[
                  "Be specific with location",
                  "Include time of incident",
                  "Attach photos as evidence",
                  "Stay safe",
                  "Verify incidents",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-blue-600 text-xs">
                    <CheckCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Points Info */}
            <div className="rounded-2xl p-3 sm:p-4 text-white" style={{ backgroundColor: "#800000" }}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="font-medium text-xs sm:text-sm">Civic Points</span>
              </div>
              <div className="text-white/80 text-xs leading-relaxed">
                <strong className="text-white">+50 points</strong> when verified. <strong className="text-white">+25 bonus</strong> if resolved!
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || uploadingImage || !form.title || !form.description || !form.category || !form.location}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3.5 rounded-2xl text-white font-semibold text-xs sm:text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:scale-100 min-h-[52px]"
              style={{ backgroundColor: "#800000" }}
            >
              {uploadingImage ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="hidden xs:inline">{uploadProgress || "Uploading..."}</span>
                </>
              ) : submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden xs:inline">Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden xs:inline">Submit Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}