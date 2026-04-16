/**
 * Local Development Server for Registration Endpoints
 * 
 * This server replicates the Edge Function logic locally for debugging.
 * Connect your frontend to http://localhost:3000 during development.
 * 
 * Run: npx ts-node local-server.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

// ─── Configuration ───────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ENV = process.env.NODE_ENV || 'development';

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Get from .env or environment
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cepefukwfszkgosnjmbc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Verify SENDGRID_API_KEY is set
if (!SENDGRID_API_KEY) {
  console.error("⚠️  WARNING: SENDGRID_API_KEY is not set in .env.local - Emails will NOT be sent!");
  console.error("   Please add SENDGRID_API_KEY=SG.___ to .env.local");
  console.error("   Get your key from: https://app.sendgrid.com/settings/api_keys");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── In-Memory OTP Store (Temporary, not persisted) ─────────────────────────

interface PendingOtp {
  otp: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  barangay: string;
  role: string;
  idPhotoUrl?: string;
}

// Store: { email → PendingOtp }
const otpStore = new Map<string, PendingOtp>();

// ─── In-Memory Patrol Incidents Store ──────────────────────────────────────

interface PatrolIncident {
  id: string;
  title: string;
  category: string;
  priority: string;
  location: { lat: number; lng: number };
  address: string;
  status: string;
  assignedPatrol: string | null;
  acceptedBy?: string | null;
  timeReported: string;
  reporter: string;
  reporterAvatar: string;
  reporterContact: string;
  reporterNotes: string;
  assignedAt: string | null;
  acceptedAt?: string | null;
}

// Store: { incidentId → PatrolIncident }
const patrolIncidentsStore = new Map<string, PatrolIncident>();

function cleanupExpiredOtps(): void {
  const now = Date.now();
  const twentyMinutesMs = 20 * 60 * 1000;

  for (const [email, data] of otpStore.entries()) {
    const createdTime = new Date(data.createdAt).getTime();
    if (now - createdTime > twentyMinutesMs) {
      otpStore.delete(email);
      console.log(`[OtpStore] Cleaned up expired OTP for ${email}`);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOtp(): string {
  // Use crypto for secure random generation (matching production security)
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(byte => (byte % 10).toString())
    .join("");
}

function isOtpExpired(createdAt: string, expiryMinutes: number = 15): boolean {
  // Normalize timestamp: ensure it ends with Z for UTC interpretation
  const normalizedCreatedAt = typeof createdAt === 'string' && !createdAt.endsWith('Z') 
    ? createdAt + 'Z' 
    : createdAt;
  
  const created = new Date(normalizedCreatedAt).getTime();
  const now = Date.now();
  const timeDiffMs = now - created;
  
  // Calculate expiry time with 30-second clock skew tolerance
  const expiryTimeMs = expiryMinutes * 60 * 1000;
  const clockSkewToleranceMs = 30 * 1000; // 30 seconds buffer
  const effectiveExpiryMs = expiryTimeMs + clockSkewToleranceMs;
  
  const isExpired = timeDiffMs > effectiveExpiryMs;
  const timeDiffSeconds = Math.floor(timeDiffMs / 1000);
  const createdFormatted = new Date(created).toISOString();
  const nowFormatted = new Date(now).toISOString();
  
  console.log(
    `[OTP Expiry] created=${createdFormatted} now=${nowFormatted} ` +
    `diff=${timeDiffSeconds}s/${expiryMinutes}m expired=${isExpired} ` +
    `(±${clockSkewToleranceMs / 1000}s tolerance)`
  );
  
  return isExpired;
}

function isValidPhoneNumber(phone: string): boolean {
  const normalized = phone.replace(/\D/g, "");
  return normalized.length >= 10 && normalized.length <= 15;
}

function generateAvatar(firstName: string, lastName: string): string {
  const first = (firstName || "").charAt(0).toUpperCase();
  const last = (lastName || "").charAt(0).toUpperCase();
  return (first + last) || "US";
}

async function sendOtpEmail(email: string, otp: string, expiryMinutes: number): Promise<void> {
  if (!SENDGRID_API_KEY) {
    const errorMsg = `[Email] ❌ CRITICAL: SENDGRID_API_KEY is NOT SET! Email to ${email} will NOT be sent. OTP would be: ${otp}`;
    console.error(errorMsg);
    throw new Error("SENDGRID_API_KEY environment variable is not configured");
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Bantay SP Email Verification Code</h2>
      <p>Use this code to verify your email and complete registration:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0;">
        ${otp.charAt(0)} ${otp.charAt(1)} ${otp.charAt(2)} ${otp.charAt(3)} ${otp.charAt(4)} ${otp.charAt(5)}
      </div>
      <p><strong>This code expires in ${expiryMinutes} minutes.</strong></p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  const textContent = `Your verification code: ${otp}. Valid for ${expiryMinutes} minutes.`;

  try {
    console.log(`[Email] 📧 Attempting to send OTP to ${email} via SendGrid...`);
    console.log(`[Email] SendGrid API Key present: ${SENDGRID_API_KEY ? "YES" : "NO"}`);
    console.log(`[Email] SendGrid URL: https://api.sendgrid.com/v3/mail/send`);
    
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
          },
        ],
        from: {
          email: "kevinmilesjulhusin99@gmail.com",
          name: "Bantay SP",
        },
        subject: "Your Bantay SP Verification Code",
        content: [
          {
            type: "text/plain",
            value: textContent,
          },
          {
            type: "text/html",
            value: htmlContent,
          },
        ],
      }),
    });

    console.log(`[Email] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Could not parse error response' };
      }
      console.error(`[Email] ❌ SendGrid API error - Status ${response.status}:`, errorData);
      throw new Error(
        `SendGrid API error (${response.status}): ${errorData?.errors?.[0]?.message || errorData?.message || response.statusText}`
      );
    }

    console.log(`[Email] ✅ OTP email sent successfully to ${email}`);
  } catch (err) {
    console.error(`[Email] ❌ FAILED to send OTP email to ${email}`);
    console.error(`[Email] Error message: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`[Email] Error stack:`, err instanceof Error ? err.stack : "No stack");
    throw err;
  }
}

/**
 * Clean up stale pending registrations (older than 20 minutes)
 * Call this periodically to prevent table bloat
 */
