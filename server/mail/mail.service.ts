import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../services/dbService';
import { sendResendMail } from './mail.fallback';
import * as templates from './mail.templates';

export interface MailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface EmailSettings {
  brevoEnabled?: boolean;
  resendEnabled: boolean;
  primaryProvider: 'resend';
  fallbackProvider: 'resend';
  
  // Brevo SMTP Config (retained as optional for database shape safety)
  brevoHost?: string;
  brevoPort?: number;
  brevoUser?: string;
  brevoPass?: string;
  
  // Resend API Config
  resendApiKey: string;
  
  // Senders
  systemEmailSender: string;
  welcomeEmailSender: string;
  noreplyEmailSender: string;

  // Anti-Spam / Verification Protection Controls
  otpCooldownSeconds: number;
  maxResendAttempts: number;
  lockoutDurationMinutes: number;
}

/**
 * Retrieve current logo image URL directly from Admin branding parameters in Firestore
 */
async function getLogoUrl(): Promise<string> {
  try {
    const db = getDb();
    const brandingSnap = await db.collection('settings').doc('branding').get();
    if (brandingSnap.exists) {
      const data = brandingSnap.data();
      if (data && data.main_logo_url) {
        return data.main_logo_url;
      }
    }
  } catch (err) {
    console.error("[Email Engine] Failed to fetch custom branding logo:", err);
  }
  return "https://aetheriss.online/AElogo.png"; // Dynamic safety fallback to preloaded URL
}

/**
 * Dynamic resolution of email config.
 * Resolves settings first from Firestore and defaults back to environment variables.
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  const db = getDb();
  const doc = await db.collection('settings').doc('email').get();

  const defaultSettings: EmailSettings = {
    brevoEnabled: false,
    resendEnabled: true,
    primaryProvider: 'resend',
    fallbackProvider: 'resend',
    
    resendApiKey: process.env.RESEND_API_KEY || '',
    
    systemEmailSender: process.env.RESEND_FROM_EMAIL || process.env.SYSTEM_EMAIL || "Aetheris <support@update.aetheriss.online>",
    welcomeEmailSender: process.env.RESEND_FROM_EMAIL || "Aetheris <hello@update.aetheriss.online>",
    noreplyEmailSender: process.env.VERIFY_FROM_EMAIL || "Aetheris <noreply@update.aetheriss.online>",

    otpCooldownSeconds: 60,
    maxResendAttempts: 5,
    lockoutDurationMinutes: 15
  };

  if (!doc.exists) {
    // Write defaults to firestore so the admin can instantly toggle them
    await db.collection('settings').doc('email').set(defaultSettings);
    return defaultSettings;
  }

  const merged = { ...defaultSettings, ...doc.data() };
  if (!merged.resendApiKey || merged.resendApiKey.trim() === '') {
    merged.resendApiKey = process.env.RESEND_API_KEY || '';
  }
  merged.primaryProvider = 'resend';
  merged.fallbackProvider = 'resend';
  merged.resendEnabled = true;

  return merged as any;
}

/**
 * Log transactional outcomes into Firestore for transparency and admin panel reporting.
 */
