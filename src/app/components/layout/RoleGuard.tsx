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
  const { user } = useAuth();

  if (!allow.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
