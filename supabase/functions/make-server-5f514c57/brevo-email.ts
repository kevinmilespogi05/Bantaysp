/**
 * Brevo Email Service Module
 * Handles transactional email sending via Brevo API
 * https://developers.brevo.com/reference/sendemail
 */

interface BrevoEmailRequest {
  to: Array<{ email: string; name?: string }>;
  sender: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Format OTP email HTML content
 * @param otp - The 6-digit OTP code
 * @param expiryMinutes - OTP expiry time in minutes
 * @returns HTML formatted email body
 */
function formatOtpEmailHtml(otp: string, expiryMinutes: number = 5): string {
  const formattedOtp = otp.slice(0, 3) + " " + otp.slice(3);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #667eea; font-family: 'Courier New', monospace; }
    .expiry { color: #666; font-size: 14px; margin-top: 10px; }
    .footer { color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Bantay-SP Verification</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Thank you for registering with <strong>Bantay-SP</strong>. To complete your email verification, please enter the One-Time Password (OTP) below:</p>
      
      <div class="otp-box">
        <div class="otp-code">${formattedOtp}</div>
        <div class="expiry">⏱️ Expires in ${expiryMinutes} minutes</div>
      </div>
      
      <p>If you did not request this code, please ignore this email.</p>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong> Never share your OTP with anyone. Bantay-SP support staff will never ask for your OTP.
      </div>
      
      <p>Best regards,<br><strong>Bantay-SP Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2026 Bantay-SP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Format OTP email plain text content
 * @param otp - The 6-digit OTP code
 * @param expiryMinutes - OTP expiry time in minutes
 * @returns Plain text email body
 */
function formatOtpEmailText(otp: string, expiryMinutes: number = 5): string {
  const formattedOtp = otp.slice(0, 3) + " " + otp.slice(3);
  
  return `
Bantay-SP Email Verification

Hello,

Thank you for registering with Bantay-SP. To complete your email verification, please enter the One-Time Password (OTP) below:

${formattedOtp}

⏱️ This code expires in ${expiryMinutes} minutes.

If you did not request this code, please ignore this email.

⚠️ Security Notice: Never share your OTP with anyone. Bantay-SP support staff will never ask for your OTP.

Best regards,
Bantay-SP Team

© 2026 Bantay-SP. All rights reserved.
  `.trim();
}

/**
 * Send OTP verification email via Brevo
 * @param email - Recipient email address
 * @param otp - The 6-digit OTP code
 * @param expiryMinutes - OTP expiry time in minutes (default: 5)
 * @throws Error if Brevo API call fails
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  expiryMinutes: number = 5
): Promise<void> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  
  if (!apiKey) {
    throw new Error("BREVO_API_KEY environment variable is not configured");
  }

  const emailRequest: BrevoEmailRequest = {
    to: [{ email }],
    sender: {
      email: "bantaysp@gmail.com",
      name: "BantaySP",
    },
    subject: "Your Bantay-SP OTP Code",
    htmlContent: formatOtpEmailHtml(otp, expiryMinutes),
    textContent: formatOtpEmailText(otp, expiryMinutes),
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    console.log(`[Brevo] OTP email sent successfully to ${email}. Message ID: ${result.messageId}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Brevo] Failed to send OTP email to ${email}:`, errorMsg);
    throw error;
  }
}

/**
 * Send generic transactional email via Brevo
 * Used as utility function for future email features (password reset, announcements, etc.)
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - Email body (HTML format)
 * @param textContent - Email body (plain text format, optional)
 * @throws Error if Brevo API call fails
 */
export async function sendEmail(
  email: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  
  if (!apiKey) {
    throw new Error("BREVO_API_KEY environment variable is not configured");
  }

  const emailRequest: BrevoEmailRequest = {
    to: [{ email }],
    sender: {
      email: "bantaysp@gmail.com",
      name: "BantaySP",
    },
    subject,
    htmlContent,
    textContent,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    console.log(`[Brevo] Email sent successfully to ${email}. Message ID: ${result.messageId}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Brevo] Failed to send email to ${email}:`, errorMsg);
    throw error;
  }
}
