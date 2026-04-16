/**
 * Sidebar — Role-based navigation for Resident and Admin.
 * Patrol uses its own PatrolLayout and never renders this component.
 *
 * sidebarConfig is the single source of truth for navigation.
 * To add a new page, add it here — the UI adapts automatically.
 */

import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Phone,
  Trophy,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  X,
  Radio,
  Users,
  UserCheck,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { BantayLogo } from "../ui/BantayLogo";

// ─── Nav Item Types ───────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  badge?: string;
  // Use `path` for exact-path navigation, `search` for same-path tab navigation
  path: string;
  search?: string;
}

// ─── RESIDENT navigation ──────────────────────────────────────────────────────

const residentNav: NavItem[] = [
  { path: "/app/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { path: "/app/reports",       icon: FileText,        label: "Reports" },
  { path: "/app/announcements", icon: Megaphone,       label: "Announcements" },
  { path: "/app/emergency",     icon: Phone,           label: "Emergency" },
  { path: "/app/leaderboard",   icon: Trophy,          label: "Leaderboard" },
  { path: "/app/chat",          icon: MessageSquare,   label: "Chat" },
  { path: "/app/profile",       icon: User,            label: "Profile" },
];

// ─── ADMIN navigation ─────────────────────────────────────────────────────────
// Completely separate from Resident — different job, different tools.

const adminNav: NavItem[] = [
  { path: "/app/admin",                     icon: BarChart3,   label: "Overview" },
  { path: "/app/admin", search: "?tab=reports",      icon: FileText,    label: "Reports Mgmt" },
  { path: "/app/announcements",             icon: Megaphone,   label: "Announcements" },
  { path: "/app/admin", search: "?tab=users",        icon: Users,       label: "Users & ID" },
  { path: "/app/admin", search: "?tab=verification", icon: UserCheck,   label: "Verification" },
  { path: "/app/admin/chat",                icon: MessageSquare, label: "User Messages" },
  {
    path: "/app/admin/patrol-monitoring",
    icon: Radio,
    label: "Patrol Monitoring",
    badge: "LIVE",
  },
  { path: "/app/profile", icon: User, label: "My Profile" },
];

// ─── Role → nav config map ────────────────────────────────────────────────────

const sidebarConfig: Record<string, NavItem[]> = {
  resident: residentNav,
  admin: adminNav,
  patrol: residentNav, // Patrol should never reach AppLayout's Sidebar (fallback)
};

// ─── Role display metadata ────────────────────────────────────────────────────

const roleDisplay: Record<string, { emoji: string; label: string; accent: string }> = {
  resident: { emoji: "👤", label: "Resident",       accent: "#80000020" },
  admin:    { emoji: "🛡️", label: "Administrator",  accent: "#1d4ed820" },
  patrol:   { emoji: "👮", label: "Patrol Officer", accent: "#06573020" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Determine if a nav item should appear "active" in the sidebar */
function useIsNavActive(item: NavItem): boolean {
  const location = useLocation();
  if (item.search) {
    // Tab-based items: path AND search must match
    return location.pathname === item.path && location.search === item.search;
  }
  // For /app/admin (no search), only exact match with no search params
  if (item.path === "/app/admin" && !item.search) {
    return location.pathname === "/app/admin" && !location.search;
  }
  // Regular paths: prefix match
  return location.pathname.startsWith(item.path);
}

// ─── NavItemButton — handles both NavLink and search-param links ──────────────

function NavItemButton({
  item,
  collapsed,
  isMobile,
  onClose,
}: {
  item: NavItem;
  collapsed: boolean;
  isMobile: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const isActive = useIsNavActive(item);
  const showLabel = !collapsed || isMobile;

  const baseClass = `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative w-full ${
    collapsed && !isMobile ? "justify-center px-2" : ""
  }`;

  const activeClass = "bg-white/20 text-white shadow-sm";
  const inactiveClass = "text-white/70 hover:bg-white/10 hover:text-white";

  const handleClick = () => {
    if (item.search) {
      navigate({ pathname: item.path, search: item.search });
    }
    if (isMobile) onClose?.();
  };

  // For regular paths without search params, use NavLink
  if (!item.search) {
    return (
      <NavLink
        to={item.path}
        onClick={isMobile ? onClose : undefined}
        className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
        )}
        <item.icon className="w-5 h-5 shrink-0" />
        {showLabel && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{item.label}</span>
            {item.badge && (
              <span
                className="ml-auto px-1.5 py-0.5 rounded text-white animate-pulse shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.25)", fontSize: "9px" }}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );
  }

  // For search-param tab links, use a styled button
  return (
    <button onClick={handleClick} className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
      )}
      <item.icon className="w-5 h-5 shrink-0" />
      {showLabel && (
        <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>
      )}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const roleInfo = roleDisplay[user.role] ?? roleDisplay.resident;
  const navItems = sidebarConfig[user.role] ?? residentNav;

  const handleLogout = () => navigate("/");

  // ── Inner content (shared between desktop & mobile) ───────────────────────

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div
      className={`h-full flex flex-col text-white transition-all duration-300 ${
        isMobile ? "w-64" : collapsed ? "w-16" : "w-64"
      }`}
      style={{ backgroundColor: "#800000" }}
    >
      {/* ── Logo ── */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${
          collapsed && !isMobile ? "justify-center px-2" : ""
        }`}
      >
        <BantayLogo size={36} />
        {(!collapsed || isMobile) && (
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-none text-white">Bantay SP</div>
            <div className="text-white/60 mt-0.5 truncate" style={{ fontSize: "11px" }}>
              {isAdmin ? "Control Panel" : "San Pablo, Castillejos"}
            </div>
          </div>
        )}
        {!isMobile ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Role / User Badge ── */}
      {(!collapsed || isMobile) && (
        <div className="mx-3 mt-3">
          <div className="rounded-xl px-3 py-2 border border-white/10 bg-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm">{roleInfo.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white/90 text-xs font-semibold truncate">{user.first_name} {user.last_name}</div>
                <div className="text-white/50" style={{ fontSize: "10px" }}>
                  {roleInfo.label} · {user.barangay}
                </div>
              </div>
              {/* Active dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* ── Section label ── */}
      {(!collapsed || isMobile) && (
        <div className="px-4 pt-4 pb-1">
          <span className="text-white/30 font-semibold uppercase tracking-widest" style={{ fontSize: "9px" }}>
            {isAdmin ? "Administration" : "Navigation"}
          </span>
        </div>
      )}

      {/* ── Nav Items ── */}
      <nav className="flex-1 py-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, idx) => {
          // Insert section divider before "Patrol Monitoring" in admin nav
          const showDivider =
            isAdmin && item.path === "/app/admin/patrol-monitoring";
          return (
            <div key={`${item.path}${item.search ?? ""}-${idx}`}>
              {showDivider && (!collapsed || isMobile) && (
                <div className="my-2 border-t border-white/10" />
              )}
              <NavItemButton
                item={item}
                collapsed={collapsed}
                isMobile={isMobile}
                onClose={onMobileClose}
              />
            </div>
          );
        })}


      </nav>

      {/* ── Footer ── */}
      <div
        className={`px-3 py-4 border-t border-white/10 space-y-2 ${
          collapsed && !isMobile ? "px-2" : ""
        }`}
      >
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.first_name} {user.last_name}</div>
              <div className="text-white/50 truncate" style={{ fontSize: "11px" }}>
                {user.barangay}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors ${
            collapsed && !isMobile ? "justify-center px-2" : ""
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex h-screen sticky top-0 shrink-0 transition-all duration-300 shadow-xl">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full z-50 shadow-2xl md:hidden"
            >
              <SidebarContent isMobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}