/**
 * Bantay SP — API Service Layer
 *
 * All data flows through this file. No page imports mock data directly.
 * All read operations use `useApi()`. Mutations are standalone async functions
 * called from event handlers.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ─── Base HTTP config ─────────────────────────────────────────────────────────

// Use Render backend if available, otherwise fall back to local dev server
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE_URL = BACKEND_URL;

const HEADERS = {
  "Content-Type": "application/json",
};

/**
 * Get valid access token from Supabase session
 * @returns access_token or null if user not authenticated
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn("[API] Error fetching session:", error.message);
      return null;
    }
    
    if (!session) {
      console.warn("[API] No session available - user may not be authenticated");
      return null;
    }
    
    if (!session.access_token) {
      console.warn("[API] Session exists but no access_token available");
      return null;
    }
    
    // Check if token is expired
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
      console.warn("[API] Access token has expired");
      return null;
    }
    
    console.log("[API] Valid session retrieved:", {
      user_id: session.user?.id?.substring(0, 8) + "...",
      expires_at: new Date((session.expires_at || 0) * 1000).toISOString(),
    });
    
    return session.access_token;
  } catch (err) {
    console.error("[API] Exception while getting access token:", err);
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  useSessionToken: boolean = true
): Promise<ApiResponse<T>> {
  try {
    // Always get the session token for the Render backend
    let authHeader = "";
    
    if (useSessionToken) {
      const accessToken = await getAccessToken();
      console.log("[API] Got access token:", accessToken ? "✅ Present" : "❌ Missing");
      if (accessToken) {
        authHeader = `Bearer ${accessToken}`;
      } else {
        console.warn("[API] No access token available - request may fail");
      }
    }
    
    const headers: Record<string, string> = {
      ...HEADERS,
    };

    // Only add Authorization header if we have a token
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    
    const url = `${BASE_URL}${path}`;
    const method = options.method || "GET";
    console.log(`[API] ${method} ${path}`, { hasAuth: !!authHeader, url });

    const res = await fetch(url, { ...options, headers });
    
    console.log(`[API] Response: ${method} ${path} → ${res.status} ${res.statusText}`);
    
    // Debug: log response status
    if (!res.ok) {
      console.error(`[API] Request failed with status ${res.status}:`, {
        method,
        path,
        status: res.status,
        statusText: res.statusText,
      });
    }
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { data: null as unknown as T, error: err.error ?? `HTTP ${res.status}` };
    }
    
    const data: T = await res.json();
    return { data, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    console.error("[API] Exception in apiFetch:", msg);
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
  user_id: string;
  title: string;
  category: string;
  status: "pending_verification" | "approved" | "rejected" | "in_progress" | "resolved";
  location: string;
  timestamp: string;
  reporter: string;
  avatar: string;
  description: string;
  image_url: string | null;
  verified: boolean;
  comments: number;
  upvotes: number;
  is_anonymous?: boolean;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  resolved_by?: string;
  resolved_at?: string;
  admin_notes?: string;
}

export interface Announcement {
  id: number;
  title: string;
  category: string;
  date: string;
  author: string;
  author_role: string;
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

export interface Message {
  id: number;
  conversation_id: string;
  sender_id: string;
  sender?: { id: string; name: string; avatar: string };
  content: string;
  created_at: string;
  edited_at?: string;
  is_edited: boolean;
}

export interface ConversationParticipant {
  user_id: string;
  role: "user" | "admin" | "patrol";
}

export interface Conversation {
  id: string;
  participant?: { id: string; name: string; avatar: string };
  lastMessage?: Message | null;
  participantCount: number;
  created_at?: string;
  updated_at?: string;
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
  assignedTo?: string | null;
  acceptedBy?: string | null;
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

export interface PatrolAssignment {
  id: string;
  report_id: string;
  assigned_patrol_id: string;
  assigned_by_admin_id: string;
  assignment_status: "pending" | "accepted" | "declined";
  assigned_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatrolComment {
  id: string;
  report_id: string;
  author_id: string;
  comment_text: string;
  author_role: "patrol" | "admin" | "resident";
  created_at: string;
  updated_at: string;
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
  id?: string;
  first_name: string;
  last_name: string;
  avatar: string;
  barangay: string;
  role: string;
  points: number;
  reports: number;
  badge: string;
  verified: boolean;
  joined: string;
  bio: string;
  email?: string;
  phone?: string;
  email_verified?: boolean;
  verification_status?: string;
  id_document_url?: string;
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

export async function fetchUserUpvotes(): Promise<ApiResponse<string[]>> {
  return apiFetch<string[]>("/user/upvotes", {}, true);
}

export async function fetchAnnouncements(): Promise<ApiResponse<Announcement[]>> {
  return apiFetch<Announcement[]>("/announcements");
}

export async function fetchLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
  return apiFetch<LeaderboardEntry[]>("/leaderboard");
}

export async function fetchAllUsers(): Promise<ApiResponse<UserProfile[]>> {
  return apiFetch<UserProfile[]>("/users");
}

export async function fetchVerifiedUsers(): Promise<ApiResponse<UserProfile[]>> {
  return apiFetch<UserProfile[]>("/verified-users");
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

export async function fetchActiveCase(patrolId?: string): Promise<ApiResponse<PatrolActiveCase | null>> {
  const params = patrolId ? `?patrolId=${encodeURIComponent(patrolId)}` : "";
  return apiFetch<PatrolActiveCase | null>(`/patrol/active-case${params}`);
}

export async function fetchAssignedReports(): Promise<ApiResponse<PatrolCaseSummary[]>> {
  return apiFetch<PatrolCaseSummary[]>("/patrol/assigned");
}

export async function fetchSubmittedPatrolReports(): Promise<ApiResponse<PatrolCaseSummary[]>> {
  return apiFetch<PatrolCaseSummary[]>("/patrol/submitted", {}, true);
}

export async function fetchPatrolHistory(): Promise<ApiResponse<PatrolHistoryEntry[]>> {
  return apiFetch<PatrolHistoryEntry[]>("/patrol/history");
}

export async function fetchPatrolStats(): Promise<ApiResponse<PatrolOfficerStats | null>> {
  return apiFetch<PatrolOfficerStats>("/patrol/stats");
}

export async function fetchAdminAssignedReports(patrolUserId: string): Promise<ApiResponse<PatrolCaseSummary[]>> {
  return apiFetch<PatrolCaseSummary[]>(`/patrol/admin-assigned/${patrolUserId}`, {}, true);
}

export async function fetchAvailableReports(): Promise<ApiResponse<PatrolCaseSummary[]>> {
  return apiFetch<PatrolCaseSummary[]>("/patrol/available", {}, true);
}

export async function fetchPatrolCase(caseId: string): Promise<ApiResponse<PatrolCaseSummary>> {
  return apiFetch<PatrolCaseSummary>(`/patrol/case/${caseId}`, {}, true);
}

export async function fetchReportComments(reportId: string): Promise<ApiResponse<PatrolComment[]>> {
  return apiFetch<PatrolComment[]>(`/reports/${reportId}/patrol-comments`, {}, true);
}

export async function fetchUserProfile(userId: string): Promise<ApiResponse<UserProfile | null>> {
  return apiFetch<UserProfile | null>(`/profile/${userId}`);
}

// ─── Mutation API functions ───────────────────────────────────────────────────

/** Create a new community report (requires authentication) */
export async function createReport(data: {
  title: string;
  description: string;
  category: string;
  location: string;
  location_lat?: number;
  location_lng?: number;
  image_url?: string | null;
  admin_notes?: string;
}): Promise<ApiResponse<Report>> {
  // Ensure user is authenticated before creating report
  const accessToken = await getAccessToken();
  if (!accessToken) {
    const errorMsg = "You must be logged in to create a report";
    console.error("[API] createReport -", errorMsg);
    return { data: null as unknown as Report, error: errorMsg };
  }
  
  console.log("[API] Creating report with authenticated user", { lat: data.location_lat, lng: data.location_lng });
  return apiFetch<Report>("/reports", { method: "POST", body: JSON.stringify(data) }, true);
}

