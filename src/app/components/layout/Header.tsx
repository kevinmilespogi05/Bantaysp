import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Info,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../context/SearchContext";

// ─── Page title map ──────────────────────────────────────────────────────────

const pageNames: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/reports": "Reports",
  "/app/reports/create": "Create Report",
  "/app/announcements": "Announcements",
  "/app/emergency": "Emergency Contacts",
  "/app/leaderboard": "Leaderboard",
  "/app/chat": "Community Chat",
  "/app/profile": "My Profile",
  "/app/admin": "Admin Dashboard",
  "/app/admin/patrol-monitoring": "Patrol Monitoring — Command Center",
};

// ─── Role badge display ──────────────────────────────────────────────────────

const roleStyle = {
  resident: { bg: "#80000015", border: "#80000030", text: "#800000", label: "Resident", emoji: "👤" },
  admin: { bg: "#1d4ed815", border: "#1d4ed830", text: "#1d4ed8", label: "Admin", emoji: "🛡️" },
  patrol: { bg: "#06573015", border: "#06573030", text: "#16a34a", label: "Patrol", emoji: "👮" },
};

// ─── Static mock notifications (replace with API call in production) ─────────

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "success", message: "Your report RPT-003 has been resolved.", time: "2 min ago", read: false },
  { id: 2, type: "info", message: "New announcement: Typhoon Preparedness Advisory", time: "1 hour ago", read: false },
  { id: 3, type: "warning", message: "Report RPT-001 requires additional information.", time: "3 hours ago", read: true },
  { id: 4, type: "success", message: "You earned the Gold Reporter badge!", time: "Yesterday", read: true },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  onMenuToggle: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { query, setQuery } = useSearch();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFICATIONS);

  const pageName = pageNames[location.pathname] ?? "Bantay SP";
  const unreadCount = notifs.filter((n) => !n.read).length;
  const rStyle = roleStyle[user.role];

  const closeAll = () => {
    setShowNotifications(false);
    setShowProfile(false);
  };

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const notifIcon = (type: string) => {
    if (type === "success") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (type === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-3 shadow-sm">
      {/* Mobile Menu */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Page Title */}
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-gray-900 truncate" style={{ fontSize: "18px" }}>
          {pageName}
        </h1>
        <p className="text-gray-400 hidden sm:block" style={{ fontSize: "12px" }}>
          San Pablo, Castillejos, Zambales
        </p>
      </div>

      {/* Role Badge — display only, not clickable */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium"
        style={{ backgroundColor: rStyle.bg, borderColor: rStyle.border, color: rStyle.text }}
      >
        <span>{rStyle.emoji}</span>
        <span>{rStyle.label}</span>
      </div>

      {/* Desktop Search */}
      <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56 transition-all focus-within:border-[#800000] focus-within:ring-1 focus-within:ring-[#80000020]">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports..."
          className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
        />
        {query && (
          <button onClick={() => setQuery("")} className="shrink-0">
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Mobile Search Toggle */}
      <button
        onClick={() => { setShowSearch(!showSearch); closeAll(); }}
        className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-gray-600" />
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
          className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
              style={{ fontSize: "10px", backgroundColor: "#800000" }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                <button
                  onClick={markAllRead}
                  className="text-xs hover:underline"
                  style={{ color: "#800000" }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                      !n.read ? "bg-red-50/30" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                      <p className="text-gray-400 mt-0.5" style={{ fontSize: "11px" }}>
                        {n.time}
                      </p>
                    </div>
                    {!n.read && (
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: "#800000" }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button
                  className="w-full text-center text-sm py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ color: "#800000" }}
                >
                  View all notifications
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px]"
          aria-label="Profile menu"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "#800000" }}
          >
            {user.avatar}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
        </button>

        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-2"
            >
              {/* User Info */}
              <div className="px-4 py-2 border-b border-gray-100 mb-1">
                <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs">{rStyle.emoji}</span>
                  <div className="text-gray-400" style={{ fontSize: "11px" }}>
                    {rStyle.label}
                  </div>
                </div>
                <div className="text-gray-400 truncate mt-0.5" style={{ fontSize: "11px" }}>
                  {user.email}
                </div>
              </div>

              {/* My Profile */}
              <button
                onClick={() => { navigate("/app/profile"); setShowProfile(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <User className="w-4 h-4" />
                My Profile
              </button>

              {/* Settings — Admin only */}
              {isAdmin && (
                <button
                  onClick={() => { navigate("/app/admin"); setShowProfile(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              )}

              {/* Theme toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode ? "Light Mode" : "Dark Mode"}
                <span className="ml-auto text-xs text-gray-400">(Soon)</span>
              </button>

              {/* Sign Out */}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => navigate("/")}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop */}
      {(showNotifications || showProfile) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 z-30 shadow-md md:hidden overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reports by title, category, location..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
