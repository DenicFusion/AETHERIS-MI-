import { Router } from 'express';
import { getDb } from '../services/dbService';
import { getEmailSettings, sendEmailDirect, EmailSettings } from './mail.service';
import { queueEmail, pollQueue } from './mail.queue';
import { checkResendDomains } from './mail.fallback';

const mailRoutes = Router();

/**
 * GET /api/mail/settings
 * Retrieve modern dynamic email infrastructure provider choices
 */
mailRoutes.get('/settings', async (req, res) => {
  try {
    const settings = await getEmailSettings();
    
    // Scrub sensitive credential attributes slightly to protect passwords in response
    const safeSettings = {
      ...settings,
      brevoPass: settings.brevoPass ? '••••••••••••••••' : '',
      resendApiKey: settings.resendApiKey ? '••••••••••••••••' : ''
    };
    
    res.json({ success: true, settings: safeSettings });
  } catch (error: any) {
    console.error('[Mail Routes] Failed to read email settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mail/settings
 * Update dynamically switchable SMTP/API settings inside Firestore (Admin Controller)
 */
mailRoutes.post('/settings', async (req, res) => {
  try {
    const db = getDb();
    const currentSettings = await getEmailSettings();
    const updatePayload = req.body;

    const mergedSettings: EmailSettings = {
      brevoEnabled: typeof updatePayload.brevoEnabled === 'boolean' ? updatePayload.brevoEnabled : currentSettings.brevoEnabled,
      resendEnabled: typeof updatePayload.resendEnabled === 'boolean' ? updatePayload.resendEnabled : currentSettings.resendEnabled,
      primaryProvider: updatePayload.primaryProvider || currentSettings.primaryProvider,
      fallbackProvider: updatePayload.fallbackProvider || currentSettings.fallbackProvider,
      
      brevoHost: updatePayload.brevoHost || currentSettings.brevoHost,
      brevoPort: typeof updatePayload.brevoPort === 'number' ? updatePayload.brevoPort : currentSettings.brevoPort,
      brevoUser: updatePayload.brevoUser || currentSettings.brevoUser,
      
      // Keep existing key/password if sent as placeholder bullets
      brevoPass: updatePayload.brevoPass && updatePayload.brevoPass !== '••••••••••••••••' ? updatePayload.brevoPass : currentSettings.brevoPass,
      resendApiKey: updatePayload.resendApiKey && updatePayload.resendApiKey !== '••••••••••••••••' ? updatePayload.resendApiKey : currentSettings.resendApiKey,
      
      systemEmailSender: updatePayload.systemEmailSender || currentSettings.systemEmailSender,
      welcomeEmailSender: updatePayload.welcomeEmailSender || currentSettings.welcomeEmailSender,
      noreplyEmailSender: updatePayload.noreplyEmailSender || currentSettings.noreplyEmailSender,

      otpCooldownSeconds: typeof updatePayload.otpCooldownSeconds === 'number' ? updatePayload.otpCooldownSeconds : currentSettings.otpCooldownSeconds,
      maxResendAttempts: typeof updatePayload.maxResendAttempts === 'number' ? updatePayload.maxResendAttempts : currentSettings.maxResendAttempts,
      lockoutDurationMinutes: typeof updatePayload.lockoutDurationMinutes === 'number' ? updatePayload.lockoutDurationMinutes : currentSettings.lockoutDurationMinutes
    };

    await db.collection('settings').doc('email').set(mergedSettings);
    res.json({ success: true, message: 'Platform email services updated successfully.', settings: mergedSettings });
  } catch (error: any) {
    console.error('[Mail Routes] Failed to update email settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mail/stats
 * Admin dashboard telemetry monitoring parameters
 */
mailRoutes.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    
    // Fetch logs grouped by response categories
    const successLogsRef = await db.collection('email_logs').where('status', '==', 'success').limit(10).get();
    const failedLogsRef = await db.collection('email_logs').where('status', '==', 'failed').limit(10).get();

    // Sum totals safely via quick firestore limits (or just retrieve recent analytics records)
    const totalLogs = await db.collection('email_logs').limit(100).get();
    
    let totalSentCount = 0;
    let totalFailedCount = 0;
    const providerFrequency: Record<string, number> = {};

    totalLogs.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'success') totalSentCount++;
      if (data.status === 'failed') totalFailedCount++;
      
      const p = data.provider || 'none';
      providerFrequency[p] = (providerFrequency[p] || 0) + 1;
    });

    const monitoringData = {
      totalStatsSampled: totalLogs.size,
      estimatedSent: totalSentCount,
      estimatedFailed: totalFailedCount,
      providerDistribution: providerFrequency,
      recentSuccess: successLogsRef.docs.map(d => ({ id: d.id, ...d.data() })),
      recentFailures: failedLogsRef.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    res.json({ success: true, data: monitoringData });
  } catch (error: any) {
    console.error('[Mail Routes] Failed to retrieve monitoring telemetry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mail/queue
 * Inspect current size and records in dispatch queue
 */
mailRoutes.get('/queue', async (req, res) => {
  try {
    const db = getDb();
    const pendingSnap = await db.collection('email_queue').where('status', '==', 'pending').limit(20).get();
    const failedSnap = await db.collection('email_queue').where('status', '==', 'failed').limit(10).get();

    res.json({
      success: true,
      pendingCount: pendingSnap.size,
      failedAttemptsCount: failedSnap.size,
      pendingJobs: pendingSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      stuckJobs: failedSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    });
  } catch (error: any) {
    console.error('[Mail Routes] Failed to read queue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mail/queue/process
 * Manually force a check/retry process cycle on the database queue
 */
mailRoutes.post('/queue/process', async (req, res) => {
  try {
    const processedJobs = await pollQueue();
    res.json({ success: true, processed: processedJobs });
  } catch (error: any) {
    console.error('[Mail Routes] Manual queue process execution failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mail/test
 * Triggers a secure delivery test for one or all channels
 */
mailRoutes.post('/test', async (req, res) => {
  try {
    const { to, subject, body, useQueue } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient address required.' });
    }

    const testSubject = subject || "Aetheris Channel System Mailer Test";
    const htmlBody = body || `<div style="font-family: sans-serif; padding: 15px;">
      <h2>System Verification Mailer Test</h2>
      <p style="color: #475569;">Delivery successfully verified at ${new Date().toISOString()}</p>
    </div>`;

    if (useQueue === true) {
      const jobId = await queueEmail({ to, subject: testSubject, html: htmlBody });
      return res.json({ success: true, message: 'Verification email added to persistent task queue.', jobId });
    }

    const result = await sendEmailDirect({
      to,
      subject: testSubject,
      html: htmlBody
    });

    if (result.success) {
      res.json({ success: true, provider: result.provider, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('[Mail Routes] Channel delivery verification test aborted:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mail/diagnostics
 * Queries the Resend Api to fetch available verified domains and active DNS configs
 */
mailRoutes.get('/diagnostics', async (req, res) => {
  try {
    const settings = await getEmailSettings();
    const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Resend API Key is not configured in settings or environment.' });
    }

    const report = await checkResendDomains(apiKey);
    res.json({
      success: report.success,
      report: report.domains || [],
      error: report.error || null
    });
  } catch (error: any) {
    console.error('[Mail Routes] Diagnostics failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default mailRoutes;