/** Update a report status or verification (requires patrol/admin role) */
export async function updateReportStatus(
  id: string,
  data: {
    status?: "pending" | "accepted" | "in_progress" | "resolved" | "rejected";
    verified?: boolean;
  }
): Promise<ApiResponse<Report>> {
  return apiFetch<Report>(`/reports/${id}`, { method: "PUT", body: JSON.stringify(data) }, true);
}

/** Update a report (status, etc.) */
export async function updateReport(
  id: string,
  data: Partial<Report>
): Promise<ApiResponse<Report>> {
  return apiFetch<Report>(`/reports/${id}`, { method: "PUT", body: JSON.stringify(data) }, true);
}

/** Delete a report */
export async function deleteReport(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch<{ success: boolean }>(`/reports/${id}`, { method: "DELETE" });
}

/** Admin: Get pending verification reports */
export async function fetchPendingReports(): Promise<ApiResponse<Report[]>> {
  return apiFetch<Report[]>(`/admin/reports/pending`);
}

/** Admin: Approve a pending report */
export async function approveReport(
  id: string
): Promise<ApiResponse<{ success: boolean; message: string; report: Report }>> {
  return apiFetch<{ success: boolean; message: string; report: Report }>(
    `/admin/reports/${id}/approve`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

/** Admin: Reject a pending report */
export async function rejectReport(
  id: string,
  reason: string
): Promise<ApiResponse<{ success: boolean; message: string; report: Report }>> {
  return apiFetch<{ success: boolean; message: string; report: Report }>(
    `/admin/reports/${id}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) }
  );
}

/** Admin: Toggle anonymous flag on a report */
export async function toggleAnonymousReport(
  id: string
): Promise<ApiResponse<{ success: boolean; reportId: string; isAnonymous: boolean; message: string }>> {
  return apiFetch<{ success: boolean; reportId: string; isAnonymous: boolean; message: string }>(
    `/admin/reports/${id}/toggle-anonymous`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

/** Admin: Get submitted patrol resolutions awaiting verification */
export async function fetchSubmittedReports(): Promise<ApiResponse<Report[]>> {
  return apiFetch<Report[]>(`/admin/patrol-resolutions/pending`);
}

/** Admin: Approve a submitted patrol resolution */
export async function approvePatrolResolution(
  id: string,
  adminNotes?: string
): Promise<ApiResponse<{ success: boolean; message: string; report: Report }>> {
  return apiFetch<{ success: boolean; message: string; report: Report }>(
    `/admin/patrol-resolutions/${id}/verify`,
    { method: "POST", body: JSON.stringify({ approved: true, adminNotes }) }
  );
}

/** Admin: Reject a submitted patrol resolution */
export async function rejectPatrolResolution(
  id: string,
  adminNotes?: string
): Promise<ApiResponse<{ success: boolean; message: string; report: Report }>> {
  return apiFetch<{ success: boolean; message: string; report: Report }>(
    `/admin/patrol-resolutions/${id}/verify`,
    { method: "POST", body: JSON.stringify({ approved: false, adminNotes }) }
  );
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
  author_role: string;
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

// ─── Chat Functions ───────────────────────────────────────────────────────────

/** Create or get existing conversation */
export async function createConversation(
  participant_id: string
): Promise<ApiResponse<{ id: string; created: boolean }>> {
  return apiFetch<{ id: string; created: boolean }>(
    "/conversations",
    { method: "POST", body: JSON.stringify({ participant_id }) },
    true
  );
}

/** Fetch all conversations for current user */
export async function getConversations(): Promise<ApiResponse<Conversation[]>> {
  return apiFetch<Conversation[]>("/conversations", {}, true);
}

/** Fetch messages in a conversation */
export async function getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
  return apiFetch<Message[]>(`/conversations/${conversationId}/messages`, {}, true);
}

/** Send a message to a conversation */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ApiResponse<Message>> {
  return apiFetch<Message>(
    `/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
    true
  );
}

// ─── Patrol Functions ─────────────────────────────────────────────────────────

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

/** Resolve a patrol case and log it to history */
export async function resolvePatrolCase(
  caseId: string,
  resolutionNotes?: string,
  evidenceUrl?: string,
  category?: string
): Promise<ApiResponse<{ success: boolean; message: string; report: any }>> {
  return apiFetch(
    "/patrol/history",
    {
      method: "POST",
      body: JSON.stringify({
        caseId,
        resolutionNotes,
        evidenceUrl,
        category,
      }),
    },
    true
  );
}

/** Admin assigns a report to a patrol officer */
export async function assignPatrolToReport(
  reportId: string,
  patrolUserId: string,
  adminNote?: string
): Promise<ApiResponse<PatrolAssignment>> {
  return apiFetch<PatrolAssignment>(
    "/patrol/assign-report",
    {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, patrol_user_id: patrolUserId, admin_note: adminNote }),
    },
    true
  );
}

