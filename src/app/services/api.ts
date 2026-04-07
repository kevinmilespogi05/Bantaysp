/**
 * Bantay SP — API Service Layer
 *
 * All data flows through this file. No page imports mock data directly.
 * All read operations use `useApi()`. Mutations are standalone async functions
 * called from event handlers.
 */

import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// ─── Base HTTP config ─────────────────────────────────────────────────────────

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5f514c57`;

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
};

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: HEADERS });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { data: null as unknown as T, error: err.error ?? `HTTP ${res.status}` };
    }
    const data: T = await res.json();
    return { data, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { data: null as unknown as T, error: msg };
  }
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  category: string;
  status: "pending" | "in_progress" | "resolved";
  priority: "high" | "medium" | "low";
  location: string;
  timestamp: string;
  reporter: string;
  avatar: string;
  description: string;
  image: string | null;
  comments: number;
  upvotes: number;
}

export interface Announcement {
  id: number;
  title: string;
  category: string;
  date: string;
  author: string;
  authorRole: string;
  content: string;
  image: string | null;
  pinned: boolean;
  urgent: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  reports: number;
  verified: boolean;
  avatar: string;
  badge: "Gold" | "Silver" | "Bronze" | "Member";
  barangay: string;
}

export interface DashboardStats {
  totalReports: number;
  pending: number;
  inProgress: number;
  resolved: number;
  activeCitizens: number;
  responseRate: number;
}

export interface AdminStats {
  totalUsers: number;
  totalReports: number;
  pendingReview: number;
  resolved: number;
  responseRate: number;
  pendingVerification: number;
}

export interface ChartMonthly { month: string; reports: number; resolved: number; }
export interface ChartCategory { name: string; value: number; color: string; }
export interface ChartWeekly { day: string; reports: number; }
export interface ChartBarangay { name: string; reports: number; resolved: number; }

export interface Comment {
  id: number;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

export type PatrolStatus = "available" | "en_route" | "busy" | "offline";

export interface PatrolUnit {
  id: string;
  name: string;
  avatar: string;
  unit: string;
  badgeNumber: string;
  rank: string;
  status: PatrolStatus;
  currentCase: string | null;
  currentCaseTitle: string | null;
  location: { lat: number; lng: number };
  lastUpdated: string;
  phone: string;
  casesToday: number;
  avgResponse: string;
  shiftStart: string;
  shiftEnd: string;
}

export interface IncidentPin {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  location: { lat: number; lng: number };
  address: string;
  status: "pending" | "assigned" | "in_progress" | "resolved";
  assignedPatrol: string | null;
  timeReported: string;
}

export interface PatrolActiveCase {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  location: string;
  address: string;
  distance: string;
  eta: string;
  timeReported: string;
  reporter: string;
  reporterAvatar: string;
  reporterContact: string;
  reporterNotes: string;
  status: "assigned" | "accepted" | "in_progress" | "resolved";
  coordinates: { lat: number; lng: number };
  assignedAt: string;
}

export interface PatrolCaseSummary {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  location: string;
  distance: string;
  timeReported: string;
  status: string;
  reporter: string;
  reporterAvatar: string;
  description: string;
}

export interface PatrolHistoryEntry {
  id: string;
  title: string;
  category: string;
  priority: string;
  location: string;
  timeResolved: string;
  timeReported: string;
  responseTime: string;
  resolution: string;
  status: string;
  hasPhoto: boolean;
}

export interface PatrolOfficerStats {
  today: { completed: number; avgResponse: string; distance: string; rank: number };
  week: { completed: number; avgResponse: string; clearanceRate: number };
  month: { completed: number; topCategory: string; commendations: number };
}

export interface PatrolDispatchMessage {
  id: number;
  from: string;
  to: string;
  message: string;
  time: string;
  read: boolean;
}

export interface EmergencyContact {
  id: number;
  name: string;
  number: string;
  type: string;
  icon: string;
  available: string;
  color: string;
  description: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  barangay: string;
  role: string;
  points: number;
  reports: number;
  badge: string;
  verified: boolean;
  joined: string;
  bio: string;
  achievements: {
    id: number;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
  }[];
}

// ─── Read API functions ───────────────────────────────────────────────────────

export async function fetchReports(): Promise<ApiResponse<Report[]>> {
  return apiFetch<Report[]>("/reports");
}

export async function fetchComments(reportId: string): Promise<ApiResponse<Comment[]>> {
  return apiFetch<Comment[]>(`/reports/${reportId}/comments`);
}

export async function fetchAnnouncements(): Promise<ApiResponse<Announcement[]>> {
  return apiFetch<Announcement[]>("/announcements");
}

export async function fetchLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
  return apiFetch<LeaderboardEntry[]>("/leaderboard");
}

export async function fetchEmergencyContacts(): Promise<ApiResponse<EmergencyContact[]>> {
  return apiFetch<EmergencyContact[]>("/emergency-contacts");
}

export async function fetchDashboardStats(): Promise<ApiResponse<DashboardStats | null>> {
  return apiFetch<DashboardStats>("/dashboard/stats");
}

export async function fetchAdminStats(): Promise<ApiResponse<AdminStats | null>> {
  return apiFetch<AdminStats>("/admin/stats");
}

export async function fetchMonthlyTrends(): Promise<ApiResponse<ChartMonthly[]>> {
  return apiFetch<ChartMonthly[]>("/analytics/monthly");
}

export async function fetchCategoryData(): Promise<ApiResponse<ChartCategory[]>> {
  return apiFetch<ChartCategory[]>("/analytics/categories");
}

export async function fetchWeeklyActivity(): Promise<ApiResponse<ChartWeekly[]>> {
  return apiFetch<ChartWeekly[]>("/analytics/weekly");
}

export async function fetchBarangayData(): Promise<ApiResponse<ChartBarangay[]>> {
  return apiFetch<ChartBarangay[]>("/analytics/barangay");
}

export async function fetchPatrolUnits(): Promise<ApiResponse<PatrolUnit[]>> {
  return apiFetch<PatrolUnit[]>("/patrol/units");
}

export async function fetchIncidentPins(): Promise<ApiResponse<IncidentPin[]>> {
  return apiFetch<IncidentPin[]>("/patrol/incidents");
}

export async function fetchDispatchMessages(): Promise<ApiResponse<PatrolDispatchMessage[]>> {
  return apiFetch<PatrolDispatchMessage[]>("/patrol/messages");
}

export async function fetchActiveCase(): Promise<ApiResponse<PatrolActiveCase | null>> {
  return apiFetch<PatrolActiveCase | null>("/patrol/active-case");
}

export async function fetchAssignedReports(): Promise<ApiResponse<PatrolCaseSummary[]>> {
  return apiFetch<PatrolCaseSummary[]>("/patrol/assigned");
}

export async function fetchPatrolHistory(): Promise<ApiResponse<PatrolHistoryEntry[]>> {
  return apiFetch<PatrolHistoryEntry[]>("/patrol/history");
}

export async function fetchPatrolStats(): Promise<ApiResponse<PatrolOfficerStats | null>> {
  return apiFetch<PatrolOfficerStats>("/patrol/stats");
}

export async function fetchUserProfile(userId: string): Promise<ApiResponse<UserProfile | null>> {
  return apiFetch<UserProfile | null>(`/profile/${userId}`);
}

// ─── Mutation API functions ───────────────────────────────────────────────────

/** Create a new community report */
export async function createReport(data: {
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
  reporter: string;
  avatar: string;
  image?: string | null;
}): Promise<ApiResponse<Report>> {
  return apiFetch<Report>("/reports", { method: "POST", body: JSON.stringify(data) });
}

/** Update a report (status, priority, etc.) */
export async function updateReport(
  id: string,
  data: Partial<Report>
): Promise<ApiResponse<Report>> {
  return apiFetch<Report>(`/reports/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

