import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Kaizen Tracker <noreply@kaizen.tamarind.co.ke>";

// ─── Welcome email (new user with generated password) ────────────────────────

export async function sendWelcomeEmail({
  to,
  name,
  email,
  temporaryPassword,
}: {
  to: string;
  name: string;
  email: string;
  temporaryPassword: string;
}) {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Welcome to Kaizen Tracker — Your Account Details",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1f2e;">
        <div style="border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 600; margin: 0; color: #1e40af;">Kaizen Tracker</h1>
        </div>
        <p style="font-size: 15px; margin-bottom: 8px;">Hi ${name},</p>
        <p style="font-size: 15px; margin-bottom: 24px;">
          Your account has been created. You can sign in immediately using the credentials below.
        </p>
        <div style="background: #f0f4ff; border: 1px solid #c7d7ff; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 3px; font-size: 13px;">${temporaryPassword}</code></p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
          You can change your password at any time from your account settings after signing in.
        </p>
        <a href="${process.env.NEXTAUTH_URL}/login" 
           style="display: inline-block; background: #1e40af; color: #fff; text-decoration: none; 
                  padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600;">
          Sign In
        </a>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 32px;">
          If you were not expecting this email, please contact your system administrator.
        </p>
      </div>
    `,
  });
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset Your Kaizen Tracker Password",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1f2e;">
        <div style="border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 600; margin: 0; color: #1e40af;">Kaizen Tracker</h1>
        </div>
        <p style="font-size: 15px; margin-bottom: 8px;">Hi ${name},</p>
        <p style="font-size: 15px; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below — this link expires in 1 hour.
        </p>
        <a href="${resetUrl}" 
           style="display: inline-block; background: #1e40af; color: #fff; text-decoration: none; 
                  padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600;">
          Reset Password
        </a>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
