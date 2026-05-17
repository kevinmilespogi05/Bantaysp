import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import type { ToastPriority, ToastType } from "../components/ui/Toast";

export type RealtimeConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "error";

export interface LiveNotification {
  id: string;
  type: ToastType;
  priority: ToastPriority;
  message: string;
  time: string;
  read: boolean;
  dedupeKey: string;
  createdAt: number;
}

export interface OnlineUserPresence {
  userId: string;
  name: string;
  role: string;
  avatar: string;
  onlineAt: string;
  lastSeen: number;
}

interface RealtimeContextType {
  connectionStatus: RealtimeConnectionStatus;
  reportsVersion: number;
  notifications: LiveNotification[];
  unreadCount: number;
  onlineUsers: OnlineUserPresence[];
  onlineAdmins: OnlineUserPresence[];
  onlinePatrol: OnlineUserPresence[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (
    message: string,
    type?: ToastType,
    options?: { priority?: ToastPriority; dedupeKey?: string; toast?: boolean; duration?: number }
  ) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

function nowLabel() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function statusLabel(status?: string) {
  if (!status) return "updated";
  return status.replace(/_/g, " ");
}

function isEmergencyReport(report: Record<string, any>) {
  const text = `${report.category ?? ""} ${report.title ?? ""}`.toLowerCase();
  return ["emergency", "disaster", "fire", "flood", "crime", "public safety"].some((term) => text.includes(term));
}

function notificationForReportChange(
  eventType: "INSERT" | "UPDATE" | "DELETE",
  report: Record<string, any>,
  oldReport: Record<string, any> | null,
  currentUser: { id: string; role: string }
): { message: string; type: ToastType; priority: ToastPriority; dedupeKey: string } | null {
  const reportId = report.id ?? oldReport?.id;
  if (!reportId) return null;

  const statusChanged = oldReport?.status && report.status && oldReport.status !== report.status;
  const assignmentChanged = oldReport?.patrol_assigned_to !== report.patrol_assigned_to;
  const verifiedChanged = typeof oldReport?.verified === "boolean" && oldReport.verified !== report.verified;
  const title = report.title || oldReport?.title || `Report ${reportId}`;

  if (currentUser.role === "admin") {
    if (eventType === "INSERT") {
      const emergency = isEmergencyReport(report);
      return {
        message: emergency ? `Emergency alert submitted: ${title}` : `New report submitted: ${title}`,
        type: emergency ? "warning" : "info",
        priority: emergency ? "high" : "normal",
        dedupeKey: `admin:new:${reportId}`,
      };
    }

    if (statusChanged && report.status === "submitted") {
      return {
        message: `Patrol submitted a resolution for ${title}`,
        type: "info",
        priority: "high",
        dedupeKey: `admin:submitted:${reportId}:${report.updated_at ?? report.resolved_at ?? report.status}`,
      };
    }

    if (statusChanged) {
      return {
        message: `${title} is now ${statusLabel(report.status)}`,
        type: report.status === "rejected" ? "warning" : "success",
        priority: report.status === "pending_verification" ? "high" : "normal",
        dedupeKey: `admin:status:${reportId}:${report.status}`,
      };
    }
  }

  if (currentUser.role === "patrol") {
    if (assignmentChanged && report.patrol_assigned_to === currentUser.id) {
      return {
        message: `New patrol assignment: ${title}`,
        type: "info",
        priority: "high",
        dedupeKey: `patrol:assigned:${reportId}:${report.patrol_assigned_to}`,
      };
    }

    if (statusChanged && report.status === "approved" && !report.patrol_assigned_to) {
      return {
        message: `New available report: ${title}`,
        type: "info",
        priority: "normal",
        dedupeKey: `patrol:available:${reportId}:${report.status}`,
      };
    }

    if (report.patrol_assigned_to === currentUser.id && statusChanged) {
      return {
        message: `${title} moved to ${statusLabel(report.status)}`,
        type: report.status === "resolved" ? "success" : "info",
        priority: "normal",
        dedupeKey: `patrol:status:${reportId}:${report.status}`,
      };
    }
  }

  if (report.user_id === currentUser.id) {
    if (statusChanged) {
      return {
        message: `Your report "${title}" is now ${statusLabel(report.status)}`,
        type: report.status === "rejected" ? "warning" : "success",
        priority: "high",
        dedupeKey: `resident:status:${reportId}:${report.status}`,
      };
    }

    if (verifiedChanged) {
      return {
        message: report.verified ? `Your report "${title}" was verified` : `Verification changed for "${title}"`,
        type: report.verified ? "success" : "warning",
        priority: "normal",
        dedupeKey: `resident:verified:${reportId}:${report.verified}`,
      };
    }
  }

  if (eventType === "INSERT" && isEmergencyReport(report)) {
    return {
      message: `Emergency alert near the community: ${title}`,
      type: "warning",
      priority: "high",
      dedupeKey: `all:emergency:${reportId}`,
    };
  }

  return null;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("idle");
  const [reportsVersion, setReportsVersion] = useState(0);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserPresence[]>([]);
  const dedupeRef = useRef<Map<string, number>>(new Map());

  const pushNotification = useCallback<RealtimeContextType["pushNotification"]>(
    (message, type = "info", options) => {
      const createdAt = Date.now();
      const dedupeKey = options?.dedupeKey ?? `${type}:${message}`;
      const previous = dedupeRef.current.get(dedupeKey);

      if (previous && createdAt - previous < 30000) {
        return;
      }

      dedupeRef.current.set(dedupeKey, createdAt);
      for (const [key, timestamp] of dedupeRef.current) {
        if (createdAt - timestamp > 120000) dedupeRef.current.delete(key);
      }

      const priority = options?.priority ?? "normal";
      const notification: LiveNotification = {
        id: `live-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        priority,
        message,
        time: nowLabel(),
        read: false,
        dedupeKey,
        createdAt,
      };

      const priorityRank: Record<ToastPriority, number> = { high: 0, normal: 1, low: 2 };
      setNotifications((prev) =>
        [notification, ...prev]
          .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt - a.createdAt)
          .slice(0, 50)
      );

      if (options?.toast !== false) {
        showToast(message, type, options?.duration ?? (priority === "high" ? 7000 : 4500), {
          priority,
          dedupeKey,
        });
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!isAuthenticated || !session?.access_token || !user.id) {
      setConnectionStatus("idle");
      setOnlineUsers([]);
      return;
    }

    setConnectionStatus((prev) => (prev === "connected" ? "reconnecting" : "connecting"));

    const reportsChannel = supabase
      .channel(`reports-live:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          setReportsVersion((version) => version + 1);

          const report = (payload.new ?? payload.old ?? {}) as Record<string, any>;
          const oldReport = (payload.old ?? null) as Record<string, any> | null;
          const notification = notificationForReportChange(
            payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            report,
            oldReport,
            { id: user.id, role: user.role }
          );

          if (notification) {
            pushNotification(notification.message, notification.type, {
              priority: notification.priority,
              dedupeKey: notification.dedupeKey,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("error");
          pushNotification("Live updates are reconnecting. Some changes may arrive a little late.", "warning", {
            priority: "low",
            dedupeKey: "realtime:reports:reconnecting",
            duration: 5000,
          });
        }
        if (status === "CLOSED") setConnectionStatus("offline");
      });

    const presenceChannel = supabase
      .channel("presence:bantay-sp", { config: { presence: { key: user.id } } })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<Record<string, any>>();
        const presentUsers = Object.values(state)
          .flat()
          .map((presence) => ({
            userId: presence.userId,
            name: presence.name,
            role: presence.role,
            avatar: presence.avatar,
            onlineAt: presence.onlineAt,
            lastSeen: presence.lastSeen,
          }))
          .filter((presence) => presence.userId && presence.role);

        const unique = new Map<string, OnlineUserPresence>();
        for (const presence of presentUsers) {
          unique.set(presence.userId, presence);
        }
        setOnlineUsers([...unique.values()]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            userId: user.id,
            name: `${user.first_name} ${user.last_name}`.trim(),
            role: user.role,
            avatar: user.avatar,
            onlineAt: new Date().toISOString(),
            lastSeen: Date.now(),
          });
        }
      });

    const handleOnline = () => {
      setConnectionStatus("reconnecting");
      pushNotification("Connection restored. Syncing live updates...", "info", {
        priority: "low",
        dedupeKey: "network:online",
        duration: 3500,
      });
    };
    const handleOffline = () => {
      setConnectionStatus("offline");
      pushNotification("You are offline. Updates will resume when the connection returns.", "warning", {
        priority: "high",
        dedupeKey: "network:offline",
        duration: 7000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [
    isAuthenticated,
    pushNotification,
    session?.access_token,
    user.avatar,
    user.first_name,
    user.id,
    user.last_name,
    user.role,
  ]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((notification) => (
      notification.id === id ? { ...notification, read: true } : notification
    )));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, []);

  const value = useMemo<RealtimeContextType>(() => {
    const onlineAdmins = onlineUsers.filter((presence) => presence.role === "admin");
    const onlinePatrol = onlineUsers.filter((presence) => presence.role === "patrol");

    return {
      connectionStatus,
      reportsVersion,
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      onlineUsers,
      onlineAdmins,
      onlinePatrol,
      markNotificationRead,
      markAllNotificationsRead,
      pushNotification,
    };
  }, [
    connectionStatus,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    onlineUsers,
    pushNotification,
    reportsVersion,
  ]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return context;
}