/** Delete a report */
export async function deleteReport(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch<{ success: boolean }>(`/reports/${id}`, { method: "DELETE" });
}

/** Post a comment on a report */
export async function addComment(
  reportId: string,
  data: { author: string; avatar: string; text: string }
): Promise<ApiResponse<Comment>> {
  return apiFetch<Comment>(`/reports/${reportId}/comments`, { method: "POST", body: JSON.stringify(data) });
}

/** Toggle upvote on a report */
export async function upvoteReport(
  id: string,
  action: "add" | "remove"
): Promise<ApiResponse<{ upvotes: number }>> {
  return apiFetch<{ upvotes: number }>(`/reports/${id}/upvote`, { method: "POST", body: JSON.stringify({ action }) });
}

/** Create an announcement (admin) */
export async function createAnnouncement(data: {
  title: string;
  content: string;
  category: string;
  author: string;
  authorRole: string;
  pinned: boolean;
  urgent: boolean;
  image?: string | null;
}): Promise<ApiResponse<Announcement>> {
  return apiFetch<Announcement>("/announcements", { method: "POST", body: JSON.stringify(data) });
}

/** Update an announcement */
export async function updateAnnouncement(
  id: number | string,
  data: Partial<Announcement>
): Promise<ApiResponse<Announcement>> {
  return apiFetch<Announcement>(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

/** Delete an announcement */
export async function deleteAnnouncement(id: number | string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch<{ success: boolean }>(`/announcements/${id}`, { method: "DELETE" });
}

/** Update patrol unit status / assignment */
export async function updatePatrolUnit(
  id: string,
  data: Partial<PatrolUnit>
): Promise<ApiResponse<PatrolUnit>> {
  return apiFetch<PatrolUnit>(`/patrol/units/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

/** Update patrol incident (assign, change status) */
export async function updatePatrolIncident(
  id: string,
  data: Partial<IncidentPin & { assignedAt?: string }>
): Promise<ApiResponse<IncidentPin>> {
  return apiFetch<IncidentPin>(`/patrol/incidents/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

/** Send a dispatch message */
export async function sendPatrolMessage(data: {
  from: string;
  to: string;
  message: string;
}): Promise<ApiResponse<PatrolDispatchMessage>> {
  return apiFetch<PatrolDispatchMessage>("/patrol/messages", { method: "POST", body: JSON.stringify(data) });
}

/** Save a patrol history entry */
export async function savePatrolHistory(
  data: Omit<PatrolHistoryEntry, "id">
): Promise<ApiResponse<PatrolHistoryEntry>> {
  return apiFetch<PatrolHistoryEntry>("/patrol/history", { method: "POST", body: JSON.stringify(data) });
}

/** Update user profile */
export async function updateProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> {
  return apiFetch<UserProfile>(`/profile/${userId}`, { method: "PUT", body: JSON.stringify(data) });
}

// ─── useApi — Generic async read hook ────────────────────────────────────────

export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (cancelled) return;
        setData(res.data as T);
        if (res.error) setError(res.error);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? "An error occurred.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}
