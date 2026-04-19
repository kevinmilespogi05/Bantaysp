import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "motion/react";
import {
  Radio, Shield, Zap, MessageSquare, BarChart3, Users,
  AlertTriangle, CheckCircle, Clock, MapPin,
  Send, ChevronRight, Navigation, Layers, Activity,
  Volume2, RefreshCw, UserX, Eye, Star, ArrowRight,
  Target, Crosshair,
} from "lucide-react";
import {
  useApi,
  fetchPatrolUnits, fetchIncidentPins, fetchDispatchMessages, fetchReports,
  updatePatrolUnit, updatePatrolIncident, sendPatrolMessage,
  type PatrolUnit as PatrolUnitData, type IncidentPin as IncidentLocation, type PatrolDispatchMessage as PatrolMessage, type Report,
} from "../../services/api";
import { SkeletonCard, EmptyState } from "../../components/ui/DataStates";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  available: "#22c55e",
  en_route: "#f59e0b",
  busy: "#ef4444",
  offline: "#6b7280",
};
const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  en_route: "En Route",
  busy: "Busy",
  offline: "Offline",
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Map controller (programmatic pan/zoom) ───────────────────────────────────

function MapController({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    if (!center) return;
    const key = center.join(",");
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// ─── Custom Leaflet icon factories ────────────────────────────────────────────

function patrolIcon(unit: PatrolUnitData, selected: boolean) {
  const c = STATUS_COLOR[unit.status];
  const sz = selected ? 46 : 38;
  const pulse =
    unit.status !== "offline"
      ? `<div style="position:absolute;inset:0;border-radius:50%;background:${c};opacity:0.28;animation:leaflet-ping 2s ease-in-out infinite;"></div>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${sz}px;height:${sz}px;">
      ${pulse}
      <div style="position:absolute;inset:${selected ? 3 : 4}px;border-radius:50%;background:${c};border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:${sz > 40 ? 11 : 9}px;font-weight:700;letter-spacing:-0.5px;">${unit.avatar}</span>
      </div>
      <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:${c};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
    </div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 6)],
  });
}

function incidentIcon(inc: IncidentLocation, selected: boolean) {
  const c = "#ef4444";
  const sz = selected ? 34 : 28;
  const pulse = `<div style="position:absolute;inset:0;border-radius:50%;background:${c};opacity:0.3;animation:leaflet-ping 1.8s ease-in-out infinite;"></div>`;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${sz}px;height:${sz}px;">
      ${pulse}
      <div style="position:absolute;inset:3px;border-radius:50%;background:${c};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${sz > 28 ? 13 : 11}px;">
        ⚠
      </div>
    </div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 4)],
  });
}

function adminIcon() {
  const c = "#3b82f6"; // Blue for admin
  const sz = 40;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${sz}px;height:${sz}px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${c};opacity:0.25;animation:leaflet-ping 2.5s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:${c};border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:11px;">
        👨‍💼
      </div>
    </div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 6)],
  });
}

// ─── Panel tabs ───────────────────────────────────────────────────────────────

type PanelTab = "units" | "cases" | "history" | "messages" | "stats";

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminPatrolMonitoring() {
  // ── Fetch via API service layer (swap fetchers for real endpoints in prod) ──
  const { data: unitsData }     = useApi(fetchPatrolUnits);
  const { data: incidentsData } = useApi(fetchIncidentPins);
  const { data: messagesData }  = useApi(fetchDispatchMessages);
  const { data: reportsData }   = useApi(fetchReports);

  // Local state seeded from API — allows real-time mutations (reassign, send)
  const [units,     setUnits]     = useState<PatrolUnitData[]>([]);
  const [incidents, setIncidents] = useState<IncidentLocation[]>([]);
  const [messages,  setMessages]  = useState<PatrolMessage[]>([]);
  const [reports,   setReports]   = useState<Report[]>([]);

  useEffect(() => { if (unitsData)     setUnits(unitsData);         }, [unitsData]);
  useEffect(() => { if (incidentsData) setIncidents(incidentsData); }, [incidentsData]);
  useEffect(() => { if (messagesData)  setMessages(messagesData);   }, [messagesData]);
  useEffect(() => { if (reportsData)   setReports(reportsData);     }, [reportsData]);

  const [selectedPatrol, setSelectedPatrol] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [hoveredPatrol, setHoveredPatrol] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>("units");
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom] = useState(14);
  const [tileStyle, setTileStyle] = useState<"dark" | "light">("dark");
  const [assigningFor, setAssigningFor] = useState<string | null>(null);
  const [selectedPatrolForAssignment, setSelectedPatrolForAssignment] = useState<string | null>(null);
  const [showConfirmAssignment, setShowConfirmAssignment] = useState(false);
  const [msgTarget, setMsgTarget] = useState<"broadcast" | string>("broadcast");
  const [newMsg, setNewMsg] = useState("");
  const [tick, setTick] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [lastBroadcast, setLastBroadcast] = useState<string | null>(null);
  const [adminLocation, setAdminLocation] = useState<[number, number] | null>(null);
  const [adminLocationLoading, setAdminLocationLoading] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Get admin's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("[Patrol Monitoring] Geolocation not supported");
      return;
    }

    setAdminLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAdminLocation([latitude, longitude]);
        setAdminLocationLoading(false);
        console.log(`[Patrol Monitoring] Admin location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (error) => {
        console.warn("[Patrol Monitoring] Could not get admin location:", error);
        setAdminLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Simulate live patrol movement every 4 seconds
  useEffect(() => {
    const t = setInterval(() => {
      setUnits((prev) =>
        prev.map((u) => {
          if (u.status === "offline") return u;
          return {
            ...u,
            location: {
              lat: u.location.lat + (Math.random() - 0.5) * 0.0006,
              lng: u.location.lng + (Math.random() - 0.5) * 0.0006,
            },
            lastUpdated: new Date().toISOString(),
          };
        })
      );
      setTick((n) => n + 1);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus map on patrol
  const focusPatrol = useCallback(
    (id: string) => {
      const unit = units.find((u) => u.id === id);
      if (unit) setMapCenter([unit.location.lat, unit.location.lng]);
    },
    [units]
  );

  // Focus map on incident
  const focusIncident = useCallback((id: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (inc) setMapCenter([inc.location.lat, inc.location.lng]);
  }, [incidents]);

  const selectPatrol = (id: string) => {
    const next = id === selectedPatrol ? null : id;
    setSelectedPatrol(next);
    setSelectedIncident(null);
    if (next) { focusPatrol(next); setTab("units"); }
  };

  const selectIncident = (id: string) => {
    const next = id === selectedIncident ? null : id;
    setSelectedIncident(next);
    setSelectedPatrol(null);
    if (next) { focusIncident(next); setTab("cases"); setAssigningFor(next); }
    else setAssigningFor(null);
  };

  // Confirm and assign patrol to incident
  const confirmAssignPatrol = async () => {
    if (!assigningFor || !selectedPatrolForAssignment) {
      console.error("[confirmAssignPatrol] Missing incidentId or patrolId");
      return;
    }

    const inc = incidents.find((i) => i.id === assigningFor) || reports.find((r) => r.id === assigningFor);
    const unit = units.find((u) => u.id === selectedPatrolForAssignment);

    if (!inc || !unit) {
      console.error("[confirmAssignPatrol] Incident or unit not found");
      return;
    }

    // Optimistic update - update both incidents and reports
    setIncidents((prev) =>
      prev.map((i) => i.id === assigningFor ? { ...i, assignedPatrol: selectedPatrolForAssignment, status: "assigned" as const } : i)
    );
    setReports((prev) =>
      prev.map((r) => r.id === assigningFor ? { ...r, assignedPatrol: selectedPatrolForAssignment, status: "in_progress" as const } : r)
    );
    setUnits((prev) =>
      prev.map((u) => u.id === selectedPatrolForAssignment
        ? { ...u, status: "en_route" as const, currentCase: assigningFor, currentCaseTitle: inc?.title || null }
        : u)
    );

    // Persist to server
    await Promise.all([
      updatePatrolIncident(assigningFor, { assignedPatrol: selectedPatrolForAssignment, status: "assigned" } as any),
      updatePatrolUnit(selectedPatrolForAssignment, { status: "en_route", currentCase: assigningFor, currentCaseTitle: inc?.title || null } as any),
    ]);

    // Send dispatch message
    const { data: sent } = await sendPatrolMessage({
      from: "admin", to: selectedPatrolForAssignment,
      message: `Dispatch: Assigned to case – ${inc.title}. Proceed immediately.`,
    });
    if (sent) setMessages((prev) => [...prev, sent]);

    // Reset states
    setAssigningFor(null);
    setSelectedPatrolForAssignment(null);
    setShowConfirmAssignment(false);
    setSelectedIncident(null);
    setShowAssignModal(false);
  };

  // Assign patrol to incident — persists to Supabase via server
  const assignPatrol = async (incidentId: string, patrolId: string) => {
    const inc = incidents.find((i) => i.id === incidentId) || reports.find((r) => r.id === incidentId);
    const unit = units.find((u) => u.id === patrolId);

    if (!inc) {
      console.error("[assignPatrol] Incident not found:", incidentId);
      return;
    }

    // Show confirmation modal instead of directly assigning
    setAssigningFor(incidentId);
    setSelectedPatrolForAssignment(patrolId);
    setShowConfirmAssignment(true);
  };

  // Broadcast / direct message — persists to server
  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    const { data: sent } = await sendPatrolMessage({ from: "admin", to: msgTarget, message: newMsg.trim() });
    if (sent) {
      setMessages((prev) => [...prev, sent]);
      if (msgTarget === "broadcast") setLastBroadcast(newMsg.trim());
    }
    setNewMsg("");
  };

  // Mark patrol unavailable — persists to server
  const markUnavailable = async (id: string) => {
    setUnits((prev) => prev.map((u) => u.id === id ? { ...u, status: "offline" as const } : u));
    await updatePatrolUnit(id, { status: "offline", currentCase: null, currentCaseTitle: null } as any);
  };

  // Stats
  const stats = {
    active: units.filter((u) => u.status !== "offline").length,
    available: units.filter((u) => u.status === "available").length,
    busy: units.filter((u) => u.status === "busy").length,
    enRoute: units.filter((u) => u.status === "en_route").length,
    offline: units.filter((u) => u.status === "offline").length,
    unassigned: incidents.filter((i) => !i.assignedPatrol && i.status === "pending").length,
    totalCases: incidents.length,
  };

  // Nearest available patrols for an incident or report (only unassigned patrols)
  const nearbyAvailable = (incidentId: string) => {
    const inc = incidents.find((i) => i.id === incidentId);
    const rep = reports.find((r) => r.id === incidentId);
    
    // Get location from either incident or report
    let lat: number, lng: number;
    if (inc) {
      lat = inc.location.lat;
      lng = inc.location.lng;
    } else if (rep) {
      lat = rep.location_lat || 15.0648;
      lng = rep.location_lng || 120.1982;
    } else {
      return [];
    }
    
    return units
      .filter((u) => (u.status === "available" || u.status === "en_route") && !u.currentCase)
      .map((u) => ({
        ...u,
        distKm: haversineKm(u.location.lat, u.location.lng, lat, lng),
      }))
      .sort((a, b) => a.distKm - b.distKm);
  };

  // Tile URL
  const tileUrl =
    tileStyle === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttrib =
    tileStyle === "dark"
      ? '&copy; <a href="https://carto.com">CARTO</a>'
      : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>';

  // Filtered messages for current target
  const filteredMsgs = messages.filter(
    (m) =>
      msgTarget === "broadcast"
        ? m.to === "broadcast" || (m.from === "admin" && m.to === "broadcast")
        : (m.from === "admin" && m.to === msgTarget) ||
          (m.from === msgTarget && m.to === "admin")
  );

  const unreadCount = messages.filter((m) => m.from !== "admin" && !m.read).length;

  return (
    <div
      className="-m-4 md:-m-6 flex overflow-hidden"
      style={{ height: "calc(100vh - 57px)" }}
    >
      {/* ═══ LEFT: LIVE MAP ════════════════════════════════════════════════════ */}
      <div className="relative flex-1 min-w-0">
        <MapContainer
          center={[15.0648, 120.1982]}
          zoom={14}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer url={tileUrl} attribution={tileAttrib} />
          <MapController center={mapCenter} zoom={mapZoom + 2} />

          {/* Patrol unit markers */}
          {units.map((unit) => (
            <Marker
              key={unit.id}
              position={[unit.location.lat, unit.location.lng]}
              icon={patrolIcon(unit, selectedPatrol === unit.id)}
              eventHandlers={{
                click: () => selectPatrol(unit.id),
                mouseover: () => setHoveredPatrol(unit.id),
                mouseout: () => setHoveredPatrol(null),
              }}
            >
              <Popup
                className="bantay-popup"
                closeButton={false}
                offset={[0, -14]}
              >
                <div
                  className="rounded-xl p-3 min-w-[200px]"
                  style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: STATUS_COLOR[unit.status], fontSize: 11, fontWeight: 700 }}
                    >
                      {unit.avatar}
                    </div>
                    <div>
                      <div className="text-white font-semibold" style={{ fontSize: 13 }}>{unit.name}</div>
                      <div className="text-gray-400" style={{ fontSize: 11 }}>{unit.unit} · {unit.badgeNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[unit.status] }} />
                    <span style={{ color: STATUS_COLOR[unit.status], fontSize: 11, fontWeight: 600 }}>
                      {STATUS_LABEL[unit.status]}
                    </span>
                    <span className="text-gray-500 ml-auto" style={{ fontSize: 10 }}>{timeAgo(unit.lastUpdated)}</span>
                  </div>
                  {unit.currentCaseTitle && (
                    <div className="rounded-lg px-2 py-1.5 mb-2" style={{ background: "rgba(239,68,68,0.12)" }}>
                      <span className="text-red-400" style={{ fontSize: 10 }}>📋 {unit.currentCaseTitle}</span>
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => { setTab("messages"); setMsgTarget(unit.id); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-white transition-all"
                      style={{ background: "#1d4ed8", fontSize: 11 }}
                    >
                      <MessageSquare className="w-3 h-3" /> Message
                    </button>
                    <button
                      onClick={() => markUnavailable(unit.id)}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-gray-300 transition-all"
                      style={{ background: "rgba(255,255,255,0.07)", fontSize: 11 }}
                    >
                      <UserX className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Incident markers */}
          {incidents.map((inc) => (
            <Marker
              key={inc.id}
              position={[inc.location.lat, inc.location.lng]}
              icon={incidentIcon(inc, selectedIncident === inc.id)}
              eventHandlers={{ click: () => selectIncident(inc.id) }}
            >
              <Popup closeButton={false} offset={[0, -10]}>
                <div
                  className="rounded-xl p-3 min-w-[200px]"
                  style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-gray-500 ml-auto" style={{ fontSize: 10 }}>{formatTime(inc.timeReported)}</span>
                  </div>
                  <div className="text-white font-semibold mb-1" style={{ fontSize: 12 }}>{inc.title}</div>
                  <div className="text-gray-400" style={{ fontSize: 10 }}>{inc.address}</div>
                  {inc.assignedPatrol ? (
                    <div className="mt-2 rounded-lg px-2 py-1" style={{ background: "rgba(34,197,94,0.12)" }}>
                      <span className="text-green-400" style={{ fontSize: 10 }}>
                        ✓ Assigned to {units.find((u) => u.id === inc.assignedPatrol)?.name || inc.assignedPatrol}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setTab("cases"); setAssigningFor(inc.id); setSelectedIncident(inc.id); }}
                      className="mt-2 w-full py-1.5 rounded-lg text-white transition-all"
                      style={{ background: "#800000", fontSize: 11 }}
                    >
                      Assign Patrol →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Admin location marker */}
          {adminLocation && (
            <Marker
              position={adminLocation}
              icon={adminIcon()}
              eventHandlers={{ click: () => setMapCenter(adminLocation) }}
            >
              <Popup closeButton={false} offset={[0, -20]}>
                <div style={{ fontSize: "12px", color: "#333" }}>
                  <strong>Your Location</strong>
                  <br />
                  Admin Center
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ── Map overlay: top bar ── */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 pointer-events-none z-[450]">
          {/* Live indicator */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg pointer-events-auto"
            style={{ background: "rgba(15,17,23,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-white" style={{ fontSize: 12, fontWeight: 600 }}>LIVE</span>
            <span className="text-gray-400" style={{ fontSize: 11 }}>Castillejos, Zambales</span>
          </div>

          {/* Quick stats pills */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg pointer-events-auto"
            style={{ background: "rgba(15,17,23,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {[
              { count: stats.available, label: "Free", color: "#22c55e" },
              { count: stats.enRoute, label: "En Route", color: "#f59e0b" },
              { count: stats.busy, label: "Busy", color: "#ef4444" },
              { count: stats.offline, label: "Offline", color: "#6b7280" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1 px-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span style={{ color: s.color, fontSize: 11, fontWeight: 700 }}>{s.count}</span>
                <span className="text-gray-500" style={{ fontSize: 10 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Admin location indicator */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg pointer-events-auto"
            style={{ background: "rgba(15,17,23,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {adminLocationLoading ? (
              <>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-400" style={{ fontSize: 11, fontWeight: 600 }}>Getting location...</span>
              </>
            ) : adminLocation ? (
              <>
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300" style={{ fontSize: 11 }}>📍 {adminLocation[0].toFixed(4)}, {adminLocation[1].toFixed(4)}</span>
              </>
            ) : (
              <>
                <MapPin className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500" style={{ fontSize: 11 }}>Location unavailable</span>
              </>
            )}
          </div>

          {/* Map layer toggle */}
          <button
            onClick={() => setTileStyle((t) => (t === "dark" ? "light" : "dark"))}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg transition-all pointer-events-auto hover:opacity-90"
            style={{ background: "rgba(15,17,23,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Layers className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-300" style={{ fontSize: 11 }}>{tileStyle === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>

        {/* ── Map overlay: legend ── */}
        <div
          className="absolute bottom-4 left-3 pointer-events-none z-[450] rounded-xl px-3 py-2.5 space-y-1"
          style={{ background: "rgba(15,17,23,0.88)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="text-gray-400 mb-1" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>LEGEND</div>
          {[
            { color: "#22c55e", label: "Patrol – Available" },
            { color: "#f59e0b", label: "Patrol – En Route" },
            { color: "#ef4444", label: "Patrol – Busy" },
            { color: "#6b7280", label: "Patrol – Offline" },
            { color: "#dc2626", label: "Incident – Critical" },
            { color: "#f59e0b", label: "Incident – Medium" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="text-gray-300" style={{ fontSize: 10 }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* ── Map overlay: zoom controls ── */}
        <div className="absolute right-3 top-16 flex flex-col gap-1.5 z-[450]">
          <button
            onClick={() => setMapCenter([15.0648, 120.1982])}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all hover:opacity-90"
            style={{ background: "rgba(15,17,23,0.92)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Reset view"
          >
            <Crosshair className="w-4 h-4 text-gray-300" />
          </button>
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all hover:opacity-90"
            style={{ background: "rgba(15,17,23,0.92)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Refresh"
            onClick={() => setTick((n) => n + 1)}
          >
            <RefreshCw className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* ── Broadcast last message toast ── */}
        <AnimatePresence>
          {lastBroadcast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onAnimationComplete={() => setTimeout(() => setLastBroadcast(null), 3000)}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[450] rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-xl"
              style={{ background: "#1d4ed8", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Volume2 className="w-4 h-4 text-white" />
              <span className="text-white" style={{ fontSize: 12 }}>Broadcast sent to all units</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ RIGHT: COMMAND PANEL ══════════════════════════════════════════════ */}
      <div
        className="flex flex-col shrink-0 overflow-hidden"
        style={{
          width: 340,
          background: "#0a0d13",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Panel Header */}
        <div
          className="px-4 py-3 flex items-center gap-3 shrink-0"
          style={{ background: "#0f1117", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(128,0,0,0.3)", border: "1px solid rgba(128,0,0,0.5)" }}
          >
            <Shield className="w-4 h-4" style={{ color: "#ef4444" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold" style={{ fontSize: 13 }}>Command Center</div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-gray-500" style={{ fontSize: 10 }}>
                Live · {units.filter((u) => u.status !== "offline").length}/{units.length} units active
              </span>
            </div>
          </div>
          {unreadCount > 0 && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ background: "#800000", fontSize: 10, fontWeight: 700 }}
            >
              {unreadCount}
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        <div
          className="grid grid-cols-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { label: "Active", value: stats.active, color: "#22c55e", sub: "units" },
            { label: "Available", value: stats.available, color: "#22c55e", sub: "free" },
            { label: "Busy", value: stats.busy + stats.enRoute, color: "#ef4444", sub: "engaged" },
            { label: "Incidents", value: stats.totalCases, color: "#f59e0b", sub: "total" },
          ].map((s) => (
            <div
              key={s.label}
              className="py-3 text-center"
              style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="font-bold" style={{ color: s.color, fontSize: 20, lineHeight: 1 }}>{s.value}</div>
              <div className="text-gray-400 mt-0.5" style={{ fontSize: 9 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Unassigned alert */}
        {stats.unassigned > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-3 mt-3 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
            <span className="text-red-300" style={{ fontSize: 11 }}>
              <strong>{stats.unassigned}</strong> unassigned incident{stats.unassigned > 1 ? "s" : ""} need attention
            </span>
            <button
              onClick={() => setTab("cases")}
              className="ml-auto text-red-400 hover:text-red-300 transition-colors shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div
          className="flex shrink-0 mt-3 mx-3 rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(
            [
              { key: "units", icon: Users, label: "Units" },
              { key: "cases", icon: AlertTriangle, label: "Cases" },
              { key: "history", icon: Activity, label: "History" },
              { key: "messages", icon: MessageSquare, label: "Msgs", badge: unreadCount },
              { key: "stats", icon: BarChart3, label: "Stats" },
            ] as { key: PanelTab; icon: React.ElementType; label: string; badge?: number }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 relative transition-all"
              style={{
                background: tab === t.key ? "rgba(255,255,255,0.1)" : "transparent",
                color: tab === t.key ? "#fff" : "#6b7280",
              }}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span style={{ fontSize: 9, fontWeight: 600 }}>{t.label}</span>
              {t.badge && t.badge > 0 ? (
                <div
                  className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#800000", fontSize: 8 }}
                >
                  {t.badge}
                </div>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────────── */}

        {/* Non-messages tabs: scrollable */}
        {tab !== "messages" && (
        <div className="flex-1 overflow-y-auto mt-3 px-3 pb-3 space-y-2">

          {/* UNITS TAB */}
          {tab === "units" && (
            <div className="space-y-2">
              {units
                .sort((a, b) => {
                  const order = { busy: 0, en_route: 1, available: 2, offline: 3 };
                  return order[a.status] - order[b.status];
                })
                .map((unit) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => selectPatrol(unit.id)}
                    onMouseEnter={() => setHoveredPatrol(unit.id)}
                    onMouseLeave={() => setHoveredPatrol(null)}
                    className="rounded-xl p-3 cursor-pointer transition-all"
                    style={{
                      background:
                        selectedPatrol === unit.id
                          ? `${STATUS_COLOR[unit.status]}18`
                          : hoveredPatrol === unit.id
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedPatrol === unit.id ? STATUS_COLOR[unit.status] + "50" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Avatar + pulse */}
                      <div className="relative shrink-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                          style={{ background: STATUS_COLOR[unit.status], fontSize: 11, fontWeight: 700 }}
                        >
                          {unit.avatar}
                        </div>
                        {unit.status !== "offline" && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900"
                            style={{ background: STATUS_COLOR[unit.status] }}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-semibold truncate" style={{ fontSize: 12 }}>{unit.name}</span>
                          <span
                            className="shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{
                              background: `${STATUS_COLOR[unit.status]}20`,
                              color: STATUS_COLOR[unit.status],
                              fontSize: 9,
                              fontWeight: 700,
                            }}
                          >
                            {STATUS_LABEL[unit.status]}
                          </span>
                        </div>
                        <div className="text-gray-500 truncate" style={{ fontSize: 10 }}>{unit.unit} · {unit.badgeNumber}</div>
                        {unit.currentCaseTitle && (
                          <div className="text-orange-400 truncate mt-0.5" style={{ fontSize: 10 }}>
                            📋 {unit.currentCaseTitle}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <div className="text-gray-600 shrink-0" style={{ fontSize: 9 }}>
                        {timeAgo(unit.lastUpdated)}
                      </div>
                    </div>

                    {/* Expanded actions */}
                    <AnimatePresence>
                      {selectedPatrol === unit.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setTab("messages"); setMsgTarget(unit.id); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all hover:opacity-90"
                              style={{ background: "#1d4ed8", color: "white", fontSize: 10 }}
                            >
                              <MessageSquare className="w-3 h-3" /> Message
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); focusPatrol(unit.id); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all hover:opacity-90"
                              style={{ background: "rgba(255,255,255,0.08)", color: "#d1d5db", fontSize: 10 }}
                            >
                              <Target className="w-3 h-3" /> Focus
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); markUnavailable(unit.id); }}
                              className="flex items-center justify-center px-2 py-1.5 rounded-lg transition-all hover:opacity-90"
                              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: 10 }}
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                            {[
                              { label: "Cases Today", value: unit.casesToday },
                              { label: "Avg Response", value: unit.avgResponse },
                              { label: "Shift", value: `${unit.shiftStart}–${unit.shiftEnd}` },
                            ].map((s) => (
                              <div key={s.label} className="rounded-lg p-1.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <div className="text-white font-semibold" style={{ fontSize: 11 }}>{s.value}</div>
                                <div className="text-gray-600" style={{ fontSize: 9 }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
            </div>
          )}

          {/* CASES TAB */}
          {tab === "cases" && (
            <div className="space-y-3">
              {/* ASSIGNMENT SECTION - Shows at TOP when a case is selected */}
              {assigningFor && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-3"
                  style={{ background: "rgba(128,0,0,0.2)", border: "2px solid rgba(128,0,0,0.5)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-white font-semibold text-sm">Assign Patrol to Case</span>
                  </div>

                  {/* Nearby available patrols */}
                  <div className="space-y-1.5">
                    {nearbyAvailable(assigningFor).length > 0 ? (
                      nearbyAvailable(assigningFor).map((unit) => (
                        <button
                          key={unit.id}
                          onClick={() => assignPatrol(assigningFor, unit.id)}
                          className="w-full flex items-center gap-2 p-2.5 rounded-lg transition-all hover:bg-red-600/20 active:scale-95"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: STATUS_COLOR[unit.status] }}>
                            {unit.avatar}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-white text-xs font-semibold">{unit.name}</div>
                            <div className="text-gray-400 text-xs">{unit.distKm.toFixed(1)} km · {unit.unit}</div>
                          </div>
                          <div className="text-orange-400 text-xs font-semibold">ASSIGN</div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-gray-400 text-xs">No available patrols nearby</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setAssigningFor(null)}
                    className="w-full mt-2.5 py-1.5 rounded-lg text-gray-400 text-xs transition-all hover:text-gray-300 font-medium"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    Cancel Assignment
                  </button>
                </motion.div>
              )}

              {/* Display reports with status (excluding resolved) */}
              {reports.filter(r => r.status !== "resolved").length > 0 ? (
                reports
                  .filter(r => r.status !== "resolved")
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((report) => {
                    const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
                      "pending_verification": { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", dot: "#fbbf24" },
                      "approved": { bg: "rgba(34,197,94,0.15)", text: "#86efac", dot: "#22c55e" },
                      "rejected": { bg: "rgba(239,68,68,0.15)", text: "#fca5a5", dot: "#ef4444" },
                      "in_progress": { bg: "rgba(59,130,246,0.15)", text: "#93c5fd", dot: "#3b82f6" },
                      "resolved": { bg: "rgba(168,85,247,0.15)", text: "#d8b4fe", dot: "#a855f7" },
                    };
                    
                    const statusConfig = statusColors[report.status] || { bg: "rgba(107,114,128,0.15)", text: "#d1d5db", dot: "#6b7280" };
                    
                    return (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedIncident(report.id)}
                        className="rounded-xl overflow-hidden cursor-pointer transition-all"
                        style={{
                          background: selectedIncident === report.id ? "rgba(128,0,0,0.25)" : "rgba(255,255,255,0.04)",
                          border: selectedIncident === report.id ? "1px solid rgba(128,0,0,0.5)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="p-3">
                          <div className="flex items-start gap-2">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{ background: statusConfig.dot }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span
                                  className="px-2 py-1 rounded text-xs font-bold uppercase"
                                  style={{ background: statusConfig.bg, color: statusConfig.text }}
                                >
                                  {report.status.replace(/_/g, " ")}
                                </span>
                                {report.verified && (
                                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#86efac" }}>
                                    ✓ VERIFIED
                                  </span>
                                )}
                              </div>
                              <div className="text-white font-semibold" style={{ fontSize: "13px" }}>
                                {report.title}
                              </div>
                              <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">
                                {report.category}
                              </div>
                              <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{report.location}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                                    style={{ background: "#6b7280", fontSize: "8px", fontWeight: 700 }}
                                  >
                                    {report.avatar}
                                  </div>
                                  <span className="text-gray-400">{report.reporter}</span>
                                </div>
                                <span className="text-gray-600 ml-auto">
                                  {timeAgo(report.timestamp)}
                                </span>
                              </div>

                              {/* Assign button when selected */}
                              {selectedIncident === report.id && !report.assignedPatrol && report.status === "approved" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAssigningFor(report.id); }}
                                  className="w-full mt-2 py-1.5 rounded-lg text-white transition-all hover:bg-red-600/40 text-xs font-semibold flex items-center justify-center gap-1"
                                  style={{ background: "rgba(128,0,0,0.3)", border: "1px solid rgba(128,0,0,0.5)" }}
                                >
                                  <Zap className="w-3 h-3" /> Assign Patrol
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No active cases. Check History for resolved reports.</p>
                </div>
              )}

              {/* REMOVED: Assignment section was moved to top of Cases tab */}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            <div className="space-y-2">
              {/* Display resolved reports */}
              {reports.filter((r) => r.status === "resolved").length > 0 ? (
                reports
                  .filter((r) => r.status === "resolved")
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((report) => {
                    return (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="p-3">
                          <div className="flex items-start gap-2">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{ background: "#a855f7" }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span
                                  className="px-2 py-1 rounded text-xs font-bold uppercase"
                                  style={{ background: "rgba(168,85,247,0.15)", color: "#d8b4fe" }}
                                >
                                  ✓ Resolved
                                </span>
                                {report.verified && (
                                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#86efac" }}>
                                    ✓ VERIFIED
                                  </span>
                                )}
                              </div>
                              <div className="text-white font-semibold" style={{ fontSize: "13px" }}>
                                {report.title}
                              </div>
                              <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">
                                {report.category}
                              </div>
                              <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{report.location}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div>
                                  <span className="text-gray-500">Reported:</span>
                                  <div className="text-gray-300">{timeAgo(report.timestamp)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Resolved:</span>
                                  <div className="text-gray-300">{report.resolved_at ? timeAgo(report.resolved_at) : "—"}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                                    style={{ background: "#6b7280", fontSize: "8px", fontWeight: 700 }}
                                  >
                                    {report.avatar}
                                  </div>
                                  <span className="text-gray-400">{report.reporter}</span>
                                </div>
                                {report.resolved_by && (
                                  <span className="ml-auto text-green-400">Closed by Admin</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No resolved reports yet</p>
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {tab === "stats" && (
            <div className="space-y-3">
              {/* Performance cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Active Patrols", value: `${stats.active}/${units.length}`, icon: Radio, color: "#22c55e" },
                  { label: "Availability", value: `${Math.round((stats.available / units.filter(u=>u.status!=="offline").length || 0) * 100)}%`, icon: Activity, color: "#3b82f6" },
                  { label: "Avg Response", value: "8.5 min", icon: Clock, color: "#f59e0b" },
                  { label: "Cases Today", value: units.reduce((s, u) => s + u.casesToday, 0).toString(), icon: CheckCircle, color: "#800000" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <c.icon className="w-3.5 h-3.5 shrink-0" style={{ color: c.color }} />
                      <span className="text-gray-400" style={{ fontSize: 9 }}>{c.label}</span>
                    </div>
                    <div className="text-white font-bold" style={{ fontSize: 18, color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>

              {/* Patrol breakdown */}
              <div
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-gray-400 mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>STATUS DISTRIBUTION</div>
                {Object.entries({ available: stats.available, en_route: stats.enRoute, busy: stats.busy, offline: stats.offline }).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                    <span className="text-gray-400 capitalize" style={{ fontSize: 10 }}>{STATUS_LABEL[status]}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(count / units.length) * 100}%`,
                          background: STATUS_COLOR[status],
                        }}
                      />
                    </div>
                    <span className="text-white font-bold" style={{ fontSize: 10 }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* Per-unit stats */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-gray-400" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>UNIT PERFORMANCE</span>
                </div>
                {units.filter(u => u.status !== "offline").map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2.5 px-3 py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: STATUS_COLOR[u.status], fontSize: 8, fontWeight: 700 }}
                    >
                      {u.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white" style={{ fontSize: 10, fontWeight: 600 }}>{u.name}</div>
                      <div className="text-gray-500" style={{ fontSize: 9 }}>{u.avgResponse} avg response</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white font-bold" style={{ fontSize: 12 }}>{u.casesToday}</div>
                      <div className="text-gray-600" style={{ fontSize: 9 }}>cases</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-gray-400 mb-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>QUICK ACTIONS</div>
                {[
                  { label: "Assign Nearest Patrol", icon: Navigation, color: "#800000", action: () => { setTab("cases"); } },
                  { label: "Broadcast Alert", icon: Volume2, color: "#1d4ed8", action: () => { setTab("messages"); setMsgTarget("broadcast"); } },
                  { label: "View All Incidents", icon: Eye, color: "#f59e0b", action: () => setTab("cases") },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:opacity-90"
                    style={{ background: `${a.color}20`, border: `1px solid ${a.color}30` }}
                  >
                    <a.icon className="w-3.5 h-3.5 shrink-0" style={{ color: a.color }} />
                    <span style={{ color: a.color, fontSize: 11, fontWeight: 600 }}>{a.label}</span>
                    <ArrowRight className="w-3 h-3 ml-auto" style={{ color: a.color }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* MESSAGES TAB — flex column with pinned input at bottom */}
        {tab === "messages" && (
          <div className="flex-1 flex flex-col overflow-hidden mt-3 px-3 min-h-0">
            {/* Channel selector */}
            <div className="flex gap-1 mb-2 flex-wrap shrink-0">
              {[{ id: "broadcast", label: "📡 Broadcast" }, ...units.map((u) => ({ id: u.id, label: u.avatar + " " + u.name.split(" ")[0] }))].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setMsgTarget(ch.id)}
                  className="px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: msgTarget === ch.id ? "#1d4ed8" : "rgba(255,255,255,0.06)",
                    color: msgTarget === ch.id ? "white" : "#9ca3af",
                    fontSize: 10,
                    fontWeight: msgTarget === ch.id ? 600 : 400,
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            {/* Messages list — scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5" style={{ minHeight: 0 }}>
              {filteredMsgs.length === 0 ? (
                <div className="text-center py-8 text-gray-600" style={{ fontSize: 11 }}>No messages in this channel</div>
              ) : (
                filteredMsgs.map((m) => {
                  const isAdmin = m.from === "admin";
                  const sender = isAdmin ? "You" : units.find((u) => u.id === m.from)?.name || m.from;
                  return (
                    <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[85%] rounded-xl px-3 py-2"
                        style={{
                          background: isAdmin ? "#1d4ed8" : "rgba(255,255,255,0.08)",
                          border: isAdmin ? "none" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {!isAdmin && (
                          <div className="text-gray-400 mb-0.5" style={{ fontSize: 9, fontWeight: 600 }}>{sender}</div>
                        )}
                        <div className="text-white" style={{ fontSize: 11 }}>{m.message}</div>
                        <div className="text-blue-300 mt-0.5" style={{ fontSize: 9, opacity: 0.7 }}>{m.time}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input — always pinned at bottom */}
            <div
              className="flex gap-1.5 rounded-xl p-2 shrink-0 mt-2 mb-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={msgTarget === "broadcast" ? "Broadcast to all units..." : "Direct message..."}
                className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none"
                style={{ fontSize: 11 }}
              />
              <button
                onClick={sendMessage}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-90"
                style={{ background: newMsg.trim() ? "#800000" : "rgba(255,255,255,0.06)" }}
              >
                <Send className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── Bottom Quick Actions ── */}
        <div
          className="px-3 py-3 grid grid-cols-1 gap-2 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0f1117" }}
        >
          <button
            onClick={() => { setTab("messages"); setMsgTarget("broadcast"); }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: "rgba(29,78,216,0.25)", border: "1px solid rgba(29,78,216,0.4)", color: "#93c5fd" }}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Broadcast</span>
          </button>
        </div>

        {/* ── CONFIRMATION MODAL ── */}
        <AnimatePresence>
          {showConfirmAssignment && assigningFor && selectedPatrolForAssignment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[500]"
              onClick={() => setShowConfirmAssignment(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-700"
              >
                <div className="mb-4">
                  <h3 className="text-white text-lg font-bold mb-1">Confirm Patrol Assignment</h3>
                  <p className="text-gray-400 text-sm">Are you sure you want to assign this patrol to this case?</p>
                </div>

                {/* Case Details */}
                <div className="bg-slate-800/50 rounded-lg p-3 mb-4 space-y-2">
                  <div>
                    <p className="text-gray-400 text-xs">CASE</p>
                    <p className="text-white font-semibold text-sm">{reports.find((r) => r.id === assigningFor)?.title || "Loading..."}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">LOCATION</p>
                    <p className="text-gray-300 text-sm">{reports.find((r) => r.id === assigningFor)?.location || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">CATEGORY</p>
                    <p className="text-gray-300 text-sm">{reports.find((r) => r.id === assigningFor)?.category || "Unknown"}</p>
                  </div>
                </div>

                {/* Patrol Details */}
                <div className="bg-slate-800/50 rounded-lg p-3 mb-6 space-y-2">
                  <div>
                    <p className="text-gray-400 text-xs">ASSIGNED PATROL</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: STATUS_COLOR[units.find((u) => u.id === selectedPatrolForAssignment)?.status || "available"] }}
                      >
                        {units.find((u) => u.id === selectedPatrolForAssignment)?.avatar}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{units.find((u) => u.id === selectedPatrolForAssignment)?.name || "Unknown"}</p>
                        <p className="text-gray-400 text-xs">{units.find((u) => u.id === selectedPatrolForAssignment)?.unit} • {units.find((u) => u.id === selectedPatrolForAssignment)?.badgeNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">DISTANCE</p>
                    <p className="text-gray-300 text-sm">
                      {nearbyAvailable(assigningFor)
                        .find((u) => u.id === selectedPatrolForAssignment)
                        ?.distKm.toFixed(1) || "--"} km
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmAssignment(false)}
                    className="flex-1 py-2 rounded-lg text-gray-300 transition-all hover:bg-slate-700"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAssignPatrol}
                    className="flex-1 py-2 rounded-lg text-white font-semibold transition-all hover:bg-red-700 flex items-center justify-center gap-2"
                    style={{ background: "#800000" }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Assignment
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}