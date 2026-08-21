import admin from 'firebase-admin';
import { InvestmentEngine } from './InvestmentEngine';
import { ActivationEngine } from './activationEngine';
import { ActivationReminderEngine } from './activationReminderEngine';
import { SupportTicketAutomation } from './supportTicketAutomation';

export class SchedulerEngine {
    static async runCycle(db: admin.firestore.Firestore) {
        console.log('CRON: Running Modular Investment Engine...');
        
        try {
            const nowMillis = Date.now();
            const nowAsTimestamp = admin.firestore.Timestamp.fromMillis(nowMillis);

            // ==========================================
            // 1. Process Pending Trade Activations
            // Automatically activates trades as soon as user balance meets requirement
            // ==========================================
            await ActivationEngine.processAllPendingActivations(db);

            // ==========================================
            // 2. Process Paused / Overdue Trade Plans
            // Automatically resumes trade operations as soon as user balance is available
            // ==========================================
            await this.processStuckPlans(db, nowMillis);

            // ==========================================
            // 3. Scheduled Pro Plan Progress & Settlement Service
            // ==========================================
            const activeProPlans = await db.collection('investments')
                .where('status', '==', 'active')
                .get();

            // Filter for Pro plans safely in JS layer to cover name matching and isPro flag
            const proPlans = activeProPlans.docs.filter(doc => {
                const data = doc.data();
                return data.isPro === true || (data.plan && data.plan.toUpperCase().includes("PRO"));
            });

            for (const doc of proPlans) {
                try {
                    const invData = doc.data();
                    const invId = doc.id;

                    const activationTime = invData.activation_time || invData.created_at || invData.started_at;
                    const activationMs = activationTime ? activationTime.toDate().getTime() : nowMillis;
                    const durationDays = invData.duration_days || 30;
                    const planMaturityTime = activationMs + (durationDays * 24 * 60 * 60 * 1000);

                    const durationMs = durationDays * 24 * 60 * 60 * 1000;
                    const elapsed = nowMillis - activationMs;

                    if (nowMillis >= planMaturityTime) {
                        console.log(`[SchedulerEngine] Active Pro plan "${invData.plan}" (${invId}) has fully matured. Executing final settlement.`);
                        const engine = new InvestmentEngine(db, invId);
                        await engine.execute(nowMillis);
                    } else {
                        // Calculate actual elapsed trade progress and save to database
                        const rawProgress = (elapsed / durationMs) * 100;
                        const currentProgressPct = Math.min(99, Math.max(0, Math.round(rawProgress)));

                        if (currentProgressPct !== invData.progress) {
                            await db.collection('investments').doc(invId).update({
                                progress: currentProgressPct,
                                last_execution_time: nowAsTimestamp
                            });
                            console.log(`[SchedulerEngine] Updated active Pro plan ${invId} progress based on elapsed time to ${currentProgressPct}%`);
                        }
                    }
                } catch (proErr) {
                    console.error(`[SchedulerEngine] Error processing Pro plan ${doc.id}:`, proErr);
                }
            }

            // Fetch *only* active plans that are actually due for execution
            const activeDueInvestments = await db.collection('investments')
                .where('status', '==', 'active')
                .where('next_execution_time', '<=', nowAsTimestamp)
                .get();

            for (const invDoc of activeDueInvestments.docs) {
                try {
                    // Fast pre-check outside transaction to avoid processing locked/already updated docs
                    const preData = invDoc.data();
                    if (!preData.next_execution_time || preData.next_execution_time.toDate().getTime() > nowMillis) {
                        continue;
                    }
                    // DO NOT skip unconditionally if processing === true, let the lease recovery inside engine handle it!
                    if (preData.processing === true) {
                        const lastStarted = preData.last_processing_started_at?.toDate().getTime() || 0;
                        if (nowMillis - lastStarted < 3 * 60 * 1000) {
                             console.log(`[SchedulerEngine] Plan ${invDoc.id} is actively running (under 3 min). Skipping.`);
                             continue;
                        } else {
                             console.log(`[SchedulerEngine] Plan ${invDoc.id} is in 'processing' state but lease expired! Sending to recovery.`);
                        }
                    }

                    const engine = new InvestmentEngine(db, invDoc.id);
                    await engine.execute(nowMillis);
                } catch (e: any) {
                    if (e && e.message && (e.message.includes('Lacked') || e.message.includes('Short of'))) {
                         console.log(`[SchedulerEngine] Active investment ${invDoc.id} is now overdue: ${e.message}`);
                    } else {
                         console.error(`Error processing investment ${invDoc.id}:`, e);
                    }
                }
            }

            // Expire pending investments older than 24 hours
            await this.expirePendingInvestments(db, nowMillis);

            // Periodic automation tasks every 15 minutes
            if (new Date(nowMillis).getMinutes() % 15 === 0) {
                await ActivationReminderEngine.runReminders(db);
                await SupportTicketAutomation.runAutomation(db);
            }
        } catch (err: any) {
            if (err?.message?.includes('RESOURCE_EXHAUSTED')) {
               console.log("Modular Engine CRON skipped: Firestore Quota Exceeded today.");
            } else {
               console.error('Modular Engine CRON failed:', err);
            }
        }
    }

