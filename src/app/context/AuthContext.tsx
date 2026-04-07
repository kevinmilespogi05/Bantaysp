/**
 * AuthContext — Role-Based Access Control
 *
 * Current state: mock session-based auth for UI development.
 * Production migration: replace `login()` body with a real API call
 * (e.g. POST /api/auth/login) and persist the JWT in a secure cookie
 * or localStorage. The AuthUser shape intentionally mirrors what the
 * backend will return so the rest of the UI needs zero changes.
 */

import { createContext, useContext, useState, ReactNode } from "react";
import { useNavigate } from "react-router";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "resident" | "admin" | "patrol";

export interface AuthUser {
  id: string;
  name: string;
  avatar: string;   // initials used as fallback avatar
  role: UserRole;
  barangay: string;
  email: string;
  // Patrol-specific fields
  unit?: string;
  badgeNumber?: string;
  rank?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

// ─── Mock user store (replace with API responses in production) ───────────────

const MOCK_USERS: Record<string, AuthUser & { password: string }> = {
  "juan.delacruz@email.com": {
    id: "USR-001",
    name: "Juan dela Cruz",
    avatar: "JD",
    role: "resident",
    barangay: "Brgy. San Pablo",
    email: "juan.delacruz@email.com",
    password: "resident123",
  },
  "ebautista@castillejos.gov.ph": {
    id: "ADM-001",
    name: "Kapitan Ernesto Bautista",
    avatar: "EB",
    role: "admin",
    barangay: "Municipal Hall",
    email: "ebautista@castillejos.gov.ph",
    password: "admin123",
  },
  "rdelarosa@pnp.gov.ph": {
    id: "PAT-001",
    name: "Ramon Dela Rosa",
    avatar: "RD",
    role: "patrol",
    barangay: "Brgy. San Pablo Sector",
    email: "rdelarosa@pnp.gov.ph",
    unit: "Unit 3 – Alpha",
    badgeNumber: "PNP-8821",
    rank: "Police Officer 1",
    shiftStart: "06:00",
    shiftEnd: "18:00",
    password: "patrol123",
  },
};

// Exported for PatrolLayout and other places that need patrol user data
export const patrolUserData: AuthUser = {
  id: "PAT-001",
  name: "Ramon Dela Rosa",
  avatar: "RD",
  role: "patrol",
  barangay: "Brgy. San Pablo Sector",
  email: "rdelarosa@pnp.gov.ph",
  unit: "Unit 3 – Alpha",
  badgeNumber: "PNP-8821",
  rank: "Police Officer 1",
  shiftStart: "06:00",
  shiftEnd: "18:00",
};

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  /** Currently authenticated user */
  user: AuthUser;
  /** Whether the auth state is being resolved (e.g., checking session) */
  isLoading: boolean;
  /**
   * Simulate login. In production, replace body with real API call.
   * Returns an error string on failure, or null on success.
   */
  login: (email: string, password: string) => Promise<string | null>;
  /** Clear session and redirect to landing */
  logout: () => void;
  // Convenience role booleans
  isPatrol: boolean;
  isAdmin: boolean;
  isResident: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

const DEFAULT_USER: AuthUser = MOCK_USERS["juan.delacruz@email.com"];

export function AuthProvider({ children }: { children: ReactNode }) {
  // In production: initialise from stored JWT/session check
  const [user, setUser] = useState<AuthUser>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Mock login — swap for a real fetch() in production.
   * POST /api/auth/login → { user: AuthUser, token: string }
   */
  const login = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 600));

    const found = MOCK_USERS[email.toLowerCase()];
    if (!found || found.password !== password) {
      setIsLoading(false);
      return "Invalid email or password.";
    }

    const { password: _omit, ...authUser } = found;
    setUser(authUser);
    setIsLoading(false);
    return null; // success
  };

  const logout = () => {
    setUser(DEFAULT_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isPatrol: user.role === "patrol",
        isAdmin: user.role === "admin",
        isResident: user.role === "resident",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * useRoleNavigator — kept for backward compatibility with the Login page
 * and any other place that calls switchRole(). Maps role → default route.
 *
 * In production this should be handled by the login response (the API
 * returns the user's role and you navigate accordingly).
 */
export function useRoleNavigator() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  /**
   * Quick-switch helper used by the Login/Register pages.
   * Pass the credentials; on success the AuthContext updates `user`
   * and we navigate to the correct default route.
   */
  const switchRole = async (role: UserRole) => {
    // Map role → default mock credential so existing buttons still work
    const credMap: Record<UserRole, { email: string; password: string }> = {
      resident: { email: "juan.delacruz@email.com", password: "resident123" },
      admin: { email: "ebautista@castillejos.gov.ph", password: "admin123" },
      patrol: { email: "rdelarosa@pnp.gov.ph", password: "patrol123" },
    };
    await login(credMap[role].email, credMap[role].password);
    if (role === "patrol") navigate("/app/patrol/dashboard");
    else if (role === "admin") navigate("/app/admin");
    else navigate("/app/dashboard");
  };

  return { switchRole, currentRole: user.role };
}