export async function logDeliveryMetric(
  to: string, 
  subject: string, 
  provider: string, 
  status: 'success' | 'failed', 
  error?: string
) {
  try {
    const db = getDb();
    await db.collection('email_logs').add({
      to,
      subject,
      provider,
      status,
      error: error || null,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("[Telemetry] Failed to persist email_logs inside Firestore:", err);
  }
}

/**
 * Dynamic dispatch logic - Exclusively routes through Resend API with dynamic logo replacement
 */
export async function sendEmailDirect(
  options: MailOptions, 
  settings?: EmailSettings,
  emailType: string = 'transactional'
): Promise<{ success: boolean; provider: string; messageId?: string; error?: string }> {
  const finalSettings = settings || await getEmailSettings();
  
  // Intercept HTML layout to dynamically inject custom website logo URL
  const logoUrl = await getLogoUrl();
  const adjustedHtml = options.html.replace(/https:\/\/aetheriss\.online\/AElogo\.png/g, logoUrl);

  let finalFrom = options.from || finalSettings.systemEmailSender || "Aetheris <support@update.aetheriss.online>";
  
  // Enforce strict professional standardized sender address routing for all outgoing mail (no-reply, support, hello)
  if (emailType === 'custom_admin') {
    finalFrom = options.from || "Aetheris Admin <support@update.aetheriss.online>";
  } else if (emailType === 'verification') {
    finalFrom = "Aetheris <verify-noreply@update.aetheriss.online>";
  } else if (emailType === 'otp' || emailType === 'verification_otp') {
    finalFrom = "Aetheris <noreply@update.aetheriss.online>";
  } else if (emailType === 'transaction' || emailType === 'transactional') {
    finalFrom = "Aetheris <no-reply@update.aetheriss.online>";
  } else if (emailType === 'support' || emailType === 'support_reply') {
    finalFrom = "Aetheris <support@update.aetheriss.online>";
  } else if (emailType === 'welcome') {
    finalFrom = "Aetheris <hello@update.aetheriss.online>";
  } else {
    // Check if from contains keys to map them correctly as fallbacks
    if (finalFrom.includes('verify-noreply') || finalFrom.includes('verification')) {
      finalFrom = "Aetheris <verify-noreply@update.aetheriss.online>";
    } else if (finalFrom.includes('no-reply')) {
      finalFrom = "Aetheris <no-reply@update.aetheriss.online>";
    } else if (finalFrom.includes('noreply')) {
      finalFrom = "Aetheris <noreply@update.aetheriss.online>";
    } else if (finalFrom.includes('hello') || finalFrom.includes('welcome')) {
      finalFrom = "Aetheris <hello@update.aetheriss.online>";
    } else if (finalFrom.includes('support')) {
      finalFrom = "Aetheris <support@update.aetheriss.online>";
    } else {
      finalFrom = "Aetheris <support@update.aetheriss.online>";
    }
  }

  const adjustedOptions = { ...options, from: finalFrom, html: adjustedHtml };

  try {
    console.log(`[Email Engine] Routing ${options.to} via Resend. Email Type: ${emailType}`);
    const result = await sendResendMail(adjustedOptions, finalSettings, emailType);
    
    if (result.success) {
      await logDeliveryMetric(options.to, options.subject, 'resend', 'success');
      return { success: true, provider: 'resend', messageId: result.messageId };
    } else {
      const finalErrorLog = result.error || 'Delivery rejected by upstream provider.';
      await logDeliveryMetric(options.to, options.subject, 'resend', 'failed', finalErrorLog);
      return { success: false, provider: 'resend', error: finalErrorLog };
    }
  } catch (err: any) {
    const catchError = err.message || String(err);
    console.error(`[Email Engine] Execution failed for ${options.to} (${emailType}):`, catchError);
    await logDeliveryMetric(options.to, options.subject, 'resend', 'failed', catchError);
    return { success: false, provider: 'resend', error: catchError };
  }
}

/**
 * OTP & Resend Throttling Protection
 * Implements strict resend cooldown timers and temporary block periods on target emails.
 */
export async function checkEmailAbuseAndLog(
  email: string, 
  actionType: string = 'otp'
): Promise<{ allowed: boolean; reason?: string; cooldownRemaining?: number }> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      return { allowed: false, reason: 'Invalid receiver format.' };
    }

    const db = getDb();
    const settings = await getEmailSettings();
    const protectionRef = db.collection('email_abuse_protection').doc(`${actionType}:${cleanEmail}`);

    const doc = await protectionRef.get();
    const now = new Date();

    if (!doc.exists) {
      await protectionRef.set({
        email: cleanEmail,
        actionType,
        attempts: 1,
        lastRequestedAt: now,
        lockedUntil: null
      });
      return { allowed: true };
    }

    const data = doc.data() || {};
    
    // 1. Check if temporary block (lockout) exists
    if (data.lockedUntil) {
      const lockedDate = data.lockedUntil.toDate();
      if (lockedDate > now) {
        const remainingMinutes = Math.ceil((lockedDate.getTime() - now.getTime()) / (60 * 1000));
        return { 
          allowed: false, 
          reason: `Request throttled due to high frequency. Please try again in ${remainingMinutes} minute(s) to verify your account safely.` 
        };
      } else {
        // Lock expired, clean up and reset attempts
        await protectionRef.update({
          attempts: 1,
          lastRequestedAt: now,
          lockedUntil: null
        });
        return { allowed: true };
      }
    }

    // 2. Check strict cooldown (typically 60-120 seconds)
    if (data.lastRequestedAt) {
      const lastRequest = data.lastRequestedAt.toDate();
      const differenceSeconds = Math.floor((now.getTime() - lastRequest.getTime()) / 1000);
      const cooldownSecs = settings.otpCooldownSeconds;
      
      if (differenceSeconds < cooldownSecs) {
        const secondsRemaining = cooldownSecs - differenceSeconds;
        return { 
          allowed: false, 
          reason: `Please wait ${secondsRemaining} second(s) before requesting another security code.`,
          cooldownRemaining: secondsRemaining
        };
      }
    }

    // 3. Track total consecutive verification attempts, lock on abuse path
    const updatedAttempts = (data.attempts || 0) + 1;
    if (updatedAttempts > settings.maxResendAttempts) {
      const blockTime = new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000);
      await protectionRef.update({
        attempts: updatedAttempts,
        lastRequestedAt: now,
        lockedUntil: blockTime
      });
      return {
        allowed: false,
        reason: `Max security verification attempts exceeded. For your protection, this verification channel is temporarily blocked for ${settings.lockoutDurationMinutes} minutes.`
      };
    }

    // Good to go, update history
    await protectionRef.update({
      attempts: updatedAttempts,
      lastRequestedAt: now,
      lockedUntil: null
    });

    return { allowed: true };
  } catch (err: any) {
    console.error("[Spam Filter] Crash in security check. Trusting execution by default.", err);
    return { allowed: true };
  }
}

