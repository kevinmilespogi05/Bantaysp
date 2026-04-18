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
    allowedRoles: allow,
    isAllowed: allow.includes(user.role),
    isLoading,
    isEnriching,
    fallback,
  });

  // Show loading screen while session is being restored
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-slate-700 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading screen while enriching IF current role doesn't match allowed roles
  // This prevents admins from being redirected while their role is still loading from DB
  if (isEnriching && !allow.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-slate-700 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 text-sm">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Permission check: if user role is not allowed, redirect to fallback
  if (!allow.includes(user.role)) {
    console.log("[RoleGuard] Access denied, redirecting to fallback", { userRole: user.role, fallback });
    return <Navigate to={fallback} replace />;
  }

  console.log("[RoleGuard] Access granted");
  return <>{children}</>;
}