/** Patrol officer self-assigns an available report */
export async function selfAssignReport(reportId: string): Promise<ApiResponse<PatrolAssignment>> {
  return apiFetch<PatrolAssignment>(
    "/patrol/self-assign-report",
    { method: "POST", body: JSON.stringify({ report_id: reportId }) },
    true
  );
}

/** Patrol officer accepts an admin assignment */
export async function acceptPatrolAssignment(assignmentId: string): Promise<ApiResponse<PatrolAssignment>> {
  return apiFetch<PatrolAssignment>(
    `/patrol/assignments/${assignmentId}/accept`,
    { method: "POST" },
    true
  );
}

/** Patrol officer declines an admin assignment */
export async function declinePatrolAssignment(assignmentId: string): Promise<ApiResponse<PatrolAssignment>> {
  return apiFetch<PatrolAssignment>(
    `/patrol/assignments/${assignmentId}/decline`,
    { method: "POST" },
    true
  );
}

/** Patrol officer accepts a case (available or admin-assigned) */
export async function acceptPatrolCase(caseId: string, patrolId?: string): Promise<ApiResponse<PatrolActiveCase>> {
  const params = patrolId ? `?patrolId=${encodeURIComponent(patrolId)}` : "";
  return apiFetch<PatrolActiveCase>(
    `/patrol/cases/${caseId}/accept${params}`,
    { method: "POST" },
    true
  );
}

