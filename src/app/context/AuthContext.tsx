/**
 * AuthContext — Role-Based Access Control
 *
 * Auth is now backed by Supabase Auth. The `role` field is stored in
 * the user's `user_metadata` (set at sign-up or via the Supabase dashboard).
 *
 * Expected user_metadata shape:
 *   { name, role, barangay, avatar, unit?, badgeNumber?, rank?, shiftStart?, shiftEnd? }
 *
 * The mock login fallback is kept behind DEV_MOCK_AUTH for local UI work
 * when Supabase isn't configured.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "resident" | "admin" | "patrol";

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  role: UserRole;
  barangay: string;
  // Patrol-specific fields
  unit?: string;
  badgeNumber?: string;
  rank?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

// ─── Helper: map Supabase User → AuthUser ────────────────────────────────────

function mapSupabaseUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const firstName = meta.first_name ?? (meta.name ? meta.name.split(" ")[0] : "Unknown");
  const lastName = meta.last_name ?? (meta.name ? meta.name.split(" ").slice(1).join(" ") : "");
  const fullName = `${firstName}${lastName ? " " + lastName : ""}`;
  return {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    avatar: meta.avatar ?? (fullName ? fullName.slice(0, 2).toUpperCase() : "?"),
    role: (meta.role as UserRole) ?? "resident",
    barangay: meta.barangay ?? "",
    unit: meta.unit,
    badgeNumber: meta.badgeNumber,
    rank: meta.rank,
    shiftStart: meta.shiftStart,
    shiftEnd: meta.shiftEnd,
  };
}

// Debug: log what we extract from session metadata
function debugSessionMetadata(user: User): void {
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  console.log("[AuthContext] Session user_metadata:", {
    userId: user.id,
    email: user.email,
    role: meta.role,
    fullMetadata: meta,
  });
}

// ─── Helper: Fetch user profile from database and merge with session data ─────

async function enrichUserWithDatabaseProfile(sessionUser: User): Promise<AuthUser> {
  const mappedUser = mapSupabaseUser(sessionUser);
  
  // Debug: log what we got from session
  debugSessionMetadata(sessionUser);
  
  try {
    // Create a timeout promise that rejects after 3 seconds
    const queryPromise = supabase
      .from("user_profiles")
      .select("*")
      .eq("id", sessionUser.id)
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database query timeout (3s)")), 3000)
    );

    const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error || !profile) {
      if (error?.code !== "PGRST116") {
        console.warn("[AuthContext] Database query failed, trusting session metadata:", {
          userId: sessionUser.id,
          error: error?.message,
        });
      }
      return mappedUser;
    }

    console.log("[AuthContext] Database profile fetched successfully:", {
      userId: sessionUser.id,
      dbRole: profile.role,
    });

    // Parse patrol metadata from bio field if it exists
    let patrolMetadata: Record<string, string> = {};
    if (profile.bio) {
      try {
        patrolMetadata = typeof profile.bio === "string" ? JSON.parse(profile.bio) : profile.bio;
      } catch (e) {
        // If bio is not JSON, ignore it
      }
    }

    // Merge: session role takes priority if it exists, otherwise use database
    const finalRole = (mappedUser.role !== "resident") ? mappedUser.role : (profile.role as UserRole);
    if (finalRole !== mappedUser.role) {
      console.log("[AuthContext] Using database role instead of session role:", {
        sessionRole: mappedUser.role,
        dbRole: finalRole,
      });
    }

    // Return enriched user with best available data
    return {
      ...mappedUser,
      role: finalRole,
      barangay: profile.barangay || mappedUser.barangay,
      unit: patrolMetadata.unit || mappedUser.unit,
      badgeNumber: patrolMetadata.badgeNumber || mappedUser.badgeNumber,
      rank: patrolMetadata.rank || mappedUser.rank,
      shiftStart: patrolMetadata.shiftStart || mappedUser.shiftStart,
      shiftEnd: patrolMetadata.shiftEnd || mappedUser.shiftEnd,
    };
  } catch (err) {
    console.warn("[AuthContext] Error enriching user, using session metadata:", {
      userId: sessionUser.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return mappedUser;
  }
}

// ─── Default unauthenticated placeholder ────────────────────────────────────

const GUEST_USER: AuthUser = {
  id: "",
  first_name: "Guest",
  last_name: "",
  avatar: "G",
  role: "resident",
  barangay: "",
};

// Exported for PatrolLayout and other places that need patrol user data.
// Will be replaced once the logged-in user has role === "patrol".
export const patrolUserData: AuthUser = {
  id: "PAT-001",
  first_name: "Ramon",
  last_name: "Dela Rosa",
  avatar: "RD",
  role: "patrol",
  barangay: "Brgy. San Pablo Sector",
  unit: "Unit 3 – Alpha",
  badgeNumber: "PNP-8821",
  rank: "Police Officer 1",
  shiftStart: "06:00",
  shiftEnd: "18:00",
};

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: AuthUser;
  session: Session | null;
  isLoading: boolean;
  /**
   * Sign in with email + password via Supabase Auth.
   * Returns an error string on failure, or null on success.
   */
  login: (email: string, password: string) => Promise<string | null>;
  /** Sign out and redirect to landing */
  logout: () => void;
  // Convenience role booleans
  isPatrol: boolean;
  isAdmin: boolean;
  isResident: boolean;
  isAuthenticated: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(GUEST_USER);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session (Supabase handles this automatically)
  useEffect(() => {
    let isMounted = true;

    console.log("[AuthContext] useEffect: mount - starting initialization");

    // Get the initial session and enrich with database profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) {
        console.log("[AuthContext] Component unmounted before session restore");
        return;
      }

      console.log("[AuthContext] Session restored:", {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      setSession(session);
      if (session?.user) {
        // Fetch full user data from database to ensure role is correct
        const enrichedUser = await enrichUserWithDatabaseProfile(
          session.user
        );
        if (isMounted) {
          console.log("[AuthContext] Setting enriched user:", {
            role: enrichedUser.role,
            id: enrichedUser.id,
          });
          setUser(enrichedUser);
        }
      } else {
        if (isMounted) {
          console.log("[AuthContext] No session found, setting guest user");
          setUser(GUEST_USER);
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error("[AuthContext] Error getting initial session:", err);
      if (isMounted) {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (!isMounted) {
          return;
        }

        console.log("[AuthContext] Auth state changed:", {
          event: _event,
          hasSession: !!session,
          userId: session?.user?.id,
        });

        setSession(session);
        if (session?.user) {
          // Fetch full user data from database to ensure role persists
          const enrichedUser = await enrichUserWithDatabaseProfile(
            session.user
          );
          if (isMounted) {
            console.log("[AuthContext] Auth change: setting enriched user:", {
              role: enrichedUser.role,
              id: enrichedUser.id,
            });
            setUser(enrichedUser);
          }
        } else {
          if (isMounted) {
            console.log("[AuthContext] Auth change: setting guest user");
            setUser(GUEST_USER);
          }
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      console.log("[AuthContext] useEffect: cleanup");
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    // ✅ Login succeeded with Supabase Auth
    // Now check if user is verified (exists in user_profiles)
    const session = await supabase.auth.getSession();
    if (!session.data.session?.user) {
      setIsLoading(false);
      return "Login succeeded but no session was created";
    }

    // Import the verification check
    const { checkUserVerification } = await import("../services/api");
    const { data: verificationData } = await checkUserVerification(session.data.session.user.id);

    if (!verificationData?.verified) {
      // User is not yet verified - log them back out
      await supabase.auth.signOut();
      setIsLoading(false);
      return "Your account is pending admin verification. You will be notified once approved.";
    }

    setIsLoading(false);
    return null; // success — onAuthStateChange will update the user state
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(GUEST_USER);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        login,
        logout,
        isPatrol: user.role === "patrol",
        isAdmin: user.role === "admin",
        isResident: user.role === "resident",
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * useRoleNavigator — kept for backward compatibility with the Login page
 * and any other place that calls switchRole(). Maps role → default route.
 */
export function useRoleNavigator() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const navigateByRole = (role: UserRole) => {
    if (role === "patrol") navigate("/app/patrol/dashboard");
    else if (role === "admin") navigate("/app/admin");
    else navigate("/app/dashboard");
  };

  return { navigateByRole, currentRole: user.role };
}

