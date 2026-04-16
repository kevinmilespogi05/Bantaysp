/**
 * Create Admin Account — Helper Script
 * 
 * Usage:
 *   npx ts-node -r dotenv/config create-admin.ts
 * 
 * Creates an admin user directly in Supabase with:
 * - Auth.users entry (email + password)
 * - user_profiles entry with admin role
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
console.log(`📝 Debug: Current directory = ${process.cwd()}`);
console.log(`📝 Debug: All env vars loaded:`, {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  VITE_SUPABASE_SERVICE_KEY: !!process.env.VITE_SUPABASE_SERVICE_KEY,
});

// Default admin credentials (change these!)
const ADMIN_EMAIL = "admin@bantaysp.com";
const ADMIN_PASSWORD = "Admin@123456"; // ⚠️ Change this!
const ADMIN_FIRST_NAME = "Admin";
const ADMIN_LAST_NAME = "User";
const ADMIN_BARANGAY = "Central";

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

async function createAdmin() {
  try {
    console.log("🔐 Creating admin account...\n");

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Create auth user
    console.log(`📝 Step 1: Creating auth user (${ADMIN_EMAIL})...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        role: "admin",
        avatar: generateAvatar(ADMIN_FIRST_NAME, ADMIN_LAST_NAME),
        barangay: ADMIN_BARANGAY,
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

    // Step 2: Create user_profiles entry (skip pending_verification for admin)
    console.log(`\n📝 Step 2: Creating user profile...`);
    const avatar = generateAvatar(ADMIN_FIRST_NAME, ADMIN_LAST_NAME);

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        email: ADMIN_EMAIL,
        role: "admin",
        barangay: ADMIN_BARANGAY,
        avatar,
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

    console.log(`✅ User profile created`);

    // Step 3: Success summary
    console.log(`\n✅ Admin account created successfully!\n`);
    console.log("📋 Account Details:");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     admin`);
    console.log(`   Name:     ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);
    console.log(`   User ID:  ${userId}`);
    console.log(`\n🔒 IMPORTANT: Change the password after first login!`);
    console.log(`\n🌐 You can now login at: http://localhost:5173/login`);

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

// Run the script
createAdmin();