/** Patrol officer marks case as in_progress (responding) */
export async function startPatrolResponse(caseId: string): Promise<ApiResponse<{ success: boolean; message: string; report: any }>> {
  return apiFetch(
    `/patrol/cases/${caseId}/start-responding`,
    { method: "POST" },
    true
  );
}

/** Patrol officer cancels/unassigns a case */
export async function cancelPatrolCase(caseId: string, patrolId?: string): Promise<ApiResponse<{ success: boolean }>> {
  const params = patrolId ? `?patrolId=${encodeURIComponent(patrolId)}` : "";
  return apiFetch<{ success: boolean }>(
    `/patrol/cases/${caseId}/cancel${params}`,
    { method: "POST" },
    true
  );
}

/** Admin verifies patrol resolution (approves or rejects) */
export async function verifyPatrolResolution(
  reportId: string,
  approved: boolean,
  adminNotes?: string
): Promise<ApiResponse<{ success: boolean; message: string; newStatus: string; report: any }>> {
  return apiFetch(
    `/admin/patrol-resolutions/${reportId}/verify`,
    {
      method: "POST",
      body: JSON.stringify({ approved, adminNotes }),
    },
    true
  );
}

/** Update report patrol status */
export async function updateReportPatrolStatus(
  reportId: string,
  status: "pending" | "accepted" | "in_progress" | "completed" | "escalated"
): Promise<ApiResponse<Report>> {
  return apiFetch<Report>(
    `/reports/${reportId}/patrol-status`,
    { method: "PUT", body: JSON.stringify({ patrol_status: status }) },
    true
  );
}

/** Add a patrol comment to a report */
export async function addPatrolComment(
  reportId: string,
  commentText: string,
  authorRole: "patrol" | "admin"
): Promise<ApiResponse<PatrolComment>> {
  return apiFetch<PatrolComment>(
    "/patrol-comments",
    {
      method: "POST",
      body: JSON.stringify({ report_id: reportId, comment_text: commentText, author_role: authorRole }),
    },
    true
  );
}

