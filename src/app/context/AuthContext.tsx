/**
 * AuthContext — Role-Based Access Control (Non-Blocking Architecture)
 *
 * Auth is backed by Supabase Auth. The `role` field is stored in the
 * user_profiles table (database) — this is the single source of truth.
 *
 * Architecture:
 * 1. User logs in → Supabase Auth creates session
 * 2. Immediately set user from session data (non-blocking)
 * 3. In background: fetch user_profiles for role + metadata
 * 4. Update user state when profile arrives
 * 5. UI renders immediately; role loads in background
 *
 * This prevents UI blocking and ensures responsive experience even if DB is slow.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import * as roleCache from "@/lib/roleCache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "resident" | "admin" | "patrol";

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  role: UserRole;
  barangay: string;
  status: "active" | "banned";
  /**
   * CRITICAL: Track whether role is confirmed from database or still pending.
   * 
   * isRoleConfirmed = false: Role is temporary (default "resident" during session restore)
   * isRoleConfirmed = true: Role is confirmed from database and can be trusted
   * 
   * Permission checks must WAIT until isRoleConfirmed = true to prevent false redirects.
   */
  isRoleConfirmed: boolean;
}

// ─── Helper: Create base user from Supabase User (non-blocking) ────────────────

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
    role: "resident", // Temporary default - role is NOT yet confirmed
    barangay: meta.barangay ?? "",
    status: "active",
    isRoleConfirmed: false, // CRITICAL: Mark role as unconfirmed (will be confirmed by enrichment)
  };
}

// ─── Helper: Enrich user profile from database (background, non-blocking) ──────

