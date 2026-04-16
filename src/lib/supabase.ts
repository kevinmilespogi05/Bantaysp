/**
 * Supabase Client — Bantay SP
 *
 * Single shared instance used across the entire app.
 * Import { supabase } from "@/lib/supabase" wherever you need DB/Auth/Storage access.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so the user stays logged in on page refresh
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
