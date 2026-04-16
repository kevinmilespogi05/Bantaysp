/**
 * OTP Generation and Validation Module
 * Provides secure 6-digit OTP generation and expiry validation
 */

/**
 * Generate a secure 6-digit OTP code
 * @returns A string of 6 random digits (000000-999999)
 */
export function generateOtp(): string {
  // Use crypto for secure random generation
  const array = new Uint8Array(1);
  const codes: string[] = [];
  
  for (let i = 0; i < 6; i++) {
    crypto.getRandomValues(array);
    // Get a number between 0-9
    const digit = (array[0] % 10).toString();
    codes.push(digit);
  }
  
  return codes.join("");
}

/**
 * Check if an OTP has expired
 * @param createdAt - The timestamp when the OTP was created (ISO string or Date)
 * @param expiryMinutes - Number of minutes the OTP is valid for (default: 15)
 * @returns true if the OTP has expired, false otherwise
 *
 * IMPORTANT: Uses UTC-only timestamps. Includes 30-second clock skew tolerance
 * to handle minor time drift between client and server clocks.
 */
export function isOtpExpired(
  createdAt: string | Date,
  expiryMinutes: number = 15
): boolean {
  const createdTime = typeof createdAt === "string" 
    ? new Date(createdAt).getTime() 
    : createdAt.getTime();
  
  const currentTime = Date.now();
  
  // Calculate expiry time with 30-second clock skew tolerance
  // This prevents false "expired" errors due to minor time drift
  const expiryTimeMs = expiryMinutes * 60 * 1000;
  const clockSkewToleranceMs = 30 * 1000; // 30 seconds
  const effectiveExpiryMs = expiryTimeMs + clockSkewToleranceMs;
  
  const timeDiffMs = currentTime - createdTime;
  const isExpired = timeDiffMs > effectiveExpiryMs;
  
  // Diagnostic logging for troubleshooting timezone/clock issues
  const createdAtFormatted = new Date(createdTime).toISOString();
  const currentTimeFormatted = new Date(currentTime).toISOString();
  const timeDiffSeconds = Math.floor(timeDiffMs / 1000);
  
  console.log(
    `[OTP Expiry] created=${createdAtFormatted} ` +
    `now=${currentTimeFormatted} ` +
    `diff=${timeDiffSeconds}s/${expiryMinutes}m ` +
    `expired=${isExpired} ` +
    `(with ${clockSkewToleranceMs / 1000}s tolerance)`
  );
  
  return isExpired;
}

/**
 * Format OTP for display in email
 * @param otp - The 6-digit OTP code
 * @returns Formatted OTP with spaces (e.g., "123 456")
 */
export function formatOtpForDisplay(otp: string): string {
  return otp.slice(0, 3) + " " + otp.slice(3);
}

/**
 * Calculate remaining time until OTP expiry
 * @param createdAt - The timestamp when the OTP was created
 * @param expiryMinutes - Number of minutes the OTP is valid for (default: 5)
 * @returns Object with minutes and seconds remaining, or null if expired
 */
export function getOtpTimeRemaining(
  createdAt: string | Date,
  expiryMinutes: number = 5
): { minutes: number; seconds: number } | null {
  if (isOtpExpired(createdAt, expiryMinutes)) {
    return null;
  }
  
  const createdTime = typeof createdAt === "string" 
    ? new Date(createdAt).getTime() 
    : createdAt.getTime();
  
  const currentTime = Date.now();
  const expiryTimeMs = expiryMinutes * 60 * 1000;
  const remainingMs = expiryTimeMs - (currentTime - createdTime);
  
  const totalSeconds = Math.floor(remainingMs / 1000);
  
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}
