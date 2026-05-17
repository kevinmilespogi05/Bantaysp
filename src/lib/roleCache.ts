/**
 * Role Cache Utility
 * 
 * Purpose: Cache the user's last-known role in localStorage to enable fast re-renders
 * on page reload. This is an OPTIMIZATION only - the actual role is always verified
 * from the backend via the AuthContext enrichment process.
 * 
 * Security Note: This cache is NEVER used for permission checks. It's purely for UI
 * to avoid showing a blank screen or wrong role during the brief enrichment window.
 * All actual authorization happens at ProtectedRoute + RoleGuard + Backend level.
 * 
 * Flow:
 * 1. Page reload → Check roleCache.getLastKnownRole()
 * 2. AuthContext fetches real role from backend
 * 3. On successful enrichment → roleCache.setLastKnownRole(confirmedRole)
 * 4. On logout → roleCache.clear()
 * 
 * Advantages:
 * - Prevents white screen flash during role enrichment
 * - Allows UI to show a placeholder role immediately
 * - Improves perceived performance on slow connections
 * 
 * Limitations:
 * - Only works for returning users (cleared on logout)
 * - Subject to localStorage availability/clearing
 * - Should never be trusted for actual permissions
 */

const ROLE_CACHE_KEY = "bantay_last_known_role";
const ROLE_CACHE_VERSION = "1";
const ROLE_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheEntry {
  version: string;
  role: "resident" | "admin" | "patrol";
  timestamp: number;
}

/**
 * Get the user's last-known role from cache, if available and not expired
 * 
 * Returns null if:
 * - Cache doesn't exist
 * - Cache version is outdated (schema changed)
 * - Cache has expired
 * 
 * This is safe to use during initial render before real role is fetched.
 */
export function getLastKnownRole(): "resident" | "admin" | "patrol" | null {
  try {
    if (typeof window === "undefined") {
      return null; // Server-side rendering
    }

    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);

    // Version mismatch - discard old cache
    if (entry.version !== ROLE_CACHE_VERSION) {
      console.log("[RoleCache] Cache version mismatch, discarding");
      localStorage.removeItem(ROLE_CACHE_KEY);
      return null;
    }

    // Check expiry
    const age = Date.now() - entry.timestamp;
    if (age > ROLE_CACHE_EXPIRY) {
      console.log("[RoleCache] Cache expired, discarding");
      localStorage.removeItem(ROLE_CACHE_KEY);
      return null;
    }

    console.log("[RoleCache] Cache hit, returning:", entry.role);
    return entry.role;
  } catch (err) {
    console.error("[RoleCache] Error reading cache:", err);
    return null;
  }
}

/**
 * Store the user's confirmed role in cache for fast re-renders
 * 
 * Should be called after successful database enrichment in AuthContext.
 * Overwrites any existing cache entry.
 */
export function setLastKnownRole(role: "resident" | "admin" | "patrol"): void {
  try {
    if (typeof window === "undefined") {
      return; // Server-side rendering
    }

    const entry: CacheEntry = {
      version: ROLE_CACHE_VERSION,
      role,
      timestamp: Date.now(),
    };

    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(entry));
    console.log("[RoleCache] Role cached:", role);
  } catch (err) {
    // localStorage might be disabled or quota exceeded - continue without caching
    console.warn("[RoleCache] Error writing cache:", err);
  }
}

/**
 * Clear the cached role (called on logout)
 * 
 * This ensures that after logout, the next user won't see the previous user's role
 * during the brief initialization window.
 */
export function clear(): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(ROLE_CACHE_KEY);
    console.log("[RoleCache] Cache cleared");
  } catch (err) {
    console.warn("[RoleCache] Error clearing cache:", err);
  }
}

/**
 * For debugging: view current cache state
 */
export function getCacheState(): CacheEntry | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error("[RoleCache] Error getting cache state:", err);
    return null;
  }
}
