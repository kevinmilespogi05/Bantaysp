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
    // ─── PHASE 1: Session Restoration (highest priority) ───────────────────────
    // Still waiting for Supabase session restore
    if (isLoading) {
      console.log("[ProtectedRoute] Restoring session...");
      return;
    }

    // Session restore complete but no session found
    if (!session || !user) {
      console.warn("[ProtectedRoute] ⚠️ Unauthorized access attempt - No session found. Redirecting to login.");
      navigate(fallbackUrl, { replace: true });
      return;
    }

    // ─── PHASE 2: Check Banned Status (before role confirmation) ───────────────
    // Block banned accounts immediately
    if ((user as any).status === "banned") {
      console.warn(`[ProtectedRoute] ⚠️ Access denied - banned user ${user.id}`);
      navigate("/access-denied", { replace: true });
      return;
    }

    // ─── PHASE 3: Role Confirmation Gate (CRITICAL FIX) ────────────────────────
    // NEVER check roles until confirmed from database
    // The temporary "resident" role during session restore is not trustworthy
    if (!user.isRoleConfirmed) {
      console.log("[ProtectedRoute] Waiting for role confirmation from database...", {
        userId: user.id,
        tempRole: user.role,
        requiredRoles,
      });
      return; // Don't render, don't redirect - just wait for confirmation
    }

    // ─── PHASE 4: Role Authorization Check (only after confirmation) ────────────
    // Now we can safely check if the confirmed role is allowed
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        console.warn(
          `[ProtectedRoute] ⚠️ Access Denied - User role '${user.role}' not in required roles: ${requiredRoles.join(", ")}`
        );
        navigate("/access-denied", { replace: true });
        return;
      }
    }

    console.log(`[ProtectedRoute] ✅ Access granted for user ${user.id} with confirmed role '${user.role}'`);
  }, [user, session, isLoading, isEnriching, navigate, requiredRoles, fallbackUrl]);

  // ─── RENDER: Phase-based loading gates ─────────────────────────────────────

  // Phase 1: Session not yet restored
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-gray-600" />
          <p className="text-gray-600 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Session restored but no active session found
  if (!session || !user) {
    return null;
  }

  // ─── PHASE 3: Role Not Yet Confirmed (CRITICAL FIX)
  // This is the key fix: Show spinner until role is confirmed from database
  // Never render children or redirect when role is unconfirmed
  if (!user.isRoleConfirmed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-gray-600" />
          <p className="text-gray-600 text-sm">Confirming your permissions...</p>
        </div>
      </div>
    );
  }

  // Phase 4: Role check has been done
  // If we reach here with wrong role, the navigate() in useEffect would have fired already
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return null;
  }

  // All checks passed - render protected content
  return <>{children}</>;
}