async function cleanupStalePendings(): Promise<void> {
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("pending_registrations")
    .delete()
    .lt("created_at", twentyMinutesAgo);

  if (error) {
    console.error(`[Cleanup] Error removing stale pending registrations:`, error);
  } else {
    // data can be null or an array depending on .select() call
    const count = (data as any)?.length || 0;
    console.log(`[Cleanup] Removed ${count} stale pending registration(s)`);
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /register
 * Step 1: Validate personal info (NO database insert yet)
 * OTP will be generated and sent in Step 3 (/generate-otp)
 */
app.post("/register", async (req, res) => {
  try {
    console.log("[Register] Request received:", { email: req.body.email });
    const { firstName, lastName, email, password, phone, barangay, role } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, email, password",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    if (phone && !isValidPhoneNumber(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Check if email already fully registered
    const { data: existingUser, error: userCheckError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!userCheckError) {
      console.log(`[Register] Email already registered: ${email}`);
      return res.status(409).json({
        error: "Email already registered. Please log in.",
      });
    }

    // STEP 1 ONLY: Just validate, don't insert to DB yet
    console.log(`✅ [Register] Step 1 validation passed for ${email}`);
    return res.status(200).json({
      success: true,
      email,
      firstName,
      lastName,
      message: "Personal info validated. Please continue to Step 2 (ID Upload), then Step 3 (Verification).",
    });
  } catch (err) {
    console.error(`[Register] Uncaught error:`, err);
    res.status(500).json({
      error: `Registration failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

/**
 * POST /generate-otp
 * Step 3a: Generate OTP and send email (NO database insert yet!)
 * This is called after user completes Step 2 (ID Upload) and is ready for Step 3 (Verification)
 * 
 * CRITICAL: OTP is stored in MEMORY only. Database insert happens ONLY after user verifies OTP.
 */
app.post("/generate-otp", async (req, res) => {
  try {
    console.log("[GenerateOTP] Request received:", { email: req.body.email });
    const { firstName, lastName, email, password, phone, barangay, role, idPhotoUrl } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, email, password",
      });
    }

    // Check if email already fully registered (in the actual user_profiles table)
    const { data: existingUser, error: userCheckError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!userCheckError) {
      console.log(`[GenerateOTP] Email already registered: ${email}`);
      return res.status(409).json({
        error: "Email already registered. Please log in.",
      });
    }

    // Check if already in OTP memory store (already sent OTP in current session)
    if (otpStore.has(email)) {
      console.log(`[GenerateOTP] OTP already sent to ${email}, regenerating...`);
      
      const newOtp = generateOtp();
      const now = new Date();
      
      // Update in memory store
      otpStore.set(email, {
        otp: newOtp,
        createdAt: now.toISOString(),
        firstName,
        lastName,
        password,
        phone: phone || undefined,
        barangay,
        role: (role && ["resident", "admin", "patrol"].includes(role)) ? role : "resident",
        idPhotoUrl: idPhotoUrl || undefined,
      });
      
      // Resend OTP email
      try {
        await sendOtpEmail(email, newOtp, 15);
      } catch (emailErr) {
        console.warn(`[GenerateOTP] Email resend failed:`, emailErr);
        return res.status(503).json({
          error: "Failed to send OTP email. Please try again later.",
        });
      }
      
      console.log(`✅ [GenerateOTP] New OTP generated and sent to ${email}`);
      return res.status(200).json({
        success: true,
        email,
        message: "New OTP sent to your email. It expires in 15 minutes.",
      });
    }

    // NEW registration - Generate OTP and store in MEMORY (NOT in database yet!)
    const userRole = role && ["resident", "admin", "patrol"].includes(role) ? role : "resident";
    const otp = generateOtp();
    const now = new Date();
    const isoTimestamp = now.toISOString();

    console.log(
      `[GenerateOTP] Generating OTP for ${email} | ` +
      `OTP=${otp} | ` +
      `Timestamp=${isoTimestamp} | ` +
      `⚠️ STORED IN MEMORY, NOT IN DATABASE (will be inserted after verification)`
    );
    
    // Store OTP in MEMORY (temporary)
    otpStore.set(email, {
      otp,
      createdAt: isoTimestamp,
      firstName,
      lastName,
      password,
      phone: phone || undefined,
      barangay,
      role: userRole,
      idPhotoUrl: idPhotoUrl || undefined,
    });

    // Send OTP email
    try {
      await sendOtpEmail(email, otp, 15);
    } catch (emailErr) {
      console.warn(`[GenerateOTP] Email send failed:`, emailErr);
      otpStore.delete(email);
      return res.status(503).json({
        error: "Failed to send OTP email. Please try again later.",
      });
    }

    console.log(`✅ [GenerateOTP] OTP sent to ${email} (stored in memory)`);
    return res.status(200).json({
      success: true,
      email,
      message: "OTP sent to your email. It expires in 15 minutes.",
    });
  } catch (err) {
    console.error(`[GenerateOTP] Uncaught error:`, err);
    console.error(`[GenerateOTP] Error stack:`, err instanceof Error ? err.stack : "No stack");
    return res.status(500).json({
      error: `OTP generation failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

/**
 * POST /verify-otp
 * Step 3c: Verify OTP code and CREATE user + profile
 * 
 * CRITICAL: This is where data is INSERTED into the database for the first time!
 * Only after successful OTP verification.
 */
app.post("/verify-otp", async (req, res) => {
  try {
    console.log("[VerifyOTP] Request received:", { email: req.body.email });
    const { email, otp, idPhotoUrl } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Missing required fields: email, otp",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        error: "OTP must be a 6-digit code",
      });
    }

    // Look up OTP from MEMORY store (not from database)
    console.log(`[VerifyOTP] Looking up OTP in memory store for ${email}`);
    const pendingOtp = otpStore.get(email);

    if (!pendingOtp) {
      console.error(`[VerifyOTP] No OTP found in memory for ${email}`);
      return res.status(404).json({
        error: "OTP not found. Please request a new OTP and try again.",
      });
    }

    // Log retrieved data for diagnostics
    console.log(
      `[VerifyOTP] Found pending OTP in memory | ` +
      `Email=${email} | ` +
      `StoredTimestamp=${pendingOtp.createdAt} | ` +
      `ParsedTime=${new Date(pendingOtp.createdAt).toISOString()} | ` +
      `NowTime=${new Date().toISOString()}`
    );

    // CRITICAL: Verify OTP - check match
    const otpMatches = pendingOtp.otp === otp;
    const storedOtpBeforeVerification = pendingOtp.otp;
    
    if (!otpMatches) {
      console.log(`[VerifyOTP] Invalid OTP for ${email}`);
      // IMPORTANT: Do NOT modify anything on wrong OTP - just return error
      return res.status(400).json({
        error: "Invalid OTP code",
      });
    }

    if (isOtpExpired(pendingOtp.createdAt, 15)) {
      console.log(`[VerifyOTP] OTP expired for ${email}`);
      otpStore.delete(email);
      return res.status(400).json({
        error: "OTP has expired. Please request a new code.",
      });
    }

    console.log(`[VerifyOTP] OTP verified successfully for ${email}. Now creating user...`);

    // ───────────────────────────────────────────────────────────────────────────
    // NOW (after successful OTP verification) create auth user + profile
    // Data stored in memory only - no pending_registrations table
    // ───────────────────────────────────────────────────────────────────────────

    // Validate password meets Supabase requirements (min 6 chars)
    if (!pendingOtp.password || pendingOtp.password.length < 6) {
      console.error(`[VerifyOTP] Invalid password: too short (length=${pendingOtp.password?.length || 0})`);
      return res.status(400).json({
        error: "Invalid password. Password must be at least 6 characters.",
      });
    }

    console.log(`[VerifyOTP] Password validation passed (length=${pendingOtp.password.length})`);
    console.log(`[VerifyOTP] User data to be created: {firstName: ${pendingOtp.firstName}, lastName: ${pendingOtp.lastName}, email: ${email}, role: ${pendingOtp.role}}`);


    // Create auth user (check if already exists first)
    console.log(`[VerifyOTP] Creating auth user for ${email}`);
    let userId: string;
    let isNewAuthUser = false;

    // Try to create auth user
    console.log(`[VerifyOTP] Auth creation params: email="${email}", password_length=${pendingOtp.password?.length || 0}, email_confirm=true`);
    console.log(`[VerifyOTP] SERVICE_ROLE_KEY present: ${SUPABASE_SERVICE_ROLE_KEY ? `YES (length=${SUPABASE_SERVICE_ROLE_KEY.length})` : "NO"}`);
    console.log(`[VerifyOTP] SUPABASE_URL: ${SUPABASE_URL}`);
    
    // First attempt: Create user WITH metadata (first and last names for proper display)
    console.log(`[VerifyOTP] Attempt 1: Creating auth user WITH metadata...`);
    let authData: any;
    let authError: any;
    
    try {
      const result = await supabase.auth.admin.createUser({
        email,
        password: pendingOtp.password,
        email_confirm: true,
        user_metadata: {
          first_name: pendingOtp.firstName,
          last_name: pendingOtp.lastName,
          role: "resident",
          barangay: pendingOtp.barangay,
          avatar: generateAvatar(pendingOtp.firstName, pendingOtp.lastName),
        },
      });
      authData = result.data;
      authError = result.error;
    } catch (e) {
      console.error(`[VerifyOTP] Exception thrown during auth creation:`, e);
      authError = e;
      authData = null;
    }

    console.log(`[VerifyOTP] Auth response - success: ${!authError}, userId: ${authData?.user?.id || "N/A"}`);

    if (authError) {
      // Log full error details for debugging
      console.error(`[VerifyOTP] ⚠️  FULL AUTH ERROR DETAILS:`);
      console.error(`  - Message: ${authError.message}`);
      console.error(`  - Status: ${authError.status}`);
      console.error(`  - Code: ${authError.code}`);
      console.error(`  - Name: ${authError.name}`);
      console.error(`  - Full object: ${JSON.stringify(authError, null, 2)}`);

      // Check if user already exists (multiple possible error messages)
      const errorMsg = (authError.message || "").toLowerCase();
      const isDuplicate = 
        errorMsg.includes("already exists") || 
        errorMsg.includes("duplicate") || 
        errorMsg.includes("user already registered") ||
        errorMsg.includes("unique violation") ||
        errorMsg.includes("user_already_exists") ||
        authError.code === "user_already_exists";

      if (isDuplicate) {
        console.log(`[VerifyOTP] ✓ Detected duplicate user error for ${email}`);
        console.log(`[VerifyOTP] User already exists in auth system`);
        return res.status(409).json({
          error: `This email is already registered. If this is your email, please log in instead. If you need help, contact support.`,
        });
      } else {
        // UNEXPECTED error - log everything for debugging
        console.error(`[VerifyOTP] 🔴 UNEXPECTED AUTH ERROR (NOT A DUPLICATE)`);
        console.error(`[VerifyOTP] This error needs investigation!`);
        console.error(`[VerifyOTP] Error type: ${Object.prototype.toString.call(authError)}`);
        
        // Check for specific known errors
        if (errorMsg.includes("database error")) {
          console.error(`[VerifyOTP] This is a DATABASE ERROR - could be a constraint or permission issue`);
        }
        if (errorMsg.includes("password")) {
          console.error(`[VerifyOTP] PASSWORD-related error - password might not meet requirements`);
        }
        
        // Return more helpful error
        return res.status(500).json({
          error: `Registration failed: ${authError?.message || "Could not create user account"}. Please try again or contact support.`,
        });
      }
    } else if (authData.user) {
      userId = authData.user.id;
      isNewAuthUser = true;
      console.log(`[VerifyOTP] Auth user created: ${userId}`);
    } else {
      console.error(`[VerifyOTP] Auth creation returned no user`);
      return res.status(500).json({
        error: "Auth user creation failed",
      });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Create pending_verification record (NOT user_profiles yet)
    // User must wait for admin approval before accessing the app
    // ───────────────────────────────────────────────────────────────────────────

    const avatar = generateAvatar(pendingOtp.firstName, pendingOtp.lastName);
    console.log(`[VerifyOTP] Creating pending verification record for ${userId}`);
    
    const { data: pendingData, error: pendingError } = await supabase
      .from("pending_verification")
      .insert({
        user_id: userId,
        first_name: pendingOtp.firstName,
        last_name: pendingOtp.lastName,
        email,
        phone: pendingOtp.phone || null,
        role: pendingOtp.role,
        barangay: pendingOtp.barangay,
        avatar,
        id_document_url: idPhotoUrl || pendingOtp.idPhotoUrl || null,
        verification_status: "pending",
      })
      .select()
      .single();

    if (pendingError) {
      console.error(`[VerifyOTP] Pending verification error:`, pendingError);
      // Clean up: delete auth user if pending verification fails
      if (isNewAuthUser) {
        console.log(`[VerifyOTP] Deleting auth user due to pending verification error`);
        await supabase.auth.admin.deleteUser(userId);
      }
      return res.status(500).json({
        error: `Failed to create verification record: ${pendingError.message}`,
      });
    }

    console.log(`[VerifyOTP] Pending verification created for ${userId}`);

    // Delete from memory store - registration complete
    otpStore.delete(email);
    console.log(`[VerifyOTP] OTP deleted from memory store`);

    // ⚠️ IMPORTANT: Do NOT automatically log in the user
    // They must wait for admin approval before accessing the app

    console.log(`✅ [VerifyOTP] Success for ${email}, pending admin verification`);
    res.status(200).json({
      success: true,
      userId: userId,
      email: email,
      message: "Registration completed! Your account is pending admin verification. You will be notified once approved.",
    });
  } catch (err) {
    console.error(`[VerifyOTP] Uncaught error:`, err);
    res.status(500).json({
      error: `OTP verification failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

/**
 * POST /resend-otp
 * Resend OTP to user who requested a new code
 * Looks up OTP from memory store (not database)
 */
app.post("/resend-otp", async (req, res) => {
  try {
    console.log("[ResendOTP] Request received:", { email: req.body.email });
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Missing required field: email",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Look up OTP from MEMORY store (not database)
    console.log(`[ResendOTP] Looking up OTP in memory for ${email}`);
    const pendingOtp = otpStore.get(email);

    if (!pendingOtp) {
      console.error(`[ResendOTP] No OTP found in memory for ${email}`);
      return res.status(404).json({
        error: "No pending OTP found. Please request a new OTP.",
      });
    }

    // Generate new OTP
    const newOtp = generateOtp();
    const now = new Date();

    console.log(`[ResendOTP] Regenerating OTP for ${email}`);
    
    // Update in memory store
    otpStore.set(email, {
      ...pendingOtp,
      otp: newOtp,
      createdAt: now.toISOString(),
    });

    // Send email
    try {
      await sendOtpEmail(email, newOtp, 15);
    } catch (emailErr) {
      console.warn(`[ResendOTP] Email send failed:`, emailErr);
      return res.status(503).json({
        error: "Failed to send OTP email. Please try again later.",
      });
    }

    console.log(`✅ [ResendOTP] New OTP sent to ${email}`);
    res.status(200).json({
      success: true,
      message: "New OTP sent to your email. It expires in 15 minutes.",
    });
  } catch (err) {
    console.error(`[ResendOTP] Uncaught error:`, err);
    res.status(500).json({
      error: `Failed to resend OTP: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ─── Dashboard Stats (Admin & Resident) ──────────────────────────────────────

app.get("/dashboard/stats", async (req, res) => {
  try {
    console.log(`[DashboardStats] Fetching dashboard stats...`);

    // Get all reports to calculate stats
    const { data: allReports, error: reportsError } = await supabase
      .from("reports")
      .select("status");

    if (reportsError) throw reportsError;

    // Get total users
    const { count: userCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    // Calculate status counts
    const reports = allReports || [];
    const pending = reports.filter((r: any) => r.status === "pending").length;
    const inProgress = reports.filter((r: any) => r.status === "in_progress").length;
    const resolved = reports.filter((r: any) => r.status === "resolved").length;
    const totalReports = reports.length;

    // Calculate response rate (resolved / total)
    const responseRate = totalReports > 0 ? Math.round((resolved / totalReports) * 100) : 0;

    res.json({
      totalReports,
      pending,
      inProgress,
      resolved,
      activeCitizens: userCount || 0,
      responseRate,
    });
  } catch (err) {
    console.error(`[DashboardStats] Error:`, err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ─── Reports Endpoint ────────────────────────────────────────────────────────

app.get("/reports", async (req, res) => {
  try {
    console.log(`[Reports] Fetching approved reports...`);

    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .in("status", ["approved", "in_progress", "resolved"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(reports || []);
  } catch (err) {
    console.error(`[Reports] Error:`, err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/** POST /reports - Create a new report */
app.post("/reports", async (req, res) => {
  try {
    const { title, description, category, location, image_url, location_lat, location_lng } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({
        error: "Missing required fields: title, description, category, location",
      });
    }

    // Validate title and description length
    if (title.length < 5) {
      return res.status(400).json({ error: "Title must be at least 5 characters long" });
    }
    if (description.length < 10) {
      return res.status(400).json({ error: "Description must be at least 10 characters long" });
    }

    // Extract and verify access token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    let reporterName = "Anonymous Resident";
    let reporterAvatar = "";
    let userId: string | null = null;

    // Try to get user info from token
    if (token) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (user && !userError) {
          userId = user.id;
          console.log(`[CreateReport] User ${user.id} creating report`);
          
          // Get user profile for name and avatar
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("first_name, last_name, avatar")
            .eq("id", user.id)
            .single();

          if (profile && !profileError) {
            reporterName = `${profile.first_name} ${profile.last_name}`;
            reporterAvatar = profile.avatar || "";
          }

          // ── Rate Limiting: Check if user has created too many reports in the last hour ──
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { count: recentReportCount, error: rateLimitError } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", oneHourAgo);

          if (!rateLimitError && recentReportCount && recentReportCount >= 5) {
            console.warn(`[CreateReport] Rate limit exceeded for user ${userId}: ${recentReportCount} reports in last hour`);
            return res.status(429).json({ error: "You've created too many reports recently. Please wait before creating another one." });
          }

          // ── Duplicate Detection: Check for similar reports in the last 24 hours ──
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: similarReports, error: dupError } = await supabase
            .from("reports")
            .select("id, title, description, category, location")
            .eq("user_id", userId)
            .eq("category", category)
            .gte("created_at", oneDayAgo);

          if (!dupError && similarReports && similarReports.length > 0) {
            // Check for near-duplicate titles (simple string similarity)
            const titleLower = title.toLowerCase();
            for (const existing of similarReports) {
              const existingTitleLower = existing.title.toLowerCase();
              // If titles are identical or very similar, likely a duplicate
              if (titleLower === existingTitleLower) {
                console.warn(`[CreateReport] Potential duplicate report detected for user ${userId}`);
                return res.status(400).json({ 
                  error: "A similar report with this title already exists. Please check existing reports before creating a duplicate." 
                });
              }
            }
          }
        }
      } catch (tokenError) {
        console.warn(`[CreateReport] Could not verify token:`, tokenError);
      }
    }

    // Get current count of reports for this year to generate token
    const currentYear = new Date().getFullYear();
    const { count: reportCount, error: countError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .like("id", `REP-${currentYear}%`);

    if (countError) {
      console.error(`[CreateReport] Error counting reports:`, countError);
    }

    // Generate unique report token: REP-YYYY-XXXXX (e.g., REP-2026-001001)
    const sequenceNumber = String((reportCount || 0) + 1).padStart(5, "0");
    const reportId = `REP-${currentYear}-${sequenceNumber}`;

    // Generate other metadata
    const now = new Date().toISOString();

    // Default to Olongapo, Philippines if coordinates not provided
    const finalLat = location_lat || 14.3955;
    const finalLng = location_lng || 120.2854;

    console.log(`[CreateReport] Creating report ${reportId} by ${reporterName}... at ${finalLat}, ${finalLng}`);

    const { data, error } = await supabase
      .from("reports")
      .insert([
        {
          id: reportId,
          title,
          description,
          category,
          location,
          location_lat: finalLat,
          location_lng: finalLng,
          status: "pending_verification",
          reporter: reporterName,
          avatar: reporterAvatar,
          image_url: image_url || null,
          timestamp: now,
          created_at: now,
          user_id: userId,
          comments: 0,
          upvotes: 0,
        },
      ])
      .select();

    if (error) {
      console.error(`[CreateReport] Error creating report:`, error);
      return res.status(500).json({ error: "Failed to create report" });
    }

    console.log(`[CreateReport] ✅ Report created: ${reportId}`);
    res.status(201).json(data?.[0] || { success: true, id: reportId });
  } catch (err) {
    console.error(`[CreateReport] Error:`, err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

/** GET /reports/:id/comments - Fetch comments for a report */
app.get("/reports/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[GetComments] Fetching comments for report: ${id}`);

    const { data: comments, error } = await supabase
      .from("comments")
      .select("id, author, avatar, text, time")
      .eq("report_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json(comments || []);
  } catch (err) {
    console.error(`[GetComments] Error:`, err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

/** POST /reports/:id/comments - Add a comment to a report */
app.post("/reports/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { author, avatar, text } = req.body;

    if (!author || !text) {
      return res.status(400).json({ error: "Missing required fields: author, text" });
    }

    console.log(`[AddComment] Adding comment to report: ${id}`);

    // Generate unique comment ID (timestamp-based)
    const commentId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const time = new Date().toLocaleString("en-PH", { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });

    const { data, error } = await supabase
      .from("comments")
      .insert([{
        id: commentId,
        report_id: id,
        author,
        avatar: avatar || null,
        text,
        time,
      }])
      .select("id, author, avatar, text, time");

    if (error) throw error;

    console.log(`[AddComment] ✅ Comment created: ${commentId}`);
    res.status(201).json(data?.[0] || { id: commentId, author, avatar, text, time });
  } catch (err) {
    console.error(`[AddComment] Error:`, err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

/** POST /reports/:id/upvote - Toggle upvote on a report (per-user tracking) */
app.post("/reports/:id/upvote", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !["add", "remove"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'add' or 'remove'" });
    }

    // Extract and verify user from Bearer token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(`[Upvote] Auth error:`, authError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = user.id;
    console.log(`[Upvote] ${action === "add" ? "Adding" : "Removing"} upvote for report: ${id} by user: ${userId}`);

    if (action === "add") {
      // Try to insert upvote - will fail silently if duplicate (UNIQUE constraint)
      const upvoteId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      const { error: insertError } = await supabase
        .from("upvotes")
        .insert([{
          id: upvoteId,
          user_id: userId,
          report_id: id,
        }])
        .select();

      // Ignore duplicate key errors (user already upvoted)
      if (insertError && !insertError.message.includes("duplicate")) {
        throw insertError;
      }
    } else {
      // Remove upvote
      const { error: deleteError } = await supabase
        .from("upvotes")
        .delete()
        .eq("user_id", userId)
        .eq("report_id", id);

      if (deleteError) throw deleteError;
    }

    // Get updated upvote count
    const { count, error: countError } = await supabase
      .from("upvotes")
      .select("*", { count: "exact", head: true })
      .eq("report_id", id);

    if (countError) throw countError;

    const upvoteCount = count || 0;

    // Update reports.upvotes denormalized field for performance
    const { error: updateError } = await supabase
      .from("reports")
      .update({ upvotes: upvoteCount })
      .eq("id", id);

    if (updateError) throw updateError;

    console.log(`[Upvote] ✅ Upvotes updated: ${upvoteCount}`);
    res.status(200).json({ upvotes: upvoteCount });
  } catch (err) {
    console.error(`[Upvote] Error:`, err);
    res.status(500).json({ error: "Failed to update upvote" });
  }
});

/** GET /user/upvotes - Fetch current user's upvoted report IDs */
app.get("/user/upvotes", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.json([]); // Return empty array for unauthenticated users
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.json([]); // Return empty array on auth error
    }

    console.log(`[GetUserUpvotes] Fetching upvoted reports for user: ${user.id}`);

    const { data: upvotes, error } = await supabase
      .from("upvotes")
      .select("report_id")
      .eq("user_id", user.id);

    if (error) throw error;

    const reportIds = (upvotes || []).map((u: any) => u.report_id);
    console.log(`[GetUserUpvotes] ✅ User has upvoted ${reportIds.length} reports`);
    res.json(reportIds);
  } catch (err) {
    console.error(`[GetUserUpvotes] Error:`, err);
    res.status(500).json({ error: "Failed to fetch upvotes" });
  }
});

// ─── Chat Endpoints ────────────────────────────────────────────────────────────

/** POST /conversations - Create or get existing conversation */
app.post("/conversations", async (req, res) => {
  try {
    const { participant_id } = req.body;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token || !participant_id) {
      return res.status(400).json({ error: "Missing token or participant_id" });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    // Get both users' roles
    const [userData, partnerData] = await Promise.all([
      supabase.from("user_profiles").select("role").eq("id", user.id).single(),
      supabase.from("user_profiles").select("role").eq("id", participant_id).single(),
    ]);

    // Rule: Regular users can only chat with admins
    if (userData.data?.role === "user" && partnerData.data?.role !== "admin") {
      return res.status(403).json({ error: "Users can only chat with admins" });
    }

    console.log(`[Chat] User ${user.id} initiating chat with ${participant_id}`);

    // Check if conversation already exists (sort IDs for consistency)
    const conversationKey = [user.id, participant_id].sort().join(":");
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationKey)
      .single();

    if (existing) {
      return res.json({ id: existing.id, created: false });
    }

    // Create new conversation
    const conversationId = conversationKey;
    const participantId1 = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const participantId2 = participantId1 + 1;

    const { error: convError } = await supabase
      .from("conversations")
      .insert([{ id: conversationId }]);

    if (convError) throw convError;

    // Add both participants
    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert([
        { id: participantId1, conversation_id: conversationId, user_id: user.id, role: userData.data?.role },
        { id: participantId2, conversation_id: conversationId, user_id: participant_id, role: partnerData.data?.role },
      ]);

    if (partError) throw partError;

    console.log(`[Chat] ✅ Conversation created: ${conversationId}`);
    res.status(201).json({ id: conversationId, created: true });
  } catch (err) {
    console.error(`[Chat] Error creating conversation:`, err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/** GET /conversations - List all conversations for current user */
app.get("/conversations", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) return res.json([]);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.json([]);

    console.log(`[Chat] Fetching conversations for user: ${user.id}`);

    // Get all conversations this user is in
    const { data: conversations, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get latest message for each conversation
    const conversationIds = conversations?.map(c => c.conversation_id) || [];
    const result = [];

    for (const convId of conversationIds) {
      // Get participants
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id, role")
        .eq("conversation_id", convId);

      // Get latest message
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1);

      // Get other user info for display
      const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id;
      const { data: otherUser } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, avatar")
        .eq("id", otherUserId)
        .single();

      result.push({
        id: convId,
        participant: {
          id: otherUserId,
          name: `${otherUser?.first_name} ${otherUser?.last_name}`,
          avatar: otherUser?.avatar,
        },
        lastMessage: messages?.[0] || null,
        participantCount: participants?.length || 2,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(`[Chat] Error fetching conversations:`, err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/** GET /conversations/:id/messages - Fetch messages in a conversation */
app.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    console.log(`[Chat] Fetching messages for conversation: ${id}`);

    // Verify user is in conversation (security check)
    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: "Not in this conversation" });
    }

    // Fetch messages with sender info
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Enrich with sender info
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (msg) => {
        const { data: sender } = await supabase
          .from("user_profiles")
          .select("first_name, last_name, avatar")
          .eq("id", msg.sender_id)
          .single();

        return {
          ...msg,
          sender: {
            id: msg.sender_id,
            name: `${sender?.first_name} ${sender?.last_name}`,
            avatar: sender?.avatar,
          },
        };
      })
    );

    res.json(enrichedMessages);
  } catch (err) {
    console.error(`[Chat] Error fetching messages:`, err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** POST /conversations/:id/messages - Send a message */
app.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token || !content?.trim()) {
      return res.status(400).json({ error: "Missing token or content" });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    console.log(`[Chat] User ${user.id} sending message to conversation: ${id}`);

    // Verify user is in conversation
    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("role")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: "Not in this conversation" });
    }

    // Get other participants to validate rules
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("role")
      .eq("conversation_id", id);

    // Rule: Regular users can only chat with admins
    if (participant.role === "user") {
      const hasAdmin = allParticipants?.some(p => p.role === "admin");
      if (!hasAdmin) {
        return res.status(403).json({ error: "Users can only chat with admins" });
      }
    }

    // Insert message
    const messageId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const { data, error } = await supabase
      .from("messages")
      .insert([{
        id: messageId,
        conversation_id: id,
        sender_id: user.id,
        content: content.trim(),
      }])
      .select();

    if (error) throw error;

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    console.log(`[Chat] ✅ Message sent: ${messageId}`);

    // Enrich response with sender info
    const { data: sender } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, avatar")
      .eq("id", user.id)
      .single();

    res.status(201).json({
      ...data?.[0],
      sender: {
        id: user.id,
        name: `${sender?.first_name} ${sender?.last_name}`,
        avatar: sender?.avatar,
      },
    });
  } catch (err) {
    console.error(`[Chat] Error sending message:`, err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── Analytics: Monthly Trends ──────────────────────────────────────────────

app.get("/analytics/monthly", async (req, res) => {
  try {
    console.log(`[Analytics/Monthly] Fetching monthly trends...`);

    const { data: monthlyData, error } = await supabase
      .from("reports")
      .select("created_at, status")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by month
    const monthlyTrends = new Map();
    (monthlyData || []).forEach((report: any) => {
      const date = new Date(report.created_at);
      const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      if (!monthlyTrends.has(monthKey)) {
        monthlyTrends.set(monthKey, { reports: 0, resolved: 0 });
      }

      const stats = monthlyTrends.get(monthKey);
      if (report.status === "resolved") {
        stats.resolved++;
      } else {
        stats.reports++;
      }
    });

    res.json(Array.from(monthlyTrends, ([month, data]) => ({ month, ...data})));
  } catch (err) {
    console.error(`[Analytics/Monthly] Error:`, err);
    res.status(500).json({ error: "Failed to fetch monthly analytics" });
  }
});

// ─── Analytics: Report Categories ───────────────────────────────────────────

app.get("/analytics/categories", async (req, res) => {
  try {
    console.log(`[Analytics/Categories] Fetching category data...`);

    const { data: categoryData, error } = await supabase
      .from("reports")
      .select("category");

    if (error) throw error;

    // Count by category with colors
    const categories = new Map();
    const colors = ["#800000", "#d97706", "#2563eb", "#16a34a", "#7c3aed", "#dc2626", "#0891b2", "#f59e0b"];
    let colorIndex = 0;

    (categoryData || []).forEach((report: any) => {
      const cat = report.category || "Other";
      if (!categories.has(cat)) {
        categories.set(cat, { count: 0, color: colors[colorIndex % colors.length] });
        colorIndex++;
      }
      categories.get(cat).count++;
    });

    const result = Array.from(categories, ([category, data]) => ({
      name: category,
      value: data.count,
      color: data.color,
    }));

    res.json(result);
  } catch (err) {
    console.error(`[Analytics/Categories] Error:`, err);
    res.status(500).json({ error: "Failed to fetch category analytics" });
  }
});

// ─── Analytics: Weekly Activity ──────────────────────────────────────────────

app.get("/analytics/weekly", async (req, res) => {
  try {
    console.log(`[Analytics/Weekly] Fetching weekly activity...`);

    const { data: weeklyData, error } = await supabase
      .from("reports")
      .select("created_at, upvotes")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by day of week
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyActivity = new Map(days.map(d => [d, 0]));

    (weeklyData || []).forEach((report: any) => {
      const date = new Date(report.created_at);
      const dayName = days[date.getDay()];
      weeklyActivity.set(dayName, (weeklyActivity.get(dayName) || 0) + 1);
    });

    res.json(Array.from(weeklyActivity, ([day, reports]) => ({ day, reports })));
  } catch (err) {
    console.error(`[Analytics/Weekly] Error:`, err);
    res.status(500).json({ error: "Failed to fetch weekly analytics" });
  }
});

// ─── Leaderboard ────────────────────────────────────────────────────────────

app.get("/leaderboard", async (req, res) => {
  try {
    console.log(`[Leaderboard] Fetching leaderboard (residents only)...`);

    const { data: leaderboard, error } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, avatar, points, reports, barangay, role")
      .eq("role", "resident")
      .order("points", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Transform to LeaderboardEntry format with rank, combined name, and badge assignment
    const entries = (leaderboard || []).map((user: any, index: number) => {
      // Assign badges based on rank
      let badge = "Member";
      if (index === 0) badge = "Gold";
      else if (index === 1) badge = "Silver";
      else if (index === 2) badge = "Bronze";

      return {
        rank: index + 1,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Anonymous",
        points: user.points || 0,
        reports: user.reports || 0,
        verified: user.role === "resident",
        avatar: user.avatar || "👤",
        badge,
        barangay: user.barangay || "Unknown",
      };
    });

    res.json(entries);
  } catch (err) {
    console.error(`[Leaderboard] Error:`, err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ─── Profile ────────────────────────────────────────────────────────────────

/** GET /profile/:userId - Fetch user profile details */
app.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[Profile] Fetching profile for user: ${userId}`);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error(`[Profile] User not found: ${userId}`);
      return res.status(404).json({ error: "User profile not found" });
    }

    // Fetch user's report count
    const { data: userReports, error: reportsError } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (reportsError) {
      console.error(`[Profile] Error fetching report count:`, reportsError);
    }

    // Build response
    const userProfile = {
      id: profile.id,
      first_name: profile.first_name || "User",
      last_name: profile.last_name || "",
      avatar: profile.avatar || "👤",
      barangay: profile.barangay || "Unknown",
      role: profile.role || "user",
      points: profile.points || 0,
      reports: userReports?.length || 0,
      badge: profile.badge || "Member",
      verified: profile.verified || false,
      joined: profile.joined || new Date(profile.created_at).toISOString().split("T")[0],
      bio: profile.bio || "",
      email: profile.email,
      phone: profile.phone,
      email_verified: profile.email_verified || false,
      verification_status: profile.verification_status || "unverified",
      id_document_url: profile.id_document_url,
      achievements: [],
    };

    res.json(userProfile);
  } catch (err) {
    console.error(`[Profile] Error:`, err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// ─── Analytics: Barangay Breakdown ──────────────────────────────────────────

app.get("/analytics/barangay", async (req, res) => {
  try {
    console.log(`[Analytics/Barangay] Fetching barangay data...`);

    // Get reports with user barangay info by joining with user_profiles
    const { data: reportData, error } = await supabase
      .from("reports")
      .select("status, user_id")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Get user barangay data
    const { data: userData } = await supabase
      .from("user_profiles")
      .select("id, barangay");

    // Create a map of user_id -> barangay
    const userBarangayMap = new Map();
    (userData || []).forEach((user: any) => {
      userBarangayMap.set(user.id, user.barangay || "Unknown");
    });

    // Group reports by barangay
    const barangays = new Map();
    (reportData || []).forEach((report: any) => {
      const brgy = userBarangayMap.get(report.user_id) || "Unknown";
      if (!barangays.has(brgy)) {
        barangays.set(brgy, { reports: 0, resolved: 0 });
      }

      const stats = barangays.get(brgy);
      if (report.status === "resolved") {
        stats.resolved++;
      } else {
        stats.reports++;
      }
    });

    res.json(Array.from(barangays, ([name, data]) => ({ name, ...data })));
  } catch (err) {
    console.error(`[Analytics/Barangay] Error:`, err);
    res.status(500).json({ error: "Failed to fetch barangay analytics" });
  }
});

// ─── Admin Statistics ────────────────────────────────────────────────────────

app.get("/admin/stats", async (req, res) => {
  try {
    console.log(`[AdminStats] Fetching admin statistics...`);

    // Get pending verification count
    const { count: pendingCount } = await supabase
      .from("pending_verification")
      .select("*", { count: "exact", head: true });

    // Get total users (verified)
    const { count: verifiedCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    // Get report stats
    const { data: allReports } = await supabase
      .from("reports")
      .select("status");

    const reports = allReports || [];
    const pending = reports.filter((r: any) => r.status === "pending").length;
    const inProgress = reports.filter((r: any) => r.status === "in_progress").length;
    const resolved = reports.filter((r: any) => r.status === "resolved").length;

    // Calculate total users and response rate
    const totalUsers = (verifiedCount || 0) + (pendingCount || 0);
    const responseRate = reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 0;

    res.json({
      totalUsers,
      totalReports: reports.length,
      pendingReview: pending,
      resolved,
      responseRate,
      pendingVerification: pendingCount || 0,
    });
  } catch (err) {
    console.error(`[AdminStats] Error:`, err);
    res.status(500).json({ error: "Failed to fetch admin statistics" });
  }
});

// ─── Pending Verification Users (Admin Verification Queue) ───────────────────

app.get("/users", async (req, res) => {
  try {
    console.log(`[Users] Fetching pending verification users...`);

    const { data: pendingUsers, error } = await supabase
      .from("pending_verification")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform pending_verification data to UserProfile format
    const users = (pendingUsers || []).map((user: any) => ({
      id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      barangay: user.barangay,
      role: user.role,
      points: 0,
      reports: 0,
      badge: "pending",
      verified: false,
      email_verified: false,
      verification_status: user.verification_status,
      id_document_url: user.id_document_url,
      email: user.email,
      phone: user.phone,
      joined: user.created_at,
      bio: "",
      achievements: [],
    }));

    res.json(users);
  } catch (err) {
    console.error(`[Users] Error:`, err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─── Verified Users (From user_profiles for Admin Users Tab) ────────────────

app.get("/verified-users", async (req, res) => {
  try {
    console.log(`[VerifiedUsers] Fetching verified users from user_profiles...`);

    const { data: verifiedUsers, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("joined", { ascending: false });

    if (error) throw error;

    // Transform user_profiles data to UserProfile format
    const users = (verifiedUsers || []).map((user: any) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      barangay: user.barangay,
      role: user.role,
      points: user.points || 0,
      reports: user.reports || 0,
      badge: user.badge || "",
      verified: true,
      email: user.email,
      phone: user.phone,
      joined: user.joined,
      bio: user.bio,
      achievements: [],
    }));

    res.json(users);
  } catch (err) {
    console.error(`[VerifiedUsers] Error:`, err);
    res.status(500).json({ error: "Failed to fetch verified users" });
  }
});

/** GET /emergency-contacts - Fetch all emergency contacts */
app.get("/emergency-contacts", async (req, res) => {
  try {
    console.log(`[EmergencyContacts] Fetching emergency contacts...`);

    const { data: contacts, error } = await supabase
      .from("emergency_contacts")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    res.json(contacts || []);
  } catch (err) {
    console.error(`[EmergencyContacts] Error:`, err);
    res.status(500).json({ error: "Failed to fetch emergency contacts" });
  }
});

// ─── Approve User (Move from pending_verification to user_profiles) ──────────

app.post("/admin/approve-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[ApproveUser] Approving user ${userId}...`);

    // Get pending verification user
    const { data: pendingUser, error: fetchError } = await supabase
      .from("pending_verification")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError || !pendingUser) {
      console.error(`[ApproveUser] User not found in pending_verification:`, fetchError);
      return res.status(404).json({ error: "User not found in pending verification" });
    }

    // Update auth user metadata to mark as approved
    console.log(`[ApproveUser] Updating auth metadata for ${userId}...`);
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          first_name: pendingUser.first_name,
          last_name: pendingUser.last_name,
          role: pendingUser.role,
          barangay: pendingUser.barangay,
          avatar: pendingUser.avatar,
          verified: true,
        },
      });
    } catch (metaErr) {
      console.warn(`[ApproveUser] Could not update auth metadata (non-critical):`, metaErr);
    }

    // Create user_profiles entry
    const { error: insertError } = await supabase
      .from("user_profiles")
      .insert({
        id: pendingUser.user_id,
        email: pendingUser.email,
        first_name: pendingUser.first_name,
        last_name: pendingUser.last_name,
        phone: pendingUser.phone,
        barangay: pendingUser.barangay,
        avatar: pendingUser.avatar,
        role: pendingUser.role,
        bio: "",
        badge: "",
        points: 0,
        verified: true,
      });

    if (insertError) {
      console.error(`[ApproveUser] Error creating user_profiles:`, insertError);
      return res.status(500).json({ error: "Failed to create user profile" });
    }

    // Delete from pending_verification
    const { error: deleteError } = await supabase
      .from("pending_verification")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error(`[ApproveUser] Error deleting from pending_verification:`, deleteError);
      return res.status(500).json({ error: "Failed to complete approval" });
    }

    console.log(`[ApproveUser] Successfully approved user ${userId}`);
    res.json({ success: true, message: "User approved and moved to verified users" });
  } catch (err) {
    console.error(`[ApproveUser] Error:`, err);
    res.status(500).json({ error: "Failed to approve user" });
  }
});

// ─── Reject User (Delete from pending_verification) ─────────────────────────

app.post("/admin/reject-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    console.log(`[RejectUser] Rejecting user ${userId}...`);

    // Delete from pending_verification
    const { error: deleteError } = await supabase
      .from("pending_verification")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error(`[RejectUser] Error deleting from pending_verification:`, deleteError);
      return res.status(500).json({ error: "Failed to reject user" });
    }

    // Also delete the auth user
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn(`[RejectUser] Could not delete auth user (may already be deleted):`, authErr);
    }

    console.log(`[RejectUser] Successfully rejected user ${userId}`);
    res.json({ success: true, message: "User rejected and removed from pending verification" });
  } catch (err) {
    console.error(`[RejectUser] Error:`, err);
    res.status(500).json({ error: "Failed to reject user" });
  }
});

// ─── Admin Report Verification ───────────────────────────────────────────────

/** GET /admin/reports/pending - Get pending verification reports */
app.get("/admin/reports/pending", async (req, res) => {
  try {
    console.log("[AdminPendingReports] Fetching pending verification reports...");

    const { data: pendingReports, error } = await supabase
      .from("reports")
      .select("id, title, description, category, location, status, reporter, avatar, image_url, created_at, comments, upvotes, user_id, admin_notes")
      .eq("status", "pending_verification")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[AdminPendingReports] Error:", error);
      return res.status(500).json({ error: "Failed to fetch pending reports" });
    }

    console.log(`[AdminPendingReports] Found ${pendingReports?.length || 0} pending reports`);
    res.json(pendingReports || []);
  } catch (err) {
    console.error("[AdminPendingReports] Error:", err);
    res.status(500).json({ error: "Failed to fetch pending reports" });
  }
});

/** POST /admin/reports/:id/approve - Approve a pending report */
app.post("/admin/reports/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    // Get admin user ID from token
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(token);
    if (!adminUser || userError) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`[ApproveReport] Admin ${adminUser.id} approving report ${id}`);

    // Update report status to approved
    const now = new Date().toISOString();
    const { data: approvedReport, error: updateError } = await supabase
      .from("reports")
      .update({
        status: "approved",
        approved_by: adminUser.id,
        approved_at: now,
        verified: true,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !approvedReport) {
      console.error("[ApproveReport] Error updating report:", updateError);
      return res.status(500).json({ error: "Failed to approve report" });
    }

    // Award points to reporter via leaderboard
    if (approvedReport.user_id) {
      const { error: pointsError } = await supabase
        .from("leaderboard")
        .update({
          points: supabase.raw("points + 50"),
          updated_at: now,
        })
        .eq("user_id", approvedReport.user_id);

      if (pointsError) {
        console.warn("[ApproveReport] Warning: Could not update leaderboard points:", pointsError);
      } else {
        console.log(`[ApproveReport] ✅ Awarded 50 points to reporter ${approvedReport.user_id}`);
      }
    }

    console.log(`[ApproveReport] ✅ Report ${id} approved`);
    res.json({ success: true, message: "Report approved and points awarded", report: approvedReport });
  } catch (err) {
    console.error("[ApproveReport] Error:", err);
    res.status(500).json({ error: "Failed to approve report" });
  }
});

/** POST /admin/reports/:id/reject - Reject a pending report */
app.post("/admin/reports/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    // Get admin user ID from token
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(token);
    if (!adminUser || userError) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`[RejectReport] Admin ${adminUser.id} rejecting report ${id}. Reason: ${reason}`);

    // Update report status to rejected
    const now = new Date().toISOString();
    const { data: rejectedReport, error: updateError } = await supabase
      .from("reports")
      .update({
        status: "rejected",
        rejected_by: adminUser.id,
        rejected_at: now,
        rejection_reason: reason || "No reason provided",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !rejectedReport) {
      console.error("[RejectReport] Error updating report:", updateError);
      return res.status(500).json({ error: "Failed to reject report" });
    }

    console.log(`[RejectReport] ✅ Report ${id} rejected`);
    res.json({ success: true, message: "Report rejected", report: rejectedReport });
  } catch (err) {
    console.error("[RejectReport] Error:", err);
    res.status(500).json({ error: "Failed to reject report" });
  }
});

// ─── Announcements ───────────────────────────────────────────────────────────

/** GET /announcements - Fetch all announcements */
app.get("/announcements", async (req, res) => {
  try {
    console.log("[Announcements] Fetching all announcements...");
    
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("date", { ascending: false });

    if (error) {
      console.error("[Announcements] Error fetching announcements:", error);
      return res.status(500).json({ error: "Failed to fetch announcements" });
    }

    console.log(`[Announcements] Retrieved ${data?.length || 0} announcements`);
    res.json(data || []);
  } catch (err) {
    console.error("[Announcements] Error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/** POST /announcements - Create a new announcement (admin only) */
app.post("/announcements", async (req, res) => {
  try {
    const { title, content, category, author, author_role, pinned, urgent, image } = req.body;
    
    console.log("[CreateAnnouncement] Creating announcement:", { title, category });
    
    // Basic validation
    if (!title || !content || !category || !author) {
      return res.status(400).json({
        error: "Missing required fields: title, content, category, author",
      });
    }

    // Generate unique ID (timestamp + random component)
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    
    const { data, error } = await supabase
      .from("announcements")
      .insert([
        {
          id,
          title,
          content,
          category,
          author,
          author_role: author_role,
          pinned: pinned || false,
          urgent: urgent || false,
          image: image || null,
          date: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("[CreateAnnouncement] Error creating announcement:", error);
      return res.status(500).json({ error: "Failed to create announcement" });
    }

    console.log(`[CreateAnnouncement] ✅ Created announcement: ${title}`);
    res.status(201).json(data?.[0] || { success: true });
  } catch (err) {
    console.error("[CreateAnnouncement] Error:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

/** DELETE /announcements/:id - Delete an announcement (admin only) */
app.delete("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[DeleteAnnouncement] Deleting announcement ${id}...`);
    
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[DeleteAnnouncement] Error deleting announcement:`, error);
      return res.status(500).json({ error: "Failed to delete announcement" });
    }

    console.log(`[DeleteAnnouncement] ✅ Deleted announcement ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[DeleteAnnouncement] Error:`, err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

/** PUT /announcements/:id - Update an announcement (admin only) */
app.put("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, author, author_role, pinned, urgent, image } = req.body;
    
    console.log(`[UpdateAnnouncement] Updating announcement ${id}...`);
    
    const { data, error } = await supabase
      .from("announcements")
      .update({
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        ...(author && { author }),
        ...(author_role && { author_role: author_role }),
        ...(typeof pinned === "boolean" && { pinned }),
        ...(typeof urgent === "boolean" && { urgent }),
        ...(image !== undefined && { image }),
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error(`[UpdateAnnouncement] Error updating announcement:`, error);
      return res.status(500).json({ error: "Failed to update announcement" });
    }

    console.log(`[UpdateAnnouncement] ✅ Updated announcement ${id}`);
    res.json(data?.[0] || { success: true });
  } catch (err) {
    console.error(`[UpdateAnnouncement] Error:`, err);
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// ─── Patrol Endpoints ─────────────────────────────────────────────────────────

/** GET /patrol/active-case - Get the currently active case for patrol officer */
app.get("/patrol/active-case", async (req, res) => {
  try {
    console.log("[PatrolActiveCase] Fetching active case for patrol officer...");
    
    // Get patrol officer's ID from query parameter (should come from auth in real implementation)
    const patrolId = req.query.patrolId || "PAT-001";
    console.log(`[PatrolActiveCase] Looking for cases accepted by: ${patrolId}`);
    
    // First check in-memory patrol incidents store
    let active: PatrolIncident | undefined;
    for (const incident of patrolIncidentsStore.values()) {
      if (
        (incident.status === "in_progress" || incident.status === "accepted") &&
        incident.assignedPatrol === patrolId &&
        incident.acceptedBy === patrolId  // Require explicit acceptance
      ) {
        active = incident;
        break;
      }
    }
    
    if (active) {
      console.log(`[PatrolActiveCase] Found active case in store: ${active.id} (${active.title})`);
      
      return res.json({
        id: active.id,
        title: active.title,
        category: active.category,
        priority: active.priority,
        location: active.address,
        address: active.address,
        distance: "250m",
        eta: "2 min",
        timeReported: active.timeReported,
        reporter: active.reporter || "Anonymous",
        reporterAvatar: active.reporterAvatar || "AN",
        reporterContact: active.reporterContact || "N/A",
        reporterNotes: active.reporterNotes || "",
        status: active.status,
        coordinates: active.location,
        assignedAt: active.assignedAt || active.timeReported,
        acceptedAt: active.acceptedAt || null,
      });
    }
    
    // Fall back to Supabase reports table for accepted reports
    console.log("[PatrolActiveCase] No active case in store, checking Supabase...");
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("patrol_assigned_to", patrolId)
      .in("status", ["accepted", "in_progress"])
      .limit(1);
    
    if (error) {
      console.error("[PatrolActiveCase] Supabase error:", error);
      return res.json(null);
    }
    
    if (!reports || reports.length === 0) {
      console.log(`[PatrolActiveCase] No accepted cases found for ${patrolId}`);
      return res.json(null);
    }
    
    const report = reports[0];
    console.log(`[PatrolActiveCase] Found active case in Supabase: ${report.id} (${report.title})`);
    
    res.json({
      id: report.id,
      title: report.title,
      category: report.category || "General",
      priority: report.priority || "medium",
      location: report.location,
      address: report.location,
      distance: "250m",
      eta: "2 min",
      timeReported: report.timestamp,
      reporter: report.author_email || "Anonymous",
      reporterAvatar: "AN",
      reporterContact: "N/A",
      reporterNotes: report.description || "",
      status: report.status,
      acceptedBy: report.status === "accepted" ? report.patrol_assigned_to : null,
      coordinates: { lat: 15.0582, lng: 120.1962 },
      assignedAt: report.timestamp,
      acceptedAt: report.timestamp,
    });
  } catch (err) {
    console.error("[PatrolActiveCase] Error:", err);
    res.status(500).json({ error: "Failed to fetch active case" });
  }
});

/** GET /patrol/assigned - Get all assigned reports for patrol officer */
app.get("/patrol/assigned", async (req, res) => {
  try {
    console.log("[PatrolAssigned] Fetching assigned reports...");
    
    // Query from patrol incidents store instead of reports table
    const incidents: PatrolIncident[] = Array.from(patrolIncidentsStore.values());
    
    const reports = incidents
      .filter(i => i.status === "pending" || (i.assignedPatrol && i.assignedPatrol !== "PAT-001"))
      .map(i => ({
        id: i.id,
        title: i.title,
        category: i.category,
        priority: i.priority,
        location: i.address,
        distance: "N/A",
        timeReported: i.timeReported,
        status: i.status,
        reporter: i.reporter || "Anonymous",
        reporterAvatar: i.reporterAvatar || "AN",
        description: i.reporterNotes || "",
      }));
    
    console.log(`[PatrolAssigned] Found ${reports.length} assigned reports`);
    res.json(reports);
  } catch (err) {
    console.error("[PatrolAssigned] Error:", err);
    res.status(500).json({ error: "Failed to fetch assigned reports" });
  }
});

/** POST /patrol/cases/:id/accept - Accept a case (available or admin-assigned) */
app.post("/patrol/cases/:id/accept", async (req, res) => {
  try {
    const caseId = req.params.id;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    
    // Get patrol user ID from token
    const { data: { user: patrolUser }, error: userError } = await supabase.auth.getUser(token);
    if (!patrolUser || userError) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const patrolId = patrolUser.id;
    console.log(`[PatrolCaseAccept] Patrol ${patrolId} accepting case ${caseId}...`);
    
    // Get the report from Supabase
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", caseId)
      .single();
    
    if (reportError || !report) {
      console.error(`[PatrolCaseAccept] Case ${caseId} not found:`, reportError);
      return res.status(404).json({ error: "Case not found" });
    }

    // Verify report is in approved status (ready for patrol)
    if (report.status !== "approved") {
      return res.status(400).json({ error: `Report must be approved before patrol can accept it. Current status: ${report.status}` });
    }
    
    // Update the report to in_progress status
    const now = new Date().toISOString();
    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update({ 
        status: "in_progress",
        patrol_assigned_to: patrolId,
        resolved_by: patrolId,  // Will be updated to show who's handling it
      })
      .eq("id", caseId)
      .select()
      .single();
    
    if (updateError) {
      console.error(`[PatrolCaseAccept] Error updating report:`, updateError);
      return res.status(500).json({ error: "Failed to accept case" });
    }
    
    console.log(`[PatrolCaseAccept] ✅ Case ${caseId} accepted by ${patrolId}, status changed to in_progress`);
    
    res.json({
      success: true,
      message: `Case accepted and status changed to in_progress`,
      report: updatedReport
    });
  } catch (err) {
    console.error("[PatrolCaseAccept] Error:", err);
    res.status(500).json({ error: "Failed to accept case" });
  }
});

/** POST /patrol/cases/:id/cancel - Cancel/unassign a case */
app.post("/patrol/cases/:id/cancel", async (req, res) => {
  try {
    const caseId = req.params.id;
    const patrolId = String(req.query.patrolId || "PAT-001");
    
    console.log(`[PatrolCaseCancel] Patrol ${patrolId} canceling case ${caseId}...`);
    
    // First try patrol incidents store
    let incident = patrolIncidentsStore.get(caseId);
    if (incident) {
      // Reset the incident status to pending
      incident.status = "pending";
      incident.assignedPatrol = null;
      incident.acceptedBy = null;
      incident.acceptedAt = null;
      patrolIncidentsStore.set(caseId, incident);
      
      console.log(`[PatrolCaseCancel] ✅ Case ${caseId} canceled by ${patrolId} (from incidents store)`);
      return res.json({ success: true });
    }
    
    // If not found in store, try Supabase reports table
    console.log(`[PatrolCaseCancel] Case not in store, checking Supabase...`);
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", caseId)
      .single();
    
    if (error || !report) {
      console.error(`[PatrolCaseCancel] Case ${caseId} not found`);
      return res.status(404).json({ error: "Case not found" });
    }
    
    // Update the report: reset status to pending and clear patrol assignment
    console.log(`[PatrolCaseCancel] Updating report with: patrol_assigned_to=null, status=pending`);
    
    const { data: updatedData, error: updateError } = await supabase
      .from("reports")
      .update({ 
        patrol_assigned_to: null,
        status: "pending"
      })
      .eq("id", caseId)
      .select();
    
    if (updateError) {
      console.error(`[PatrolCaseCancel] Error updating report:`, updateError);
      return res.status(500).json({ error: "Failed to cancel case", details: updateError });
    }
    
    if (!updatedData || updatedData.length === 0) {
      console.error(`[PatrolCaseCancel] Update returned no data for ${caseId}`);
      return res.status(500).json({ error: "Failed to update case in database" });
    }
    
    console.log(`[PatrolCaseCancel] ✅ Case ${caseId} canceled by ${patrolId}. Updated data:`, {
      id: updatedData[0].id,
      status: updatedData[0].status,
      patrol_assigned_to: updatedData[0].patrol_assigned_to
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[PatrolCaseCancel] Error:", err);
    res.status(500).json({ error: "Failed to cancel case" });
  }
});

/** GET /patrol/history - Get patrol officer's resolution history */
app.get("/patrol/history", async (req, res) => {
  try {
    console.log("[PatrolHistory] Fetching history...");
    
    const { data: incidents, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "resolved")
      .order("timestamp", { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    const history = (incidents || []).map(i => ({
      id: i.id,
      title: i.title,
      category: i.category,
      priority: i.priority,
      status: "resolved",
      timeReported: i.timestamp,
      timeResolved: new Date().toISOString(),
      responseTime: "2.5",
      notes: i.description || "",
    }));
    
    console.log(`[PatrolHistory] Found ${history.length} resolved cases`);
    res.json(history);
  } catch (err) {
    console.error("[PatrolHistory] Error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/** POST /patrol/history - Log a resolved case */
app.post("/patrol/history", async (req, res) => {
  try {
    const { caseId, resolution, notes, category } = req.body;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    // Get patrol user ID from token
    const { data: { user: patrolUser }, error: userError } = await supabase.auth.getUser(token);
    if (!patrolUser || userError) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`[PatrolHistoryPost] Patrol ${patrolUser.id} logging resolution for case ${caseId}...`);
    
    // Get the report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", caseId)
      .single();

    if (reportError || !report) {
      console.error("[PatrolHistoryPost] Report not found:", reportError);
      return res.status(404).json({ error: "Report not found" });
    }

    // Verify report is in in_progress status
    if (report.status !== "in_progress") {
      return res.status(400).json({ error: `Report must be in_progress before marking as resolved. Current status: ${report.status}` });
    }

    // Update the report to resolved status
    const now = new Date().toISOString();
    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: patrolUser.id,
        resolved_at: now,
        admin_notes: notes || null,
      })
      .eq("id", caseId)
      .select()
      .single();

    if (updateError) {
      console.error("[PatrolHistoryPost] Error updating report:", updateError);
      return res.status(500).json({ error: "Failed to resolve report" });
    }

    console.log(`[PatrolHistoryPost] ✅ Case ${caseId} resolved by patrol ${patrolUser.id}`);

    // Award additional points to reporter when resolved
    if (report.user_id) {
      const { error: pointsError } = await supabase
        .from("leaderboard")
        .update({
          points: supabase.raw("points + 25"),
          updated_at: now,
        })
        .eq("user_id", report.user_id);

      if (pointsError) {
        console.warn("[PatrolHistoryPost] Warning: Could not update leaderboard points:", pointsError);
      } else {
        console.log(`[PatrolHistoryPost] ✅ Awarded 25 resolution points to reporter ${report.user_id}`);
      }
    }

    res.json({
      success: true,
      message: "Report marked as resolved and resident awarded points",
      id: caseId,
      status: "resolved",
      resolution,
      notes,
      category,
      report: updatedReport,
    });
  } catch (err) {
    console.error("[PatrolHistoryPost] Error:", err);
    res.status(500).json({ error: "Failed to log history" });
  }
});

/** GET /patrol/stats - Get patrol officer statistics */
app.get("/patrol/stats", async (req, res) => {
  try {
    console.log("[PatrolStats] Fetching stats...");
    
    // Fetch resolved reports for stats
    const { data: resolved, error: resolvedError } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "resolved");
    
    if (resolvedError) throw resolvedError;
    
    const today = new Date().toDateString();
    const todayResolved = (resolved || []).filter(
      r => new Date(r.timestamp).toDateString() === today
    );
    
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekResolved = (resolved || []).filter(
      r => new Date(r.timestamp).getTime() >= weekAgo
    );
    
    // Calculate average response time
    const calculateAvgResponse = (items: any[]) => {
      if (!items.length) return "N/A";
      // Simulate response time between 2-5 minutes
      return `${(2 + Math.random() * 3).toFixed(1)} min`;
    };
    
    // Get top category
    const categories: Record<string, number> = {};
    (resolved || []).forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";
    
    // Calculate clearance rate
    const clearRate = resolved && resolved.length > 0 
      ? Math.round((resolved.filter(r => r.status === "resolved").length / resolved.length) * 100)
      : 0;
    
    const stats = {
      today: {
        completed: todayResolved.length,
        avgResponse: calculateAvgResponse(todayResolved),
        distance: "12.4 km",
        rank: 3,
      },
      week: {
        completed: weekResolved.length,
        avgResponse: calculateAvgResponse(weekResolved),
        clearanceRate: clearRate,
      },
      month: {
        completed: resolved?.length || 0,
        topCategory: topCategory,
        commendations: Math.max(0, Math.floor((resolved?.length || 0) / 5)),
      },
    };
    
    console.log("[PatrolStats] Stats calculated:", stats);
    res.json(stats);
  } catch (err) {
    console.error("[PatrolStats] Error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/** GET /patrol/admin-assigned/:userId - Get reports assigned by admin to this patrol officer */
app.get("/patrol/admin-assigned/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("[PatrolAdminAssigned] Fetching admin-assigned reports for:", userId);
    
    // Get patrol assignments pending for this officer
    const { data: assignments, error: assignError } = await supabase
      .from("patrol_assignments")
      .select("report_id, assignment_status, assigned_at")
      .eq("assigned_patrol_id", userId)
      .eq("assignment_status", "pending");
    
    if (assignError) throw assignError;
    
    if (!assignments || assignments.length === 0) {
      console.log("[PatrolAdminAssigned] No admin-assigned reports found");
      return res.json([]);
    }
    
    // Get the reports for these assignments
    const reportIds = assignments.map((a: any) => a.report_id);
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .in("id", reportIds);
    
    if (reportsError) throw reportsError;
    
    // Map to PatrolCaseSummary format
    const caseSummaries = (reports || []).map((r: any) => ({
      id: r.id,
      title: r.title || "Untitled",
      description: r.description || "",
      status: r.status,
      priority: r.priority || "medium",
      location: r.location || "Unknown",
      category: r.category || "General",
      timestamp: r.timestamp,
      reporter: r.author_email || "Anonymous",
      assignedTo: userId,
      acceptedBy: r.status === "accepted" ? r.patrol_assigned_to : null,
    }));
    
    console.log("[PatrolAdminAssigned] Returning", caseSummaries.length, "admin-assigned reports");
    res.json(caseSummaries);
  } catch (err) {
    console.error("[PatrolAdminAssigned] Error:", err);
    res.status(500).json({ error: "Failed to fetch admin-assigned reports" });
  }
});

/** GET /patrol/available - Get reports available for patrol officers to self-assign */
app.get("/patrol/available", async (req, res) => {
  try {
    console.log("[PatrolAvailable] Fetching available reports...");
    
    // Get reports that don't have a patrol assignment yet
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .is("patrol_assigned_to", null)
      .eq("status", "pending")
      .limit(20);
    
    if (error) throw error;
    
    // Map to PatrolCaseSummary format
    const caseSummaries = (reports || []).map((r: any) => ({
      id: r.id,
      title: r.title || "Untitled",
      description: r.description || "",
      status: r.status,
      priority: r.priority || "medium",
      location: r.location || "Unknown",
      category: r.category || "General",
      timestamp: r.timestamp,
      reporter: r.author_email || "Anonymous",
      assignedTo: null,
      acceptedBy: r.status === "accepted" ? r.patrol_assigned_to : null,
    }));
    
    console.log("[PatrolAvailable] Returning", caseSummaries.length, "available reports");
    res.json(caseSummaries);
  } catch (err) {
    console.error("[PatrolAvailable] Error:", err);
    res.status(500).json({ error: "Failed to fetch available reports" });
  }
});

// ─── Patrol Monitoring Endpoints ─────────────────────────────────────────────

/** GET /patrol/units - Fetch all patrol units */
app.get("/patrol/units", async (req, res) => {
  try {
    console.log(`[PatrolUnits] Fetching patrol units...`);

    const { data: units, error } = await supabase
      .from("patrol_units")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform database format to API format
    const transformedUnits = (units || []).map((unit: any) => ({
      id: unit.id,
      name: unit.name,
      avatar: unit.avatar,
      unit: unit.unit,
      badgeNumber: unit.badge_number,
      rank: unit.rank,
      status: unit.status,
      currentCase: unit.current_case,
      currentCaseTitle: unit.current_case_title,
      location: { lat: unit.location_lat || 0, lng: unit.location_lng || 0 },
      lastUpdated: unit.last_updated,
      phone: unit.phone,
      casesToday: unit.cases_today || 0,
      avgResponse: unit.avg_response,
      shiftStart: unit.shift_start,
      shiftEnd: unit.shift_end,
    }));

    console.log(`[PatrolUnits] ✅ Returning ${transformedUnits.length} patrol units`);
    res.json(transformedUnits);
  } catch (err) {
    console.error(`[PatrolUnits] Error:`, err);
    res.status(500).json({ error: "Failed to fetch patrol units" });
  }
});

/** GET /patrol/incidents - Fetch all incidents (from reports table) */
app.get("/patrol/incidents", async (req, res) => {
  try {
    console.log(`[PatrolIncidents] Fetching incidents from reports...`);

    const { data: incidents, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Default to Olongapo, Philippines coordinates
    const DEFAULT_LAT = 14.3955;
    const DEFAULT_LNG = 120.2854;

    // Transform database format to API format
    const transformedIncidents = (incidents || []).map((incident: any) => ({
      id: incident.id,
      title: incident.title,
      category: incident.category,
      priority: incident.priority,
      location: { 
        lat: incident.location_lat || DEFAULT_LAT,
        lng: incident.location_lng || DEFAULT_LNG
      },
      address: incident.location || "Olongapo, Philippines",
      status: incident.status || "pending",
      assignedPatrol: null,
      timeReported: incident.timestamp || incident.created_at,
    }));

    console.log(`[PatrolIncidents] ✅ Returning ${transformedIncidents.length} incidents from reports`);
    res.json(transformedIncidents);
  } catch (err) {
    console.error(`[PatrolIncidents] Error:`, err);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

/** GET /patrol/messages - Fetch all patrol dispatch messages */
app.get("/patrol/messages", async (req, res) => {
  try {
    console.log(`[PatrolMessages] Fetching patrol messages...`);

    const { data: messages, error } = await supabase
      .from("patrol_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform database format to API format
    const transformedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      from: msg.from,
      to: msg.to,
      message: msg.message,
      time: msg.time,
      read: msg.read || false,
    }));

    console.log(`[PatrolMessages] ✅ Returning ${transformedMessages.length} patrol messages`);
    res.json(transformedMessages);
  } catch (err) {
    console.error(`[PatrolMessages] Error:`, err);
    res.status(500).json({ error: "Failed to fetch patrol messages" });
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🚀 Local registration server running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`\n  📝 Registration Endpoints:`);
  console.log(`  POST   http://localhost:${PORT}/register         [Step 1: Validate personal info (no DB)]`);
  console.log(`  POST   http://localhost:${PORT}/generate-otp     [Step 3a: Send OTP (memory only)]`);
  console.log(`  POST   http://localhost:${PORT}/verify-otp       [Step 3c: Verify OTP + create auth + profile]`);
  console.log(`  POST   http://localhost:${PORT}/resend-otp       [Regenerate OTP (memory only)]`);
  console.log(`\n  📊 Dashboard & Admin Endpoints:`);
  console.log(`  GET    http://localhost:${PORT}/dashboard/stats  [Dashboard stats (reports, users, pending)]`);
  console.log(`  GET    http://localhost:${PORT}/admin/stats      [Admin statistics (pending, verified, reports)]`);
  console.log(`  GET    http://localhost:${PORT}/reports          [Fetch all reports]`);
  console.log(`  POST   http://localhost:${PORT}/reports          [Create new report with token]`);
  console.log(`  GET    http://localhost:${PORT}/reports/:id/comments [Fetch comments for report]`);
  console.log(`  POST   http://localhost:${PORT}/reports/:id/comments [Add comment to report]`);
  console.log(`  POST   http://localhost:${PORT}/reports/:id/upvote [Toggle upvote on report]`);
  console.log(`  GET    http://localhost:${PORT}/user/upvotes    [Fetch current user's upvoted reports]`);
  console.log(`  GET    http://localhost:${PORT}/analytics/monthly [Monthly report trends]`);
  console.log(`  GET    http://localhost:${PORT}/analytics/categories [Report categories breakdown]`);
  console.log(`  GET    http://localhost:${PORT}/analytics/weekly [Weekly activity]`);
  console.log(`  GET    http://localhost:${PORT}/analytics/barangay [Barangay breakdown]`);
  console.log(`  GET    http://localhost:${PORT}/leaderboard      [User leaderboard]`);
  console.log(`  GET    http://localhost:${PORT}/profile/:userId  [Fetch user profile details]`);
  console.log(`  GET    http://localhost:${PORT}/users            [Pending verification users (admin queue)]`);
  console.log(`  GET    http://localhost:${PORT}/verified-users   [Fetch all verified/approved users]`);
  console.log(`  GET    http://localhost:${PORT}/emergency-contacts [Fetch emergency contacts]`);
  console.log(`\n  � Chat Endpoints (Real-Time Messaging):`);
  console.log(`  POST   http://localhost:${PORT}/conversations    [Create/get conversation]`);
  console.log(`  GET    http://localhost:${PORT}/conversations    [List all conversations]`);
  console.log(`  GET    http://localhost:${PORT}/conversations/:id/messages [Fetch messages in conversation]`);
  console.log(`  POST   http://localhost:${PORT}/conversations/:id/messages [Send message]`);
  console.log(`\n  �📣 Announcement Endpoints (Admin):`);
  console.log(`  GET    http://localhost:${PORT}/announcements    [Fetch all announcements]`);
  console.log(`  POST   http://localhost:${PORT}/announcements    [Create new announcement]`);
  console.log(`  DELETE http://localhost:${PORT}/announcements/:id [Delete announcement]`);
  console.log(`  PUT    http://localhost:${PORT}/announcements/:id [Update announcement]`);
  console.log(`\n  👮 Patrol Endpoints:`);
  console.log(`  GET    http://localhost:${PORT}/patrol/active-case [Get active case for patrol officer]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/assigned [Get assigned reports]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/admin-assigned/:userId [Get admin-assigned reports for patrol]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/available [Get available reports to self-assign]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/history [Get resolution history]`);
  console.log(`  POST   http://localhost:${PORT}/patrol/history [Log resolved case]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/stats [Get patrol statistics]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/units [Fetch all patrol units (monitoring)]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/incidents [Fetch all patrol incidents (monitoring)]`);
  console.log(`  GET    http://localhost:${PORT}/patrol/messages [Fetch all patrol dispatch messages (monitoring)]`);
  console.log(`\n  🏥 Utility Endpoints:`);
  console.log(`  GET    http://localhost:${PORT}/health           [Health check]`);
  console.log(`\n📝 Environment:`);
  console.log(`  SUPABASE_URL: https://cepefukwfszkgosnjmbc.supabase.co`);
  console.log(`  SENDGRID_API_KEY: ${SENDGRID_API_KEY ? "✅ Set" : "❌ Missing"}`);
  console.log("\n💡 Registration Flow (OTP Stored in Memory Only):");
  console.log("  Step 1: Frontend calls /register (validates personal info only)");
  console.log("  Step 2: User uploads ID photo");
  console.log("  Step 3a: Frontend calls /generate-otp (sends OTP to email, stores in memory)");
  console.log("  Step 3b: User enters OTP code");
  console.log("  Step 3c: Frontend calls /verify-otp");
  console.log("           ✅ Verifies OTP from memory");
  console.log("           ✅ Creates auth user");
  console.log("           ✅ Creates user profile");
  console.log("           ✅ Clears memory store");
  console.log("           ✅ Registration complete!\n");

  // Clean up stale OTPs in memory
  cleanupExpiredOtps();
  
  // Run cleanup every 5 minutes
  setInterval(cleanupExpiredOtps, 5 * 60 * 1000);
});