/** Update user profile */
export async function updateProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> {
  return apiFetch<UserProfile>(`/profile/${userId}`, { method: "PUT", body: JSON.stringify(data) });
}

// ─── Authentication API ───────────────────────────────────────────────────────

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  barangay: string;
  role?: "resident" | "admin" | "patrol";
}

export interface RegisterResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  message: string;
}

export interface OtpVerifyData {
  email: string;
  otp: string;
  idPhotoUrl?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  userId?: string;
  email?: string;
}

export interface ResendOtpData {
  email: string;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
}

export interface GenerateOtpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  barangay: string;
  role?: "resident" | "admin" | "patrol";
  idPhotoUrl?: string;
}

export interface GenerateOtpResponse {
  success: boolean;
  email: string;
  message: string;
}

/** Register a new user */
export async function registerUser(data: RegisterData): Promise<ApiResponse<RegisterResponse>> {
  return apiFetch<RegisterResponse>("/register", { method: "POST", body: JSON.stringify(data) }, false);
}

/** Generate OTP and create pending registration (Step 3) */
export async function generateOtp(data: GenerateOtpData): Promise<ApiResponse<GenerateOtpResponse>> {
  return apiFetch<GenerateOtpResponse>("/generate-otp", { method: "POST", body: JSON.stringify(data) }, false);
}

/** Verify OTP code */
export async function verifyOtp(data: OtpVerifyData): Promise<ApiResponse<OtpVerifyResponse>> {
  return apiFetch<OtpVerifyResponse>("/verify-otp", { method: "POST", body: JSON.stringify(data) }, false);
}

/** Resend OTP code */
export async function resendOtp(data: ResendOtpData): Promise<ApiResponse<ResendOtpResponse>> {
  return apiFetch<ResendOtpResponse>("/resend-otp", { method: "POST", body: JSON.stringify(data) }, false);
}

/** Check if user is verified (exists in user_profiles table) */
export async function checkUserVerification(userId: string): Promise<ApiResponse<{ verified: boolean }>> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (error) {
      // User doesn't exist in user_profiles (still pending verification)
      console.log(`[API] User ${userId} not verified - not in user_profiles`);
      return { data: { verified: false }, error: null };
    }

    // User exists in user_profiles - they are verified
    console.log(`[API] User ${userId} verified - found in user_profiles`);
    return { data: { verified: true }, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to check verification";
    console.error("[API] Verification check error:", msg);
    return { data: { verified: false }, error: msg };
  }
}

/** Approve a pending user (move from pending_verification to user_profiles) */
export async function approveUser(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return apiFetch<{ success: boolean; message: string }>(`/admin/approve-user/${userId}`, { method: "POST" }, false);
}

/** Reject a pending user (remove from pending_verification) */
export async function rejectUser(userId: string, reason?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return apiFetch<{ success: boolean; message: string }>(`/admin/reject-user/${userId}`, { method: "POST", body: JSON.stringify({ reason }) }, false);
}

/** Upload file to Cloudinary */
export async function uploadToCloudinary(file: File): Promise<ApiResponse<{ url: string; publicId: string }>> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "cars-g-uploads");
    formData.append("cloud_name", "dzqtdl5aa");

    const response = await fetch("https://api.cloudinary.com/v1_1/dzqtdl5aa/image/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return { 
        data: null as unknown as { url: string; publicId: string }, 
        error: error.error?.message || "Upload failed" 
      };
    }

    const data = await response.json();
    return { 
      data: { 
        url: data.secure_url, 
        publicId: data.public_id 
      }, 
      error: null 
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload error";
    console.error("[API] Cloudinary upload error:", msg);
    return { data: null as unknown as { url: string; publicId: string }, error: msg };
  }
}

/** Adjust user leaderboard points (admin only) */
export async function adjustLeaderboardPoints(data: {
  userId: string;
  pointsDelta: number;
  reason?: string;
}): Promise<ApiResponse<any>> {
  return apiFetch<any>("/leaderboard/adjust-points", { method: "PUT", body: JSON.stringify(data) });
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
