/**
 * Create Patrol Account — Helper Script
 * 
 * Usage:
 *   npx ts-node -r dotenv/config create-patrol.ts
 * 
 * Creates a patrol officer account directly in Supabase with:
 * - Auth.users entry (email + password)
 * - user_profiles entry with patrol role + metadata
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Load Environment Variables ────────────────────────────────────────────
// Explicitly load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ─── Configuration ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://cepefukwfszkgosnjmbc.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Debug logging
console.log(`📝 Debug: SUPABASE_URL = ${SUPABASE_URL}`);
console.log(`📝 Debug: SUPABASE_SERVICE_KEY = ${SUPABASE_SERVICE_KEY ? "✅ Set" : "❌ Not set"}`);
console.log(`📝 Debug: Current directory = ${process.cwd()}\n`);

// Default patrol credentials (change these!)
const PATROL_EMAIL = "patrol@bantaysp.com";
const PATROL_PASSWORD = "Patrol@123456"; // ⚠️ Change this!
const PATROL_FIRST_NAME = "Patrol";
const PATROL_LAST_NAME = "Officer";
const PATROL_BARANGAY = "Brgy. San Pablo";

// Patrol-specific metadata
const PATROL_UNIT = "Unit 1 - Alpha";
const PATROL_BADGE_NUMBER = "PNP-0001";
const PATROL_RANK = "Police Officer 1";
const PATROL_SHIFT_START = "06:00";
const PATROL_SHIFT_END = "18:00";

// ─── Validation ────────────────────────────────────────────────────────────

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  console.log("Set it in your .env.local file:");
  console.log("SUPABASE_SERVICE_ROLE_KEY=your_key_here");
  process.exit(1);
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function generateAvatar(firstName: string, lastName: string): string {
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  return initials;
}

// ─── Main Execution ────────────────────────────────────────────────────────

async function createPatrol() {
  try {
    console.log("🚔 Creating patrol officer account...\n");

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Create auth user
    console.log(`📝 Step 1: Creating auth user (${PATROL_EMAIL})...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: PATROL_EMAIL,
      password: PATROL_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: PATROL_FIRST_NAME,
        last_name: PATROL_LAST_NAME,
        role: "patrol",
        avatar: generateAvatar(PATROL_FIRST_NAME, PATROL_LAST_NAME),
        barangay: PATROL_BARANGAY,
      },
    });

    if (authError) {
      console.error(`❌ Auth creation failed:`, authError.message);
      process.exit(1);
    }

    if (!authData.user) {
      console.error("❌ No user returned from auth creation");
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Auth user created: ${userId}`);

    // Step 2: Create user_profiles entry with patrol role
    console.log(`\n📝 Step 2: Creating user profile with patrol metadata...`);
    const avatar = generateAvatar(PATROL_FIRST_NAME, PATROL_LAST_NAME);
    
    // Patrol metadata (stored in bio field as JSON)
    const patrolMetadata = {
      unit: PATROL_UNIT,
      badgeNumber: PATROL_BADGE_NUMBER,
      rank: PATROL_RANK,
      shiftStart: PATROL_SHIFT_START,
      shiftEnd: PATROL_SHIFT_END,
      promotedAt: new Date().toISOString(),
    };

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        first_name: PATROL_FIRST_NAME,
        last_name: PATROL_LAST_NAME,
        email: PATROL_EMAIL,
        role: "patrol",
        barangay: PATROL_BARANGAY,
        avatar,
        bio: JSON.stringify(patrolMetadata),
        verified: true,
        email_verified: true,
        points: 0,
        reports: 0,
        joined: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error(`❌ Profile creation failed:`, profileError.message);
      // Clean up: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      process.exit(1);
    }

    console.log(`✅ User profile created with patrol role`);

    // Step 3: Success summary
    console.log(`\n✅ Patrol officer account created successfully!\n`);
    console.log("📋 Account Details:");
    console.log(`   Email:        ${PATROL_EMAIL}`);
    console.log(`   Password:     ${PATROL_PASSWORD}`);
    console.log(`   Role:         patrol`);
    console.log(`   Name:         ${PATROL_FIRST_NAME} ${PATROL_LAST_NAME}`);
    console.log(`   Barangay:     ${PATROL_BARANGAY}`);
    console.log(`   User ID:      ${userId}`);
    console.log(`\n🚔 Patrol Metadata:`);
    console.log(`   Unit:         ${PATROL_UNIT}`);
    console.log(`   Badge Number: ${PATROL_BADGE_NUMBER}`);
    console.log(`   Rank:         ${PATROL_RANK}`);
    console.log(`   Shift:        ${PATROL_SHIFT_START} - ${PATROL_SHIFT_END}`);
    console.log(`\n💡 Features Available:`);
    console.log(`   ✓ Can switch between Resident Mode and Patrol Mode`);
    console.log(`   ✓ Can view assigned reports`);
    console.log(`   ✓ Can self-assign available reports`);
    console.log(`   ✓ Real-time comment system`);
    console.log(`\n🔒 IMPORTANT: Change the password after first login!`);
    console.log(`\n🌐 You can now login at: http://localhost:5173/login`);
    console.log(`\n➡️  After login, click the mode switcher to enter Patrol Mode!`);

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

// Run the script
createPatrol();
