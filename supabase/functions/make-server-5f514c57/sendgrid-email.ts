/**
 * SendGrid Email Service Module
 * Handles transactional email sending via SendGrid API
 * https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */

interface SendGridEmailRequest {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
  }>;
  from: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
}

/**
 * Format OTP email HTML content
 * @param otp - The 6-digit OTP code
 * @param expiryMinutes - OTP expiry time in minutes
 * @returns HTML formatted email body
 */
function formatOtpEmailHtml(otp: string, expiryMinutes: number = 15): string {
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
function formatOtpEmailText(otp: string, expiryMinutes: number = 15): string {
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

© 2026 Bantay-SP. All rights reserved.`;
}

/**
 * Send OTP verification email via SendGrid
 * @param email - Recipient email address
 * @param otp - The 6-digit OTP code
 * @param expiryMinutes - OTP expiry time in minutes (default: 5)
 * @throws Error if SendGrid API call fails
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  expiryMinutes: number = 15
): Promise<void> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY environment variable is not configured");
  }

  const emailRequest = {
    personalizations: [
      {
        to: [{ email }],
      },
    ],
    from: {
      email: "kevinmilesjulhusin99@gmail.com",
      name: "Bantay-SP",
    },
    subject: "Your Bantay-SP OTP Code",
    content: [
      {
        type: "text/plain",
        value: formatOtpEmailText(otp, expiryMinutes),
      },
      {
        type: "text/html",
        value: formatOtpEmailHtml(otp, expiryMinutes),
      },
    ],
  };

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    console.log(`[SendGrid] OTP email sent successfully to ${email}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SendGrid] Failed to send OTP email to ${email}:`, errorMsg);
    throw error;
  }
}

/**
 * Send generic transactional email via SendGrid
 * Used as utility function for future email features (password reset, announcements, etc.)
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - Email body (HTML format)
 * @param textContent - Email body (plain text format, optional)
 * @throws Error if SendGrid API call fails
 */
export async function sendEmail(
  email: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY environment variable is not configured");
  }

  const emailRequest: SendGridEmailRequest = {
    personalizations: [
      {
        to: [{ email }],
      },
    ],
    from: {
      email: "kevinmilesjulhusin99@gmail.com",
      name: "Bantay-SP",
    },
    subject,
    html: htmlContent,
    text: textContent,
  };

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    console.log(`[SendGrid] Email sent successfully to ${email}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SendGrid] Failed to send email to ${email}:`, errorMsg);
    throw error;
  }
}
