/**
 * RoleGuard — Route-level access control component.
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
  const { user, isLoading } = useAuth();

  // Show loading screen while auth is initializing to prevent premature redirects
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

  if (!allow.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