    static async expirePendingInvestments(db: admin.firestore.Firestore, nowMillis: number) {
        try {
            const pendingSnap = await db.collection('investments')
                .where('status', '==', 'pending_activation')
                .get();

            for (const doc of pendingSnap.docs) {
                const invData = doc.data();
                const createdTime = invData.created_at?.toDate?.()?.getTime?.() || 0;
                const expiresTime = invData.expires_at?.toDate?.()?.getTime?.() || (createdTime > 0 ? createdTime + 24 * 60 * 60 * 1000 : 0);

                if (expiresTime > 0 && nowMillis >= expiresTime) {
                    await doc.ref.update({
                        status: 'expired',
                        expired_at: admin.firestore.Timestamp.fromMillis(nowMillis)
                    });
                    const { notifyUser } = await import('../server/services/notifications');
                    await notifyUser(invData.user_id, 'system_alert', 'Trade Allocation Expired ⏰', `Your pending trade "${invData.plan || 'Trading Plan'}" has expired as 24 hours have elapsed without payment.`).catch(console.error);
                    console.log(`[SchedulerEngine] Pending investment ${doc.id} expired after 24 hours.`);
                }
            }
        } catch (err) {
            console.error('[SchedulerEngine] Error expiring pending investments:', err);
        }
    }

    static async processStuckPlans(db: admin.firestore.Firestore, nowMillis: number) {
        // Find plans that are paused or overdue to retry payment deduction
        const stuckPlans = await db.collection('investments')
           .where('status', 'in', ['paused', 'overdue'])
           .get();

        for (const doc of stuckPlans.docs) {
            try {
                // Fast pre-check outside transaction
                const preData = doc.data();
                if (preData.processing === true) {
                    const lastStarted = preData.last_processing_started_at?.toDate().getTime() || 0;
                    if (nowMillis - lastStarted < 3 * 60 * 1000) {
                         console.log(`[SchedulerEngine] Stuck plan ${doc.id} is actively running (under 3 min). Skipping.`);
                         continue;
                    } else {
                         console.log(`[SchedulerEngine] Stuck plan ${doc.id} lease expired! Sending to recovery.`);
                    }
                }

                const engine = new InvestmentEngine(db, doc.id);
                await engine.execute(nowMillis);
            } catch (e: any) {
                 if (e && e.message && (e.message.includes('Lacked') || e.message.includes('Short of'))) {
                      console.log(`[SchedulerEngine] Stuck investment ${doc.id} remains overdue: ${e.message}`);
                 } else {
                      console.error(`Failed to reprocess stuck investment ${doc.id}:`, e);
                 }
            }
        }
    }
}

