import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

/**
 * Redirect component that routes to the appropriate dashboard based on user role.
 * Handles non-blocking auth: waits for role enrichment before deciding where to route.
 * 
 * Admin → /app/admin
 * Patrol → /app/patrol/dashboard
 * Resident → /app/dashboard
 */
export function RoleBasedRedirect() {
  const { user, isLoading, isEnriching } = useAuth();

  console.log("[RoleBasedRedirect] Evaluating route redirect", {
    userRole: user.role,
    isLoading,
    isEnriching,
  });

  // Show loading screen while auth data is being fetched
  if (isLoading || isEnriching) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin always goes to admin dashboard
  if (user.role === "admin") {
    console.log("[RoleBasedRedirect] Redirecting admin to /app/admin");
    return <Navigate to="/app/admin" replace />;
  }

  // Patrol officers go to patrol dashboard
  if (user.role === "patrol") {
    console.log("[RoleBasedRedirect] Redirecting patrol to /app/patrol/dashboard");
    return <Navigate to="/app/patrol/dashboard" replace />;
  }

  // Default to resident dashboard
  console.log("[RoleBasedRedirect] Redirecting resident to /app/dashboard");
  return <Navigate to="/app/dashboard" replace />;
}
