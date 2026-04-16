import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Navigation, MapPin, Crosshair, AlertTriangle,
  Zap, ChevronUp, ChevronDown, Clock, ArrowLeft,
  RotateCcw, Layers, Info, CheckCircle,
} from "lucide-react";
import { useApi, fetchActiveCase } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// ─── Interface for Direction Steps ─────────────────────────────────────────────
interface DirectionStep {
  step: number;
  instruction: string;
  distance: string;
  icon: string;
}

// ─── Fallback directions (used while calculating real route) ─────────────────────
const fallbackDirections: DirectionStep[] = [
  { step: 1, instruction: "Getting route...", distance: "-", icon: "▷" },
];

// ─── Map controller (programmatic flyTo) ─────────────────────────────────────
function MapFly({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const init = useRef(false);
  useEffect(() => {
    if (!init.current) { init.current = true; return; }
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// ─── Custom Leaflet icons ─────────────────────────────────────────────────────
function patrolSelfIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:44px;height:44px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.25;animation:leaflet-ping 1.5s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:5px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 3px 12px rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
  });
}

function incidentIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:36px;height:36px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#ef4444;opacity:0.3;animation:leaflet-ping 1.8s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:#ef4444;border:2.5px solid white;box-shadow:0 3px 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;font-size:14px;">⚠</div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PatrolMapView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [navStarted, setNavStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [tileStyle, setTileStyle] = useState<"dark" | "satellite">("dark");
  const [pulse, setPulse] = useState(0);
  const [patrolPos, setPatrolPos] = useState<[number, number]>([15.0512, 120.2018]);
  const [followPatrol, setFollowPatrol] = useState(false);
  const [directions, setDirections] = useState<DirectionStep[]>(fallbackDirections);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([[15.0512, 120.2018], [15.0580, 120.1960]]);
  const [routeLoading, setRouteLoading] = useState(true);
  const [locationUpdates, setLocationUpdates] = useState(0);

  const { data: activeCase, loading: caseLoading } = useApi(() => fetchActiveCase(user.id));

  // Safe fallback coordinates while data loads
  const incidentLat = activeCase?.coordinates?.lat ?? 15.0580;
  const incidentLng = activeCase?.coordinates?.lng ?? 120.1960;
  const incidentPos: [number, number] = [incidentLat, incidentLng];

  // ─── Get user's current geolocation on mount ────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPatrolPos([latitude, longitude]);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        // Fallback to default if permission denied
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ─── Fetch route from OSRM when both location and incident change ───────────
  useEffect(() => {
    const fetchRoute = async () => {
      if (!incidentLat || !incidentLng || !patrolPos) return;

      try {
        setRouteLoading(true);
        // OSRM API: driving route with full geometry and turn-by-turn steps
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${patrolPos[1]},${patrolPos[0]};${incidentLng},${incidentLat}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`
        );

        if (!response.ok) throw new Error("Route calculation failed");
        
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // Extract waypoints from route geometry
          const geometry = route.geometry as any;
          const waypoints = geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
          setRouteCoords(waypoints);

          // Convert OSRM steps to user-friendly directions
          const newDirections: DirectionStep[] = route.legs.flatMap((leg: any, legIndex: number) =>
            leg.steps.map((step: any, stepIndex: number) => {
              const distance = step.distance;
              let icon = "▷";
              
              if (step.maneuver.type === "turn") {
                if (step.maneuver.modifier === "left") icon = "↙";
                else if (step.maneuver.modifier === "right") icon = "↘";
                else icon = "↑";
              } else if (step.maneuver.type === "continue") {
                icon = "↑";
              } else if (step.maneuver.type === "arrive") {
                icon = "📍";
              }

              // Format distance (convert from meters)
              let distStr = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
              
              return {
                step: legIndex * 10 + stepIndex + 1,
                instruction: step.name ? `${step.maneuver.instruction} on ${step.name}` : step.maneuver.instruction,
                distance: distStr,
                icon,
              };
            })
          );

          // Add final destination
          newDirections.push({
            step: newDirections.length + 1,
            instruction: `Destination on your left — ${activeCase?.title || "Incident"}`,
            distance: "Arrived",
            icon: "📍",
          });

          setDirections(newDirections);
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        // Keep fallback directions
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, [patrolPos, incidentLat, incidentLng, activeCase?.title, locationUpdates]);

  // Pulse counter for live indicator
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => p + 1), 1500);
    return () => clearInterval(t);
  }, []);

  // Auto-advance navigation steps
  useEffect(() => {
    if (navStarted && currentStep < directions.length - 1) {
      const t = setInterval(() => {
        setCurrentStep((s) => {
          const next = Math.min(s + 1, directions.length - 1);
          // Animate patrol along route (using proportional index from routeCoords)
          if (routeCoords.length > 0) {
            const routeIndex = Math.floor((next / directions.length) * routeCoords.length);
            setPatrolPos(routeCoords[Math.min(routeIndex, routeCoords.length - 1)]);
          }
          return next;
        });
      }, 4000);
      return () => clearInterval(t);
    }
  }, [navStarted, currentStep, directions.length, routeCoords]);

  // Subtle patrol drift when not navigating
  useEffect(() => {
    if (navStarted) return;
    const t = setInterval(() => {
      setPatrolPos((prev) => [
        prev[0] + (Math.random() - 0.5) * 0.0003,
        prev[1] + (Math.random() - 0.5) * 0.0003,
      ]);
    }, 3000);
    return () => clearInterval(t);
  }, [navStarted]);

  const tileUrl =
    tileStyle === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const tileAttrib = '&copy; <a href="https://carto.com">CARTO</a>';

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
      {/* ── LEAFLET MAP ─────────────────────────────────────── */}
      <MapContainer
        center={[15.055, 120.199]}
        zoom={15}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution={tileAttrib} />
        {followPatrol && <MapFly center={patrolPos} zoom={16} />}

        {/* Route line */}
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: "#3b82f6",
            weight: 5,
            dashArray: "10 6",
            lineCap: "round",
            lineJoin: "round",
            opacity: 0.85,
          }}
        />
        {/* Route glow */}
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: "#60a5fa",
            weight: 14,
            opacity: 0.12,
            lineCap: "round",
          }}
        />

        {/* Incident radius zone */}
        <Circle
          center={incidentPos}
          radius={120}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.07,
            weight: 1.5,
            dashArray: "4 4",
          }}
        />

        {/* Incident marker */}
        <Marker position={incidentPos} icon={incidentIcon()}>
          <Popup closeButton={false}>
            <div
              className="rounded-xl p-3 min-w-[180px]"
              style={{ background: "#0f1117", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <div className="text-red-400 font-bold mb-1" style={{ fontSize: 11 }}>🚨 {activeCase?.priority?.toUpperCase() ?? "Loading..."} INCIDENT</div>
              <div className="text-white font-semibold" style={{ fontSize: 12 }}>{activeCase?.title ?? "Loading..."}</div>
              <div className="text-gray-400 mt-1" style={{ fontSize: 10 }}>{activeCase?.location ?? ""}</div>
              <div className="text-blue-300 mt-1" style={{ fontSize: 10 }}>ETA: ~{activeCase?.eta ?? "Loading..."}</div>
            </div>
          </Popup>
        </Marker>

        {/* Patrol self marker */}
        <Marker key={pulse} position={patrolPos} icon={patrolSelfIcon()}>
          <Popup closeButton={false}>
            <div
              className="rounded-xl p-2.5 min-w-[140px]"
              style={{ background: "#0f1117", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              <div className="text-blue-400 font-bold mb-0.5" style={{ fontSize: 11 }}>📍 Your Position</div>
              <div className="text-white" style={{ fontSize: 11 }}>Unit 1-Alpha · PNP-8821</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-green-400" style={{ fontSize: 10 }}>Live tracking</span>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* ── OVERLAY CONTROLS ─────────────────────────────────── */}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center gap-2 z-[450]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-slate-700"
          style={{ backgroundColor: "#0d1117" }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div
          className="flex-1 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2 border border-slate-700"
          style={{ backgroundColor: "#0d1117" }}
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{activeCase?.title ?? "Loading..."}</div>
            <div className="text-slate-400 text-xs">{activeCase?.location ?? ""}</div>
          </div>
          <div className="text-blue-400 text-xs font-bold shrink-0">{activeCase?.distance ?? "Loading..."}</div>
        </div>
        <button
          onClick={() => setTileStyle(tileStyle === "dark" ? "satellite" : "dark")}
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-slate-700"
          style={{ backgroundColor: "#0d1117" }}
        >
          <Layers className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="absolute right-3 top-20 flex flex-col gap-2 z-[450]">
        <button
          onClick={() => setFollowPatrol((f) => !f)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-slate-700 transition-all`}
          style={{ backgroundColor: followPatrol ? "#1d4ed8" : "#0d1117" }}
          title="Follow patrol"
        >
          <Crosshair className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={() => { 
            setNavStarted(false); 
            setCurrentStep(0);
            
            // Get actual current GPS location, then enable follow
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  setPatrolPos([latitude, longitude]);
                  setFollowPatrol(true); // Enable follow AFTER position is set
                },
                (error) => {
                  console.warn("Could not get location:", error);
                }
              );
            }
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-slate-700"
          style={{ backgroundColor: "#0d1117" }}
          title="Reset to current location"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Distance / ETA Card */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 left-3 rounded-xl shadow-lg border border-slate-700 p-3 z-[450]"
        style={{ backgroundColor: "#0d1117" }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-blue-400 text-xs font-bold">En Route</span>
        </div>
        <div className="text-white text-lg font-bold">{activeCase?.distance ?? "Loading..."}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-slate-400 text-xs">ETA: ~{activeCase?.eta ?? "Loading..."}</span>
        </div>
      </motion.div>

      {/* ── NAVIGATION PANEL ──────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-[450]">
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="rounded-t-3xl border-t border-slate-700 shadow-2xl"
              style={{ backgroundColor: "#0d1117" }}
            >
              {/* Panel Handle */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  {navStarted ? (
                    <>
                      <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-amber-400 text-sm font-bold">Navigation Active</span>
                      {currentStep === directions.length - 1 && (
                        <CheckCircle className="w-4 h-4 text-green-400 ml-1" />
                      )}
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 text-sm font-medium">Route to Incident</span>
                    </>
                  )}
                </div>
                <button onClick={() => setShowPanel(false)} className="text-slate-500 hover:text-slate-300">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Active Step */}
                {navStarted && (
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl p-4 border border-blue-500/30"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                        style={{ backgroundColor: "#1d4ed8" }}
                      >
                        {directions[currentStep].icon}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{directions[currentStep].instruction}</div>
                        <div className="text-blue-300 text-xs mt-0.5">
                          {directions[currentStep].distance}
                          {currentStep < directions.length - 1 &&
                            ` · Next: ${directions[currentStep + 1].instruction.slice(0, 30)}...`}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Steps Preview */}
                <div className="space-y-2">
                  {directions.map((d, i) => (
                    <div
                      key={d.step}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        navStarted && i === currentStep
                          ? "bg-blue-500/15 border border-blue-500/30"
                          : navStarted && i < currentStep
                          ? "opacity-40"
                          : "opacity-60"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          navStarted && i < currentStep
                            ? "bg-green-500 text-white"
                            : navStarted && i === currentStep
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {navStarted && i < currentStep ? "✓" : d.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-300 text-xs">{d.instruction}</div>
                      </div>
                      <div className="text-slate-500 text-xs shrink-0">{d.distance}</div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  {!navStarted ? (
                    <button
                      onClick={() => { 
                        setNavStarted(true); 
                        setFollowPatrol(true); 
                        if (routeCoords.length > 0) setPatrolPos(routeCoords[0]);
                      }}
                      disabled={routeLoading || directions.length <= 1}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#1d4ed8" }}
                    >
                      <Navigation className="w-5 h-5" />
                      {routeLoading ? "Calculating Route..." : "Start Navigation"}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setNavStarted(false); setCurrentStep(0); setFollowPatrol(false); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-600 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Stop Navigation
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/app/patrol/dashboard")}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-red-500/40 text-red-400 text-sm hover:bg-red-950/30 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Case
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show Panel Button */}
        {!showPanel && (
          <div className="flex justify-center pb-4">
            <button
              onClick={() => setShowPanel(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg text-sm font-medium text-white border border-slate-700"
              style={{ backgroundColor: "#0d1117" }}
            >
              <ChevronUp className="w-4 h-4" />
              Navigation Panel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}