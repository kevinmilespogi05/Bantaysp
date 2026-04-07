import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { PatrolLayout } from "./components/layout/PatrolLayout";
import { RoleGuard } from "./components/layout/RoleGuard";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { CreateReportPage } from "./pages/CreateReportPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { EmergencyPage } from "./pages/EmergencyPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ChatPage } from "./pages/ChatPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminPatrolMonitoring } from "./pages/admin/AdminPatrolMonitoring";
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

  // ─── Resident & Admin App ─────────────────────────────────────
  {
    path: "/app",
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },

      // Resident-accessible routes
      { path: "dashboard",        Component: DashboardPage },
      { path: "reports",          Component: ReportsPage },
      { path: "reports/create",   Component: CreateReportPage },
      { path: "announcements",    Component: AnnouncementsPage },
      { path: "emergency",        Component: EmergencyPage },
      { path: "leaderboard",      Component: LeaderboardPage },
      { path: "profile",          Component: ProfilePage },
      { path: "chat",             Component: ChatPage },

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
    ],
  },

  // ─── Patrol App ───────────────────────────────────────────────
  // Patrol officers have their own dark UI (PatrolLayout).
  // Non-patrol users navigating here are redirected.
  {
    path: "/app/patrol",
    element: (
      <RoleGuard allow={["patrol", "admin"]} fallback="/app/dashboard">
        <PatrolLayout />
      </RoleGuard>
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