/**
 * Clean resetting of anti-spam lock counters (e.g., after successful verification).
 */
export async function clearAbuseLock(email: string, actionType: string = 'otp') {
  try {
    const db = getDb();
    await db.collection('email_abuse_protection').doc(`${actionType}:${email.toLowerCase().trim()}`).delete();
  } catch (err) {
    console.error("[Spam Filter] Failed to reset lock states for:", email, err);
  }
}

/* ==========================================================================
   HIGH-LEVEL PLATFORM MAIL APIs (Direct Proxies ensuring 100% compatibility)
   ========================================================================== */

export const sendProfessionalEmail = async ({
  to,
  from,
  subject,
  html,
}: {
  to: string;
  from?: string;
  subject: string;
  html: string;
}) => {
  const settings = await getEmailSettings();
  const res = await sendEmailDirect({
    to,
    from: from || settings.systemEmailSender,
    subject,
    html
  }, settings, 'professional');
  
  if (!res.success) {
    throw new Error(res.error || "Failed to deliver professional system email.");
  }
  return res;
};


async function getDynamicTemplate(templateId: string, variables: Record<string, string>, defaultHtml: string): Promise<string> {
    try {
        const db = getDb();
        const doc = await db.collection('email_templates').doc(templateId).get();
        if (doc.exists && doc.data()?.html) {
            let rawHtml = doc.data()?.html;
            for (const [key, value] of Object.entries(variables)) {
                rawHtml = rawHtml.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            }
            return rawHtml;
        }
    } catch (e) {}
    return defaultHtml;
}

export const sendWelcomeEmail = async (to: string, username: string) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const defaultHtml = templates.getWelcomeTemplate(username, logoUrl);
  const html = await getDynamicTemplate('welcome_email', { username, logoUrl }, defaultHtml);
  
  const welcomeFrom = process.env.RESEND_FROM_EMAIL || settings.welcomeEmailSender;
  
  const result = await sendEmailDirect({
    to,
    from: welcomeFrom,
    subject: "Welcome To Aetheris",
    html
  }, settings, 'welcome');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver Welcome onboarding email.");
  }
};

export const sendWelcomeVerificationEmail = async (to: string, username: string, verificationLink: string) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const defaultHtml = templates.getWelcomeVerificationTemplate(username, verificationLink, logoUrl);
  const html = await getDynamicTemplate('welcome_verification_email', { username, verificationLink, logoUrl }, defaultHtml);
  
  const verifyFrom = process.env.VERIFY_FROM_EMAIL || "Aetheris <verify-noreply@update.aetheriss.online>";
  
  const result = await sendEmailDirect({
    to,
    from: verifyFrom,
    subject: "Verify Your Account Now",
    html
  }, settings, 'verification');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver Account Verification email.");
  }
};

