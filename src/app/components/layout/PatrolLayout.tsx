import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Map,
  History,
  User,
  Bell,
  LogOut,
  Radio,
  Clock,
  Wifi,
  Battery,
  CheckCircle,
  AlertTriangle,
  Info,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { BantayLogo } from "../ui/BantayLogo";

const patrolNav = [
  { path: "/app/patrol/dashboard", icon: LayoutDashboard, label: "Dashboard", short: "Home" },
  { path: "/app/patrol/assigned", icon: ClipboardList, label: "Assigned", short: "Cases" },
  { path: "/app/patrol/map", icon: Map, label: "Map / Navigate", short: "Map" },
  { path: "/app/patrol/history", icon: History, label: "History", short: "History" },
  { path: "/app/patrol/profile", icon: User, label: "My Profile", short: "Profile" },
];

const patrolPageNames: Record<string, string> = {
  "/app/patrol/dashboard": "Active Case",
  "/app/patrol/assigned": "Assigned Reports",
  "/app/patrol/map": "Navigation Map",
  "/app/patrol/history": "Resolved Cases",
  "/app/patrol/profile": "Patrol Profile",
};

const notifications = [
  { id: 1, type: "warning", message: "New CRITICAL case assigned: RPT-007", time: "4 min ago", read: false },
  { id: 2, type: "info", message: "Shift reminder: 6 hours remaining", time: "30 min ago", read: false },
  { id: 3, type: "success", message: "RPT-H01 resolution confirmed by admin", time: "1 hour ago", read: true },
];

function ShiftClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-xs text-slate-300">
      {time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
    </span>
  );
}

