import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

// ─── Helper to route operations to correct table based on prefix ──────────────

const getTableName = (prefix: string): string => {
  if (prefix.startsWith("report:")) return "reports";
  if (prefix.startsWith("comment:")) return "comments";
  if (prefix.startsWith("announcement:")) return "announcements";
  if (prefix.startsWith("emergency:")) return "emergency_contacts";
  if (prefix.startsWith("leaderboard:")) return "leaderboard";
  if (prefix.startsWith("patrol_unit:")) return "patrol_units";
  if (prefix.startsWith("patrol_incident:")) return "patrol_incidents";
  if (prefix.startsWith("patrol_msg:")) return "patrol_messages";
  if (prefix.startsWith("patrol_history:")) return "patrol_history";
  if (prefix.startsWith("profile:")) return "user_profiles";
  throw new Error(`Unknown prefix: ${prefix}`);
};

// ─── Get a single record ──────────────────────────────────────────────────────

export const get = async (key: string): Promise<any> => {
  const supabase = client();
  const table = getTableName(key);
  const id = key.split(":").slice(1).join(":");
  
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (error) throw new Error(error.message);
  return data;
};

// ─── Set/upsert a single record ───────────────────────────────────────────────

export const set = async (key: string, value: any): Promise<void> => {
  const supabase = client();
  const table = getTableName(key);
  const id = key.split(":").slice(1).join(":");
  
  const record = { ...value, id };
  
  const { error } = await supabase
    .from(table)
    .upsert(record);
  
  if (error) throw new Error(error.message);
};

// ─── Delete a single record ───────────────────────────────────────────────────

export const del = async (key: string): Promise<void> => {
  const supabase = client();
  const table = getTableName(key);
  const id = key.split(":").slice(1).join(":");
  
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id);
  
  if (error) throw new Error(error.message);
};

// ─── Set multiple records ────────────────────────────────────────────────────

export const mset = async (pairs: Record<string, any> | string[], values?: any[]): Promise<void> => {
  const supabase = client();
  let entries: Array<[string, any]> = [];
  
  if (Array.isArray(pairs)) {
    entries = pairs.map((k, i) => [k, values?.[i]]);
  } else {
    entries = Object.entries(pairs);
  }
  
  // Group by table
  const byTable: Record<string, Array<[string, any]>> = {};
  for (const [key, value] of entries) {
    const table = getTableName(key);
    if (!byTable[table]) byTable[table] = [];
    byTable[table].push([key, value]);
  }
  
  // Upsert to each table
  for (const [table, tableEntries] of Object.entries(byTable)) {
    const records = tableEntries.map(([key, value]) => {
      const id = key.split(":").slice(1).join(":");
      return { ...value, id };
    });
    
    const { error } = await supabase.from(table).upsert(records);
    if (error) throw new Error(error.message);
  }
};

// ─── Delete multiple records ─────────────────────────────────────────────────

export const mdel = async (keys: string[]): Promise<void> => {
  const supabase = client();
  
  // Group by table
  const byTable: Record<string, string[]> = {};
  for (const key of keys) {
    const table = getTableName(key);
    if (!byTable[table]) byTable[table] = [];
    const id = key.split(":").slice(1).join(":");
    byTable[table].push(id);
  }
  
  // Delete from each table
  for (const [table, ids] of Object.entries(byTable)) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in("id", ids);
    
    if (error) throw new Error(error.message);
  }
};

// ─── Get all records by prefix ───────────────────────────────────────────────

export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client();
  const table = getTableName(prefix);
  
  // For seeding - return all records for the table
  if (prefix === "bantay:") return []; // Skip seeded flag
  
  const { data, error } = await supabase.from(table).select("*");
  
  if (error) throw new Error(error.message);
  return data ?? [];
};