export const sendTransactionEmail = async ({
  to,
  username,
  transactionType,
  amount,
  paymentMethod,
  referenceId,
  transactionId,
  accountStatus,
  actionText,
  actionLink,
  isFailed = false
}: any) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const subject = "Transaction Notification";
  const defaultHtml = templates.getTransactionTemplate({
    username,
    transactionType,
    amount,
    paymentMethod,
    referenceId,
    transactionId,
    accountStatus,
    actionText,
    actionLink,
    isFailed,
    logoUrl
  });
  const html = await getDynamicTemplate('transaction_email', {
    username, transactionType, amount, paymentMethod, referenceId, transactionId, accountStatus, actionText, actionLink, isFailed: String(isFailed), logoUrl
  }, defaultHtml);
  
  const trxFrom = process.env.RESEND_FROM_EMAIL || settings.noreplyEmailSender;
  
  const result = await sendEmailDirect({
    to,
    from: trxFrom,
    subject,
    html
  }, settings, 'transaction');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver Transaction status notification email.");
  }
};

export const sendOtpEmail = async (
  to: string, 
  username: string, 
  code: string, 
  actionText: string = "Verify your account"
) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const defaultHtml = templates.getOtpTemplate(username, code, actionText, logoUrl);
  const html = await getDynamicTemplate('otp_email', { username, code, actionText, logoUrl }, defaultHtml);
  
  const otpFrom = process.env.VERIFY_FROM_EMAIL || "Aetheris <noreply@update.aetheriss.online>";
  
  const result = await sendEmailDirect({
    to,
    from: otpFrom,
    subject: `Your Aetheris Security Code: ${code}`,
    html
  }, settings, 'otp');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver One-Time Passcode (OTP) security email.");
  }
};

export const sendPlanPausedEmail = async (
  to: string, 
  username: string, 
  planName: string, 
  neededAmount: number, 
  userBalance: number, 
  dashboardLink: string = "https://aetheriss.online/dashboard"
) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const defaultHtml = templates.getPlanPausedTemplate(username, planName, neededAmount, userBalance, dashboardLink, logoUrl);
  const html = await getDynamicTemplate('plan_paused_email', { username, planName, neededAmount: String(neededAmount), userBalance: String(userBalance), dashboardLink, logoUrl }, defaultHtml);
  
  const pausedFrom = process.env.RESEND_FROM_EMAIL || settings.noreplyEmailSender;
  
  const result = await sendEmailDirect({
    to,
    from: pausedFrom,
    subject: `Action Required: Your trading plan "${planName}" has been paused`,
    html
  }, settings, 'plan_paused');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver trading plan pauses notification email.");
  }
};

export const sendSupportReplyEmail = async (
  to: string, 
  username: string, 
  ticketSubject: string, 
  replyMessage: string
) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const defaultHtml = templates.getSupportReplyTemplate(username, ticketSubject, replyMessage, logoUrl);
  const html = await getDynamicTemplate('support_reply_email', { username, ticketSubject, replyMessage, logoUrl }, defaultHtml);
  
  const supportFrom = process.env.SUPPORT_FROM_EMAIL || settings.systemEmailSender;
  
  const result = await sendEmailDirect({
    to,
    from: supportFrom,
    subject: `Support Ticket Response: ${ticketSubject}`,
    html
  }, settings, 'support_reply');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver Support reply notification email.");
  }
};

export const sendSecurityAlertEmail = async ({
  to,
  username,
  actionText,
  deviceInfo,
  browserInfo,
  ipLocation
}: any) => {
  const settings = await getEmailSettings();
  const logoUrl = await getLogoUrl();
  const defaultHtml = templates.getSecurityAlertTemplate({
    username,
    actionText,
    deviceInfo,
    browserInfo,
    ipLocation,
    logoUrl
  });
  const html = await getDynamicTemplate('security_alert_email', {
    username, actionText, deviceInfo: deviceInfo || '', browserInfo: browserInfo || '', ipLocation: ipLocation || '', logoUrl
  }, defaultHtml);
  
  const securityFrom = process.env.VERIFY_FROM_EMAIL || "Aetheris <no-reply@update.aetheriss.online>";
  
  const result = await sendEmailDirect({
    to,
    from: securityFrom,
    subject: `Security Alert: ${actionText}`,
    html
  }, settings, 'security');

  if (!result.success) {
    throw new Error(result.error || "Failed to deliver Security Alert email.");
  }
};