export function PatrolLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifs, setNotifs] = useState(notifications);
  const [patrolLocation, setPatrolLocation] = useState<[number, number] | null>(null);
  const [patrolLocationLoading, setPatrolLocationLoading] = useState(false);

  const pageName = patrolPageNames[location.pathname] || "Patrol Operations";
  const unread = notifs.filter((n) => !n.read).length;

  // Get patrol officer's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("[Patrol Layout] Geolocation not supported");
      return;
    }

    setPatrolLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPatrolLocation([latitude, longitude]);
        setPatrolLocationLoading(false);
        console.log(`[Patrol Location] Captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (error) => {
        console.warn("[Patrol Location] Could not get location:", error);
        setPatrolLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#0f172a" }}>
      {/* ── Desktop Sidebar ────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-700/50 shadow-xl" style={{ backgroundColor: "#0d1117" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/50">
          <BantayLogo size={36} />
          <div>
            <div className="text-white font-bold text-sm leading-none">Bantay SP</div>
            <div className="mt-0.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400" style={{ fontSize: "10px" }}>PATROL MODE</span>
            </div>
          </div>
        </div>

        {/* Officer Info */}
        <div className="mx-3 mt-3 rounded-xl p-3 border border-slate-700/40" style={{ backgroundColor: "#161b22" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
              {user.avatar}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user.first_name} {user.last_name}</div>
              <div className="text-slate-400" style={{ fontSize: "10px" }}>{user.unit}</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Radio className="w-3 h-3 text-green-400" />
            <span className="text-green-400" style={{ fontSize: "10px" }}>On Duty</span>
            <span className="ml-auto text-slate-500" style={{ fontSize: "10px" }}>{user.badgeNumber}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {patrolNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/30"
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: "#800000" } : {}}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Shift Info */}
        <div className="px-3 pb-2">
          <div className="rounded-xl p-3 border border-slate-700/40" style={{ backgroundColor: "#161b22" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400" style={{ fontSize: "10px" }}>Day Shift</span>
            </div>
            <div className="text-slate-300 text-xs mb-1">
              {user.shiftStart} – {user.shiftEnd}
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "58%", backgroundColor: "#800000" }} />
            </div>
            <div className="mt-1 text-slate-500" style={{ fontSize: "10px" }}>58% of shift complete</div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="px-2 py-3 border-t border-slate-700/50 space-y-0.5">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors text-xs"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>End Shift</span>
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Patrol Header */}
        <header className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-700/50" style={{ backgroundColor: "#0d1117" }}>
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/30 transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Status bar mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-medium hidden xs:block">ON DUTY</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">{pageName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <ShiftClock />
              <span className="text-slate-500 hidden sm:block" style={{ fontSize: "10px" }}>·</span>
              <span className="text-slate-400 hidden sm:block text-xs">{user.unit}</span>
            </div>
          </div>

          {/* Status indicators - hidden on small screens */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="text-green-400" style={{ fontSize: "10px" }}>LIVE</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
              <Battery className="w-3 h-3 text-amber-400" />
              <span className="text-slate-300" style={{ fontSize: "10px" }}>78%</span>
            </div>
            
            {/* Location Indicator */}
            {patrolLocationLoading ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-yellow-400" style={{ fontSize: "10px" }}>LOCATING...</span>
              </div>
            ) : patrolLocation ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-green-400" style={{ fontSize: "10px" }}>{patrolLocation[0].toFixed(4)}, {patrolLocation[1].toFixed(4)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/50" style={{ backgroundColor: "#161b22" }}>
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-red-400" style={{ fontSize: "10px" }}>NO LOCATION</span>
              </div>
            )}
          </div>

          {/* Notifications - improved touch target */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
              style={{ backgroundColor: "#161b22" }}
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center" style={{ fontSize: "9px" }}>
                  {unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-72 sm:w-80 rounded-2xl border border-slate-700 z-50 overflow-hidden shadow-2xl max-h-96"
                  style={{ backgroundColor: "#161b22" }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <span className="text-white text-sm font-semibold">Dispatch Alerts</span>
                    <button onClick={() => setNotifs((n) => n.map((x) => ({ ...x, read: true })))} className="text-xs text-slate-400 hover:text-white">
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {notifs.map((n) => (
                      <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read ? "bg-slate-700/20" : ""}`}>
                        <div className="mt-0.5 shrink-0">
                          {n.type === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                           n.type === "success" ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                           <Info className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-xs leading-snug">{n.message}</p>
                          <p className="text-slate-500 mt-0.5" style={{ fontSize: "10px" }}>{n.time}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
            {user.avatar}
          </div>
        </header>

        {/* ── Mobile Sidebar Drawer ─────────────────────────── */}
        <AnimatePresence>
          {showMobileMenu && (
            <>
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed lg:hidden inset-y-0 left-0 w-72 z-40 flex flex-col border-r border-slate-700/50 shadow-2xl overflow-y-auto"
                style={{ backgroundColor: "#0d1117" }}
              >
                {/* Logo */}
                <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <BantayLogo size={32} />
                    <div>
                      <div className="text-white font-bold text-sm">Bantay SP</div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-green-400" style={{ fontSize: "10px" }}>PATROL</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Officer Info */}
                <div className="mx-3 mt-3 rounded-xl p-3 border border-slate-700/40" style={{ backgroundColor: "#161b22" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
                      {user.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-xs font-semibold truncate">{user.first_name} {user.last_name}</div>
                      <div className="text-slate-400" style={{ fontSize: "10px" }}>{user.unit}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Radio className="w-3 h-3 text-green-400 shrink-0" />
                    <span className="text-green-400" style={{ fontSize: "10px" }}>On Duty</span>
                    <span className="ml-auto text-slate-500 text-xs">{user.badgeNumber}</span>
                  </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                  {patrolNav.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                          isActive
                            ? "text-white shadow-sm"
                            : "text-slate-400 hover:text-white hover:bg-slate-700/30"
                        }`
                      }
                      style={({ isActive }) => isActive ? { backgroundColor: "#800000" } : {}}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </NavLink>
                  ))}
                </nav>

                {/* Shift Info */}
                <div className="px-3 pb-2">
                  <div className="rounded-xl p-3 border border-slate-700/40" style={{ backgroundColor: "#161b22" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-amber-400" style={{ fontSize: "10px" }}>Day Shift</span>
                    </div>
                    <div className="text-slate-300 text-xs mb-1">
                      {user.shiftStart} – {user.shiftEnd}
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: "58%", backgroundColor: "#800000" }} />
                    </div>
                    <div className="mt-1 text-slate-500" style={{ fontSize: "10px" }}>58% of shift complete</div>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="px-2 py-3 border-t border-slate-700/50 space-y-0.5">
                  <button
                    onClick={() => navigate("/")}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors text-xs font-medium"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>End Shift</span>
                  </button>
                </div>
              </motion.aside>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-30 lg:hidden"
                onClick={() => setShowMobileMenu(false)}
              />
            </>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0" style={{ backgroundColor: "#0f172a" }}>
          <Outlet />
        </main>

        {/* ── Mobile Bottom Nav ─────────────────────────────── */}
        <nav className="lg:hidden shrink-0 border-t border-slate-700/50 px-1 py-1.5 flex items-center justify-around" style={{ backgroundColor: "#0d1117" }}>
          {patrolNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg transition-all min-w-[48px] ${
                  isActive ? "text-white" : "text-slate-500"
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: "#800000" } : {}}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span className={`text-center text-xs ${isActive ? "text-white" : "text-slate-500"}`}>
                    {item.short}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Backdrop for notifications and mobile menu */}
      {(showNotifs || showMobileMenu) && (
        <div className="fixed inset-0 z-20" onClick={() => { setShowNotifs(false); setShowMobileMenu(false); }} />
      )}
    </div>
  );
}