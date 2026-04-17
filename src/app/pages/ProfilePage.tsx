import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Settings, Trophy, CheckCircle, Shield, Star, Zap, Award,
  MapPin, Mail, Phone, Calendar, Edit3, Camera, BadgeCheck,
  FileText, Lock, Bell, Eye, type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApi, fetchUserProfile } from "../services/api";
import { PageSpinner, EmptyState } from "../components/ui/DataStates";

const achievementIcons: Record<string, LucideIcon> = {
  zap: Zap,
  shield: Shield,
  award: Award,
  star: Star,
  "badge-check": BadgeCheck,
  trophy: Trophy,
};

type TabKey = "overview" | "settings" | "achievements";

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: User },
  { key: "achievements", label: "Achievements", icon: Trophy },
  { key: "settings", label: "Settings", icon: Settings },
];

export function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true, push: true, sms: false, announcements: true, reportUpdates: true,
  });

  // Fetch extended profile data (bio, achievements, points, etc.)
  // Production: GET /api/profile using auth token
  // Only fetch if user.id exists to avoid calling /profile/ without an ID
  const { data: profileData, loading: profileLoading } = useApi(
    () => (user.id ? fetchUserProfile(user.id) : Promise.resolve({ data: null, error: null })),
    [user.id]
  );

  // Use auth user as base, override with extended profile where available
  const displayUser = {
    firstName: user.first_name || "User",
    lastName: user.last_name || "",
    avatar: user.avatar,
    barangay: user.barangay,
    role: user.role,
    points: profileData?.points ?? 0,
    reports: profileData?.reports ?? 0,
    badge: profileData?.badge ?? "Member",
    verified: profileData?.verified ?? false,
    joined: profileData?.joined ?? "—",
    bio: profileData?.bio ?? "",
    achievements: profileData?.achievements ?? [],
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover photo */}
        <div className="h-36 sm:h-44 relative" style={{ background: "linear-gradient(135deg, #800000, #600000)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          {/* Camera button for cover */}
          <button className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 text-white text-xs hover:bg-black/50 transition-colors backdrop-blur-sm">
            <Camera className="w-3.5 h-3.5" />
            Change Cover
          </button>
        </div>

        {/* Avatar row — overlaps cover with negative margin */}
        <div className="px-5 sm:px-6 pb-5">
          <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12 mb-5">
            {/* Avatar */}
            <div className="relative shrink-0 self-start">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white font-bold border-4 border-white shadow-lg"
                style={{ fontSize: "1.5rem", backgroundColor: "#800000" }}
              >
                {displayUser.avatar}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center border-2 border-white">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Name + badges — always below avatar, never overlapping cover */}
            <div className="flex-1 pt-2 sm:pt-0 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-gray-900" style={{ fontSize: "1.2rem" }}>{displayUser.firstName} {displayUser.lastName}</h2>
                {displayUser.verified && (
                  <div className="flex items-center gap-1 bg-blue-50 rounded-full px-2 py-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-700" style={{ fontSize: "11px" }}>Verified</span>
                  </div>
                )}
                <div className="flex items-center gap-1 bg-amber-50 rounded-full px-2 py-0.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700" style={{ fontSize: "11px" }}>{displayUser.badge} Reporter</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {displayUser.barangay}
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditing(!editing)}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-all shrink-0 sm:mb-1 min-h-[44px]"
            >
              <Edit3 className="w-4 h-4" />
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-gray-50">
            {[
              { label: "Reports", value: displayUser.reports, icon: FileText, color: "#800000" },
              { label: "Points", value: displayUser.points.toLocaleString(), icon: Star, color: "#d97706" },
              { label: "Rank", value: "#2", icon: Trophy, color: "#6b7280" },
              { label: "Achievements", value: displayUser.achievements.filter((a) => a.earned).length, icon: Award, color: "#7c3aed" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                <div className="font-bold text-gray-900">{s.value}</div>
                <div className="text-gray-400" style={{ fontSize: "11px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid xl:grid-cols-3 gap-6"
          >
            {/* Info Card */}
            <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
              <h3 className="font-semibold text-gray-900">Personal Information</h3>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input defaultValue="Juan" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input defaultValue="dela Cruz" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                        onFocus={(e) => (e.target.style.borderColor = "#800000")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea rows={3} defaultValue={displayUser.bio} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none resize-none"
                      onFocus={(e) => (e.target.style.borderColor = "#800000")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                  </div>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all"
                    style={{ backgroundColor: "#800000" }}
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    {displayUser.firstName} {displayUser.lastName}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    09XX XXX XXXX
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    {displayUser.barangay}, Castillejos, Zambales
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    Member since {displayUser.joined}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-600 text-sm leading-relaxed">{displayUser.bio}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side */}
            <div className="space-y-5">
              {/* Civic Score */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Civic Score</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Total Points</span>
                  <span className="font-bold text-lg" style={{ color: "#800000" }}>{displayUser.points.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: Math.min((displayUser.points / 5000) * 100, 100) + "%", backgroundColor: "#d97706" }} />
                </div>
                <p className="text-gray-400 text-xs">{Math.max(5000 - displayUser.points, 0).toLocaleString()} more points until Diamond tier</p>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {displayUser.points > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#80000015" }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: "#800000" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">{displayUser.reports} report(s) filed</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">active</span>
                    </div>
                  )}
                  {displayUser.points > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#d9770615" }}>
                        <Star className="w-3.5 h-3.5" style={{ color: "#d97706" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">Earned {displayUser.points} points</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">recently</span>
                    </div>
                  )}
                  {displayUser.verified && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#16a34a15" }}>
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">Verified member</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">✓</span>
                    </div>
                  )}
                  {!displayUser.points && !displayUser.reports && (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">No activity yet. File your first report to get started! 🎯</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayUser.achievements.map((ach, i) => {
                const Icon = achievementIcons[ach.icon] || Star;
                return (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-2xl p-5 shadow-sm border transition-all ${
                      ach.earned
                        ? "bg-white border-gray-100 hover:shadow-md"
                        : "bg-gray-50 border-gray-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: ach.earned ? "#80000015" : "#e5e7eb",
                        }}
                      >
                        <Icon
                          className="w-7 h-7"
                          style={{ color: ach.earned ? "#800000" : "#9ca3af" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900 text-sm">{ach.name}</h3>
                          {ach.earned && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                        </div>
                        <p className="text-gray-500 text-xs">{ach.description}</p>
                        <div className="mt-1.5">
                          {ach.earned ? (
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Earned</span>
                          ) : (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not yet earned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid xl:grid-cols-2 gap-6"
          >
            {/* Notification Settings */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4" style={{ color: "#800000" }} />
                <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
              </div>
              <div className="space-y-4">
                {[
                  { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                  { key: "push", label: "Push Notifications", desc: "Browser and mobile alerts" },
                  { key: "sms", label: "SMS Alerts", desc: "Text messages for urgent alerts" },
                  { key: "announcements", label: "Announcements", desc: "Barangay and municipal notices" },
                  { key: "reportUpdates", label: "Report Updates", desc: "Status changes on your reports" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                      className="relative w-11 h-6 rounded-full transition-all duration-200"
                      style={{ backgroundColor: notifications[item.key as keyof typeof notifications] ? "#800000" : "#e5e7eb" }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                        style={{ transform: notifications[item.key as keyof typeof notifications] ? "translateX(22px)" : "translateX(2px)" }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4" style={{ color: "#800000" }} />
                <h3 className="font-semibold text-gray-900">Security Settings</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Change Password", icon: Lock, desc: "Update your account password" },
                  { label: "Two-Factor Auth", icon: Shield, desc: "Enable 2FA for added security" },
                  { label: "Login Activity", icon: Eye, desc: "View recent login sessions" },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <button className="w-full py-2.5 rounded-xl text-red-600 border border-red-200 text-sm font-medium hover:bg-red-50 transition-all">
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}