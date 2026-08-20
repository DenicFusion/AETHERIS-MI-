import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../services/dbService';
import { MailOptions } from './mail.service';
import { sendEmailDirect, getEmailSettings } from './mail.service';

/**
 * Interface representing an email job persisted in our delivery queue
 */
export interface EmailJob {
  id: string;
  to: string;
  from?: string;
  subject: string;
  html: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  lastAttemptAt?: Date | null;
  errorLog: string[];
  providerUsed?: string | null;
  createdAt: Date;
}

/**
 * Stage a new email job in the persistent Firestore queue
 */
export async function queueEmail(
  options: MailOptions, 
  delaySeconds: number = 0,
  maxAttempts: number = 3
): Promise<string> {
  const db = getDb();
  const queueRef = db.collection('email_queue').doc();
  const scheduledAt = new Date(Date.now() + delaySeconds * 1000);

  await queueRef.set({
    to: options.to,
    from: options.from || null,
    subject: options.subject,
    html: options.html,
    status: 'pending',
    attempts: 0,
    maxAttempts,
    scheduledAt,
    lastAttemptAt: null,
    errorLog: [],
    providerUsed: null,
    createdAt: new Date()
  });

  console.log(`[Queue] Email job for ${options.to} was successfully queued. Delivery scheduled for: ${scheduledAt.toISOString()}`);
  
  // Trigger immediate async processing to avoid making users wait for interval loops
  setImmediate(() => {
    processSpecificJob(queueRef.id).catch(err => {
      console.error(`[Queue] Direct async processing trigger failed for job ${queueRef.id}:`, err);
    });
  });

  return queueRef.id;
}

/**
 * Process a single specific job instantly from its document ID
 */
export async function processSpecificJob(jobId: string): Promise<boolean> {
  const db = getDb();
  const jobRef = db.collection('email_queue').doc(jobId);
  const settings = await getEmailSettings();

  let shouldProcess = false;

  await db.runTransaction(async (t) => {
    const snap = await t.get(jobRef);
    if (!snap.exists) return;

    const data = snap.data();
    if (data && data.status === 'pending') {
      t.update(jobRef, { status: 'processing', lastAttemptAt: new Date() });
      shouldProcess = true;
    }
  });

  if (!shouldProcess) return false;

  const snap = await jobRef.get();
  const job = snap.data() as EmailJob;

  try {
    const result = await sendEmailDirect({
      to: job.to,
      from: job.from || undefined,
      subject: job.subject,
      html: job.html
    }, settings);

    if (result.success) {
      await jobRef.update({
        status: 'completed',
        attempts: FieldValue.increment(1),
        providerUsed: result.provider
      });
      console.log(`[Queue] Job ${jobId} successfully delivered to ${job.to} via ${result.provider}`);
      return true;
    } else {
      const errorMsg = result.error || 'Unknown delivery failure';
      const updatedAttempts = (job.attempts || 0) + 1;
      const isFailedPerm = updatedAttempts >= job.maxAttempts;
      
      // Calculate retry cooldown with simple backoff: try in 30s, 2m, 5m
      const backoffSeconds = updatedAttempts === 1 ? 30 : updatedAttempts === 2 ? 120 : 300;
      const nextScheduledAt = new Date(Date.now() + backoffSeconds * 1000);

      await jobRef.update({
        status: isFailedPerm ? 'failed' : 'pending',
        attempts: updatedAttempts,
        scheduledAt: nextScheduledAt,
        errorLog: FieldValue.arrayUnion(`${new Date().toISOString()} [Attempt ${updatedAttempts}]: ${errorMsg}`),
        providerUsed: result.provider || 'none'
      });

      console.warn(`[Queue] Job ${jobId} delivery attempt failed (${updatedAttempts}/${job.maxAttempts}). Error: ${errorMsg}. Next retry scheduled: ${nextScheduledAt.toISOString()}`);
      return false;
    }
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    const updatedAttempts = (job.attempts || 0) + 1;
    const isFailedPerm = updatedAttempts >= job.maxAttempts;
    
    await jobRef.update({
      status: isFailedPerm ? 'failed' : 'pending',
      attempts: updatedAttempts,
      scheduledAt: new Date(Date.now() + 60 * 1000), // Default 1-minute backoff on system-level exception
      errorLog: FieldValue.arrayUnion(`${new Date().toISOString()} [System Exception Attempt ${updatedAttempts}]: ${errorMsg}`)
    });

    console.error(`[Queue] Job ${jobId} encountered system exception:`, err);
    return false;
  }
}

/**
 * Polls the queue collection and processes available pending jobs
 */
export async function pollQueue(): Promise<number> {
  const db = getDb();
  const now = new Date();
  
  // Pull a batch of pending jobs, avoiding the need for a composite index initially by doing memory filter
  const snapshot = await db.collection('email_queue')
    .where('status', '==', 'pending')
    .limit(50)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  // Filter in memory to bypass composite index requirement
  const readyJobs = snapshot.docs.filter(doc => {
    const scheduledAt = doc.data().scheduledAt?.toDate() || new Date();
    return scheduledAt <= now;
  });

  const jobsToProcess = readyJobs.slice(0, 5);

  if (jobsToProcess.length === 0) {
    return 0;
  }

  let processedCount = 0;
  for (const doc of jobsToProcess) {
    const success = await processSpecificJob(doc.id);
    if (success) processedCount++;
  }

  return processedCount;
}

let pollingIntervalId: NodeJS.Timeout | null = null;

/**
 * Starts the continuous active queue background worker loop
 */
export function startQueueWorker(intervalMs: number = 6000) {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }

  console.log(`[Queue Worker] Delivery queue background engine activated. Polling frequency: ${intervalMs} ms.`);
  
  pollingIntervalId = setInterval(async () => {
    try {
      const processed = await pollQueue();
      if (processed > 0) {
        console.log(`[Queue Worker] Processed ${processed} pending email job(s) from scheduled pool.`);
      }
    } catch (err: any) {
      if (err?.message?.includes('RESOURCE_EXHAUSTED')) {
         // Silently skip if quota is exhausted
      } else {
         console.error('[Queue Worker] Error encountered in background polling execution loop:', err);
      }
    }
  }, intervalMs);
}