async function enrichUserWithDatabaseProfile(
  sessionUser: User,
  signal?: AbortSignal
): Promise<AuthUser | null> {
  const baseUser = mapSupabaseUser(sessionUser);
  
  try {
    if (signal?.aborted) {
      console.log("[AuthContext] Enrichment aborted");
      return null;
    }

    console.log("[AuthContext] Starting background database enrichment:", {
      userId: sessionUser.id,
    });

    // Get access token for authenticated request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.warn("[AuthContext] No session token available for enrichment");
      return null;
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Call backend API to fetch profile (with 5-second timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `${BACKEND_URL}/auth/profile/${sessionUser.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (signal?.aborted) {
        console.log("[AuthContext] Enrichment request cancelled after fetch");
        return null;
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.log("[AuthContext] User not found in user_profiles (pending approval):", {
            userId: sessionUser.id,
          });
        } else {
          console.warn("[AuthContext] Profile fetch failed:", {
            userId: sessionUser.id,
            status: response.status,
            statusText: response.statusText,
          });
        }
        return null;
      }

      const profile = await response.json();

      if (!profile) {
        console.warn("[AuthContext] No profile data returned");
        return null;
      }

      console.log("[AuthContext] Database profile enriched successfully:", {
        userId: sessionUser.id,
        role: profile.role,
        barangay: profile.barangay,
      });

      // Return enriched user with database data
      return {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar: profile.avatar || baseUser.avatar,
        role: (profile.role as UserRole) || "resident",
        barangay: profile.barangay || "",
        status: (profile.status as "active" | "banned") || "active",
        isRoleConfirmed: true, // CRITICAL: Role is now confirmed from database
      };
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === "AbortError") {
        console.warn("[AuthContext] Profile enrichment timed out (5s):", {
          userId: sessionUser.id,
        });
      } else {
        console.error("[AuthContext] Profile enrichment error:", {
          userId: sessionUser.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return null;
    }
  } catch (err) {
    console.error("[AuthContext] Unexpected error in enrichment:", {
      userId: sessionUser.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
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
  status: "active",
  isRoleConfirmed: false,
};

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: AuthUser;
  session: Session | null;
  isLoading: boolean;
  isEnriching: boolean; // True if fetching DB profile in background
  /**
   * Sign in with email + password via Supabase Auth.
   * Returns an error string on failure, or null on success.
   */
  login: (email: string, password: string) => Promise<string | null>;
  /** Sign out and redirect to landing */
  logout: () => void;
  /** Refresh user role from database (e.g., after promotion) */
  refreshRole: () => Promise<void>;
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
  const [isEnriching, setIsEnriching] = useState(false);

  // AbortController for cancelling in-flight enrichment requests
  const enrichmentAbortControllerRef = useRef<AbortController | null>(null);
  const currentUserRef = useRef<AuthUser>(GUEST_USER);
  const enrichedProfileUserIdRef = useRef<string | null>(null);
  const enrichmentInFlightUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // On mount: restore session (Supabase handles this automatically)
  useEffect(() => {
    let isMounted = true;

    console.log("[AuthContext] Initializing auth on mount");

    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
        // Immediately set user from session (non-blocking)
        const baseUser = mapSupabaseUser(session.user);
        if (isMounted) {
          console.log("[AuthContext] Setting base user from session (non-blocking):", {
            role: baseUser.role,
            id: baseUser.id,
          });
          setUser(baseUser);
          setIsLoading(false);
        }

        // Start background enrichment (don't await, don't block UI)
        if (isMounted) {
          enrichmentAbortControllerRef.current?.abort();
          enrichmentAbortControllerRef.current = new AbortController();
          enrichmentInFlightUserIdRef.current = session.user.id;
          setIsEnriching(true);

          enrichUserWithDatabaseProfile(
            session.user,
            enrichmentAbortControllerRef.current.signal
          ).then((enrichedUser) => {
            if (!isMounted || !enrichedUser) {
              if (enrichedUser === null) {
                console.log("[AuthContext] Background enrichment completed but skipped");
              }
              return;
            }

            console.log("[AuthContext] Background enrichment complete, updating user:", {
              role: enrichedUser.role,
              id: enrichedUser.id,
            });
            enrichedProfileUserIdRef.current = enrichedUser.id;
            currentUserRef.current = enrichedUser;
            setUser(enrichedUser);
            // Cache the confirmed role for fast re-renders on future page loads
            roleCache.setLastKnownRole(enrichedUser.role);
          }).finally(() => {
            if (!isMounted) return;
            enrichmentInFlightUserIdRef.current = null;
            setIsEnriching(false);
          });
        }
      } else {
        if (isMounted) {
          console.log("[AuthContext] No session, setting guest user");
          enrichedProfileUserIdRef.current = null;
          enrichmentInFlightUserIdRef.current = null;
          currentUserRef.current = GUEST_USER;
          setUser(GUEST_USER);
          setIsLoading(false);
          setIsEnriching(false);
        }
      }
    }).catch((err) => {
      console.error("[AuthContext] Error restoring session:", err);
      if (isMounted) {
        enrichedProfileUserIdRef.current = null;
        enrichmentInFlightUserIdRef.current = null;
        currentUserRef.current = GUEST_USER;
        setUser(GUEST_USER);
        setIsLoading(false);
        setIsEnriching(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
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
          if (_event === "INITIAL_SESSION") {
            console.log("[AuthContext] Ignoring INITIAL_SESSION; handled by getSession()");
            return;
          }

          const currentUser = currentUserRef.current;
          const isSameUser = currentUser.id === session.user.id;
          const hasEnrichedProfile = enrichedProfileUserIdRef.current === session.user.id;
          const enrichmentInFlight = enrichmentInFlightUserIdRef.current === session.user.id;
          const isDuplicateSessionEvent = _event === "SIGNED_IN" || _event === "TOKEN_REFRESHED";

          if (isDuplicateSessionEvent && isSameUser && (hasEnrichedProfile || enrichmentInFlight)) {
            console.log("[AuthContext] Same user auth event received; preserving current profile:", {
              event: _event,
              userId: session.user.id,
              hasEnrichedProfile,
              enrichmentInFlight,
            });
            setIsLoading(false);
            return;
          }

          // Immediately set base user (non-blocking)
          const baseUser = mapSupabaseUser(session.user);
          if (isMounted) {
            console.log("[AuthContext] Setting base user on auth change:", {
              role: baseUser.role,
              id: baseUser.id,
            });
            currentUserRef.current = baseUser;
            setUser(baseUser);
            setIsLoading(false);
          }

          // Start background enrichment
          if (isMounted) {
            enrichmentAbortControllerRef.current?.abort();
            enrichmentAbortControllerRef.current = new AbortController();
            enrichmentInFlightUserIdRef.current = session.user.id;
            setIsEnriching(true);

            enrichUserWithDatabaseProfile(
              session.user,
              enrichmentAbortControllerRef.current.signal
            ).then((enrichedUser) => {
              if (!isMounted || !enrichedUser) {
                if (enrichedUser === null) {
                  console.log("[AuthContext] Background enrichment skipped on auth change");
                }
                return;
              }

              console.log("[AuthContext] Background enrichment updated user on auth change:", {
                role: enrichedUser.role,
                id: enrichedUser.id,
              });
              enrichedProfileUserIdRef.current = enrichedUser.id;
              currentUserRef.current = enrichedUser;
              setUser(enrichedUser);
              // Cache the confirmed role for fast re-renders on future page loads
              roleCache.setLastKnownRole(enrichedUser.role);
            }).finally(() => {
              if (!isMounted) return;
              enrichmentInFlightUserIdRef.current = null;
              setIsEnriching(false);
            });
          }
        } else {
          if (isMounted) {
            console.log("[AuthContext] Auth change: no session, setting guest");
            enrichedProfileUserIdRef.current = null;
            enrichmentInFlightUserIdRef.current = null;
            currentUserRef.current = GUEST_USER;
            setUser(GUEST_USER);
            setIsLoading(false);
            setIsEnriching(false);
          }
        }
      }
    );

    return () => {
      console.log("[AuthContext] Cleanup on unmount");
      isMounted = false;
      subscription.unsubscribe();
      enrichmentAbortControllerRef.current?.abort();
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
      // User is not yet verified or has been suspended
      await supabase.auth.signOut();
      setIsLoading(false);

      if (verificationData?.status === "banned") {
        const reason = verificationData.banReason?.trim();
        return reason
          ? `Your account has been suspended by an administrator. Reason: ${reason}`
          : "Your account has been suspended by an administrator. Please contact support for more information.";
      }

      return "Your account is pending admin verification. You will be notified once approved.";
    }

    setIsLoading(false);
    return null; // success — onAuthStateChange will update the user state
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(GUEST_USER);
    setSession(null);
    // Clear the cached role to prevent the next user seeing the previous user's role
    roleCache.clear();
  };

  const refreshRole = async () => {
    if (!session?.user) {
      console.log("[AuthContext] Cannot refresh role: no session");
      return;
    }

    console.log("[AuthContext] Refreshing user role from database");
    setIsEnriching(true);

    enrichmentAbortControllerRef.current?.abort();
    enrichmentAbortControllerRef.current = new AbortController();

    const enrichedUser = await enrichUserWithDatabaseProfile(
      session.user,
      enrichmentAbortControllerRef.current.signal
    );

    if (enrichedUser) {
      console.log("[AuthContext] Role refreshed:", { newRole: enrichedUser.role });
      enrichedProfileUserIdRef.current = enrichedUser.id;
      currentUserRef.current = enrichedUser;
      setUser(enrichedUser);
    }

    setIsEnriching(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isEnriching,
        login,
        logout,
        refreshRole,
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
