import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { PatrolLayout } from "./components/layout/PatrolLayout";
import { RoleGuard } from "./components/layout/RoleGuard";
import { RoleBasedRedirect } from "./components/layout/RoleBasedRedirect";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { CreateReportPage } from "./pages/CreateReportPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { EmergencyPage } from "./pages/EmergencyPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ChatPage } from "./pages/ChatPage";
import { NewChatPage } from "./pages/NewChatPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminPatrolMonitoring } from "./pages/admin/AdminPatrolMonitoring";
import { AdminChatPage } from "./pages/admin/AdminChatPage";
import { PatrolDashboard } from "./pages/patrol/PatrolDashboard";
import { PatrolAssignedReports } from "./pages/patrol/PatrolAssignedReports";
import { PatrolMapView } from "./pages/patrol/PatrolMapView";
import { PatrolHistory } from "./pages/patrol/PatrolHistory";
import { PatrolCaseDetail } from "./pages/patrol/PatrolCaseDetail";
import { PatrolProfile } from "./pages/patrol/PatrolProfile";

export const router = createBrowserRouter([
  // ─── Public ───────────────────────────────────────────────────
  { path: "/",         Component: LandingPage },
  { path: "/login",    Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/access-denied", Component: AccessDeniedPage },

  // ─── Resident & Admin App ─────────────────────────────────────
  // Protected by ProtectedRoute - requires authentication
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleBasedRedirect /> },

      // Resident-accessible routes (protected from admin/patrol)
      { path: "dashboard",        element: <RoleGuard allow={["resident"]}><DashboardPage /></RoleGuard> },
      { path: "reports",          element: <RoleGuard allow={["resident"]}><ReportsPage /></RoleGuard> },
      { path: "reports/create",   element: <RoleGuard allow={["resident"]}><CreateReportPage /></RoleGuard> },
      { path: "announcements",    element: <RoleGuard allow={["resident", "admin"]}><AnnouncementsPage /></RoleGuard> },
      { path: "emergency",        element: <RoleGuard allow={["resident"]}><EmergencyPage /></RoleGuard> },
      { path: "leaderboard",      element: <RoleGuard allow={["resident"]}><LeaderboardPage /></RoleGuard> },
      { path: "profile",          Component: ProfilePage },
      { path: "chat",             Component: ChatPage },
      { path: "chat/new",         Component: NewChatPage },

      // Admin-only routes — non-admins are redirected to /app/dashboard
      {
        path: "admin",
        element: (
          <RoleGuard allow={["admin"]}>
            <AdminDashboard />
          </RoleGuard>
        ),
      },
      {
        path: "admin/patrol-monitoring",
        element: (
          <RoleGuard allow={["admin"]}>
            <AdminPatrolMonitoring />
          </RoleGuard>
        ),
      },
      {
        path: "admin/chat",
        element: (
          <RoleGuard allow={["admin"]}>
            <AdminChatPage />
          </RoleGuard>
        ),
      },
    ],
  },

  // ─── Patrol App ───────────────────────────────────────────────
  // Protected by ProtectedRoute - requires authentication and patrol/admin role
  {
    path: "/app/patrol",
    element: (
      <ProtectedRoute requiredRoles={["patrol", "admin"]}>
        <RoleGuard allow={["patrol", "admin"]} fallback="/app/dashboard">
          <PatrolLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/patrol/dashboard" replace /> },
      { path: "dashboard", Component: PatrolDashboard },
      { path: "assigned",  Component: PatrolAssignedReports },
      { path: "map",       Component: PatrolMapView },
      { path: "history",   Component: PatrolHistory },
      { path: "profile",   Component: PatrolProfile },
      { path: "case/:id",  Component: PatrolCaseDetail },
    ],
  },

  // ─── Catch-all ────────────────────────────────────────────────
  { path: "*", element: <Navigate to="/" replace /> },
]);
