import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Loader } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallbackUrl?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Enforces authentication and authorization at the route level.
 * 
 * Features:
 * - Redirects unauthenticated users to login
 * - Checks user role against required roles
 * - Shows loading spinner during session restoration
 * - Logs unauthorized access attempts
 * - Prevents direct URL access to protected routes
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  fallbackUrl = "/login",
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, session, isLoading, isEnriching } = useAuth();

  useEffect(() => {
    // Still loading session or enriching user data
    if (isLoading || isEnriching) {
      console.log("[ProtectedRoute] Loading session...");
      return;
    }

    // Not authenticated - redirect to login
    if (!session || !user) {
      console.warn("[ProtectedRoute] ⚠️ Unauthorized access attempt - No session found. Redirecting to login.");
      navigate(fallbackUrl, { replace: true });
      return;
    }

    // Authenticated but role not allowed
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        console.warn(
          `[ProtectedRoute] ⚠️ Access Denied - User role '${user.role}' not in required roles: ${requiredRoles.join(", ")}`
        );
        navigate("/access-denied", { replace: true });
        return;
      }
    }

    console.log(`[ProtectedRoute] ✅ Access granted for user ${user.id} with role '${user.role}'`);
  }, [user, session, isLoading, isEnriching, navigate, requiredRoles, fallbackUrl]);

  // Show loading spinner while restoring session or enriching user data
  if (isLoading || isEnriching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-gray-600" />
          <p className="text-gray-600 text-sm">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - don't render children
  if (!session || !user) {
    return null;
  }

  // Role check failed - don't render children
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return null;
  }

  // All checks passed - render protected content
  return <>{children}</>;
}
