import { Resend } from 'resend';
import { getDb } from '../services/dbService';
import { MailOptions } from './mail.service';

/**
 * Validates domain status on Resend and logs DKIM, SPF, MX propagation details
 */
export async function checkResendDomains(apiKey: string): Promise<any> {
  try {
    console.log("[Resend Diag] Requesting verification status of registered domains...");
    // Use standard fetch to avoid extra library dependencies
    const response = await fetch('https://api.resend.com/domains', {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Resend Diag] Failed to list domains. Status: ${response.status}. Error:`, errorText);
      return { success: false, status: response.status, error: errorText };
    }

    const resData: any = await response.json();
    const domains = resData.data || [];
    
    console.log(`[Resend Diag] Found ${domains.length} configured domains:`);
    domains.forEach((dom: any) => {
      console.log(`[Resend Diag] - Domain: ${dom.name} | Status: ${dom.status} | Created: ${dom.created_at}`);
    });
    
    return { success: true, domains };
  } catch (err: any) {
    console.error("[Resend Diag] Query error occurred:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Sends transactional email via Resend API
 */
export async function sendResendMail(
  options: MailOptions, 
  customConfig?: any,
  emailType: string = 'transactional'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = options.to;
  const subject = options.subject;
  const sender = options.from || 'Aetheris <support@update.aetheriss.online>';

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[EMAIL DISPATCH START]`);
  console.log(`  Type:      ${emailType.toUpperCase()}`);
  console.log(`  Sender:    ${sender}`);
  console.log(`  Recipient: ${recipient}`);
  console.log(`  Subject:   "${subject}"`);
  console.log(`  Length:    ${options.html?.length || 0} chars`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const db = getDb();
    let config = customConfig;
    if (!config) {
      const emailSettingsDoc = await db.collection('settings').doc('email').get();
      config = emailSettingsDoc.exists ? emailSettingsDoc.data() : {};
    }

    const apiKey = config.resendApiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      const missingKeyErr = "Resend API Key is not configured in settings or environment variables.";
      console.error(`[EMAIL DISPATCH FAILURE] ${missingKeyErr}`);
      return { success: false, error: missingKeyErr };
    }

    // Masked API Key logging
    const maskedKey = apiKey.length > 10 ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : "invalid_key";
    console.log(`[Resend Config] Using key: ${maskedKey}`);

    const resend = new Resend(apiKey);
    
    // Log API response or exception cleanly
    const response = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: subject,
      html: options.html,
      replyTo: options.replyTo || 'support@update.aetheriss.online',
    });

    if (response.error) {
      const errDetail = response.error.message || JSON.stringify(response.error);
      console.warn(`[Resend Response] Raw Payload:`, JSON.stringify({ issue_details: errDetail }));

      // Fallback for unverified custom domain errors on Resend API
      if (/not verified|verify your domain|domain.*not.*verified/i.test(errDetail)) {
        console.warn(`[Resend Fallback] Primary domain unverified (${sender}). Automatically retrying dispatch via Resend verified onboarding domain (onboarding@resend.dev)...`);
        const fallbackFrom = "Aetheris Support <onboarding@resend.dev>";
        const retryResponse = await resend.emails.send({
          from: fallbackFrom,
          to: recipient,
          subject: subject,
          html: options.html,
          replyTo: options.replyTo || 'support@update.aetheriss.online',
        });

        if (!retryResponse.error && retryResponse.data?.id) {
          console.log(`[Resend Fallback SUCCESS] Delivered to ${recipient} via onboarding@resend.dev. MessageId: ${retryResponse.data.id}`);
          return { success: true, messageId: retryResponse.data.id };
        } else if (retryResponse.error) {
          const retryErrDetail = retryResponse.error.message || JSON.stringify(retryResponse.error);
          console.error(`[Resend Fallback FAILURE] Fallback dispatch failed:`, retryErrDetail);
          return { success: false, error: retryErrDetail };
        }
      }

      console.error(`[EMAIL DISPATCH FAILURE] Resend API returned error:`, errDetail);
      return { success: false, error: errDetail };
    }

    const messageId = response.data?.id;
    console.log(`[EMAIL DISPATCH SUCCESS] Delivered to ${recipient}. MessageId: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    const catchError = error.message || String(error);
    console.error(`[EMAIL DISPATCH EXCEPT] Delivery crashed for ${recipient}:`, error);
    return { success: false, error: catchError };
  }
}
