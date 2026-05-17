/**
 * RoleGuard — Route-level access control component.
 *
 * Handles non-blocking auth architecture:
 * - While isLoading: shows loading screen (session not yet restored)
 * - While isEnriching AND role mismatch: shows loading screen (waiting for DB role confirmation)
 * - Once role confirmed: checks permissions and redirects if unauthorized
 *
 * Usage in routes.tsx:
 *   element: <RoleGuard allow={["admin"]}><AdminDashboard /></RoleGuard>
 *
 * Usage as wrapper:
 *   <RoleGuard allow={["admin", "patrol"]}>
 *     <SomeComponent />
 *   </RoleGuard>
 */

import { Navigate } from "react-router";
import { useAuth, type UserRole } from "../../context/AuthContext";

interface RoleGuardProps {
  /** Roles permitted to access this route / component */
  allow: UserRole[];
  /** Where to redirect unauthorized users (default: /app/dashboard) */
  fallback?: string;
  children: React.ReactNode;
}

export function RoleGuard({ allow, fallback = "/app/dashboard", children }: RoleGuardProps) {
  const { user, isLoading, isEnriching } = useAuth();

  console.log("[RoleGuard] Evaluating access control", {
    userRole: user.role,
    isRoleConfirmed: user.isRoleConfirmed,
    allowedRoles: allow,
    isAllowed: user.isRoleConfirmed ? allow.includes(user.role) : "pending",
    isLoading,
    isEnriching,
    fallback,
  });

  // ─── PHASE 1: Session Restoration ─────────────────────────────────────────
  // Session not yet restored, show loading screen
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-slate-700 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  // ─── PHASE 2: Role Confirmation (CRITICAL FIX) ────────────────────────────
  // NEVER evaluate permissions until role is confirmed from database
  // The temporary role is just a placeholder and cannot be trusted
  if (!user.isRoleConfirmed) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-slate-700 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 text-sm">Confirming your role...</p>
        </div>
      </div>
    );
  }

  // ─── PHASE 3: Permission Check (only after role confirmed) ──────────────────
  // Safe to check permissions now - role is confirmed from database
  if (!allow.includes(user.role)) {
    console.log("[RoleGuard] Access denied, redirecting to fallback", { userRole: user.role, fallback });
    return <Navigate to={fallback} replace />;
  }

  // ─── PHASE 4: Access Granted ──────────────────────────────────────────────
  console.log("[RoleGuard] Access granted");
  return <>{children}</>;
}
