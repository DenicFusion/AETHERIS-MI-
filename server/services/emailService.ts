/**
 * Backward-compatible proxy mapping routing all email requests
 * to the modern centralized isolated email structure.
 */

export {
  sendProfessionalEmail,
  sendWelcomeEmail,
  sendWelcomeVerificationEmail,
  sendTransactionEmail,
  sendOtpEmail,
  sendPlanPausedEmail,
  sendSupportReplyEmail,
  sendSecurityAlertEmail
} from '../mail/mail.service';
