import admin from 'firebase-admin';
import { IntervalProcessor } from './intervalProcessor';

export class InvestmentEngine {
    constructor(private db: admin.firestore.Firestore, private planId: string) {}

    /**
     * Attempts to execute the engine loop for this specific investment plan.
     */
    async execute(currentTime: number): Promise<boolean> {
        const invRef = this.db.collection('investments').doc(this.planId);
        
        console.log(`[ISOLATED ENGINE] (${this.planId}) Starting execution block.`);

        let isLockedByUs = false;

        try {
            // STEP 1: Exclusive lock acquisition inside transaction
            await this.db.runTransaction(async (t) => {
                const doc = await t.get(invRef);
                if (!doc.exists) {
                    throw new Error(`Investment plan ${this.planId} does not exist`);
                }

                const data = doc.data()!;
                const nowTs = admin.firestore.Timestamp.fromMillis(currentTime);

                // Lock check & Lease timeout recovery (3 minutes)
                const isProcessing = data.processing === true || data.execution_lock === true;
                const lastStarted = data.last_processing_started_at?.toDate().getTime() || 0;
                const isLeaseExpired = currentTime - lastStarted > 3 * 60 * 1000; // 3 minutes timeout

                if (isProcessing && !isLeaseExpired) {
                    console.log(`[ISOLATED ENGINE] (${this.planId}) Plan is already locked/running. Skipping.`);
                    return;
                }

                if (isProcessing && isLeaseExpired) {
                    console.warn(`[ISOLATED ENGINE] (${this.planId}) Detected stuck execution lock from ${new Date(lastStarted).toISOString()}. Forcing recovery/release.`);
                }

                // Acquire Lock
                t.update(invRef, {
                    processing: true,
                    execution_lock: true,
                    last_processing_started_at: nowTs,
                    retry_state: {
                        ...(data.retry_state || {}),
                        last_attempt_at: nowTs,
                        attempts: (data.retry_state?.attempts || 0) + 1
                    }
                });

                isLockedByUs = true;
                console.log(`[ISOLATED ENGINE] (${this.planId}) Lock acquired successfully.`);
            });

            if (!isLockedByUs) {
                return false; // Skip execution since lock is already held and not expired
            }

            // STEP 2: Execute Core Profit & Interval Deductions with safe transaction
            let pausedDueToFunds = false;
            let pausedDetails: any = null;
            let successfulDeductions: any[] = [];
            let failedDeductions: any[] = [];
            let report: any = null;

            await this.db.runTransaction(async (t) => {
                const freshDoc = await t.get(invRef);
                if (!freshDoc.exists) return;

                const invData = freshDoc.data()!;
                
                // Double check status: if completed, don't execute
                if (invData.status === 'completed') {
                    console.log(`[ISOLATED ENGINE] (${this.planId}) Plan is already completed. Skipping.`);
                    return;
                }

                const userId = invData.user_id;
                const userRef = this.db.collection('users').doc(userId);

                // Run the additive/backward-compatible interval processor
                report = await IntervalProcessor.processNextInterval(
                    t, this.db, freshDoc, userRef, currentTime
                );

                console.log(`[ISOLATED ENGINE] (${this.planId}) Process next interval completed. Actions:`, report.actions);

                if (report.pausedDueToFunds) {
                    pausedDueToFunds = true;
                    pausedDetails = report.pausedDetails;
                }

                if (report.successfulDeductions && report.successfulDeductions.length > 0) {
                    successfulDeductions = report.successfulDeductions;
                }
                if (report.failedDeductions && report.failedDeductions.length > 0) {
                    failedDeductions = report.failedDeductions;
                }

                // Update runtime engine telemetry stats on the plan document itself
                const countdownStateStr = invData.status === 'completed' ? 'Completed' : (invData.status === 'active' ? 'Counting' : 'Action Required');
                t.update(invRef, {
                    completed_intervals: report.finalCompleted,
                    profit_cycle: report.finalCompleted + 1,
                    countdown_state: countdownStateStr,
                    overdue_state: {
                        isOverdue: invData.status === 'overdue',
                        intervalsHealed: report.intervalsHealed
                    },
                    last_execution_time: admin.firestore.Timestamp.fromMillis(currentTime)
                });
            });

            // Trigger push and in-app notifications after the transaction commits successfully!
            if (report && report.eventsToNotify && report.eventsToNotify.length > 0) {
                try {
                    const { notifyUser } = await import('../server/services/notifications');
                    for (const event of report.eventsToNotify) {
                        await notifyUser(event.userId, event.type, event.title, event.message).catch(notifErr => {
                            console.error(`[ISOLATED ENGINE] User push notification failed:`, notifErr);
                        });
                    }
                } catch (notifErr) {
                    console.error(`[ISOLATED ENGINE] Failed to trigger user notifications:`, notifErr);
                }
            }

            if (report && report.adminNotificationsToNotify && report.adminNotificationsToNotify.length > 0) {
                try {
                    const { notifyAdmin } = await import('../server/services/notifications');
                    for (const event of report.adminNotificationsToNotify) {
                        await notifyAdmin(event.type, event.title, event.message).catch(adminErr => {
                            console.error(`[ISOLATED ENGINE] Admin alert failed:`, adminErr);
                        });
                    }
                } catch (notifErr) {
                    console.error(`[ISOLATED ENGINE] Failed to trigger admin alerts:`, notifErr);
                }
            }

            // Trigger immediate email notification after the transaction commits successfully!
            if (pausedDueToFunds && pausedDetails) {
                try {
                    const { sendPlanPausedEmail } = await import('../server/services/emailService');
                    console.log(`[ISOLATED ENGINE] Sending plan paused email for plan: ${pausedDetails.planName} to user: ${pausedDetails.userEmail}`);
                    await sendPlanPausedEmail(
                        pausedDetails.userEmail,
                        pausedDetails.username,
                        pausedDetails.planName,
                        pausedDetails.neededAmount,
                        pausedDetails.userBalance
                    );
                } catch (emailErr) {
                    console.error(`[ISOLATED ENGINE] Failed to trigger plan-paused email:`, emailErr);
                }
            }

            if (successfulDeductions.length > 0 || failedDeductions.length > 0) {
                try {
                    const { sendTransactionEmail } = await import('../server/services/emailService');
                    
                    for (const ded of successfulDeductions) {
                        if (ded.userEmail) {
                            await sendTransactionEmail({
                                to: ded.userEmail,
                                username: ded.username,
                                transactionType: "Interval Deduction",
                                amount: `$${ded.amount.toFixed(2)}`,
                                accountStatus: 'SUCCESS',
                                actionText: 'View Dashboard',
                                actionLink: 'https://aetheriss.online/dashboard',
                                isFailed: false,
                                notes: `Successfully deducted interval amount for plan: ${ded.planName}`
                            }).catch(console.error);
                        }
                    }

                    for (const ded of failedDeductions) {
                        if (ded.userEmail) {
                            await sendTransactionEmail({
                                to: ded.userEmail,
                                username: ded.username,
                                transactionType: "Interval Deduction Failed",
                                amount: `$${ded.amount.toFixed(2)}`,
                                accountStatus: 'FAILED',
                                actionText: 'Deposit Funds',
                                actionLink: 'https://aetheriss.online/dashboard',
                                isFailed: true,
                                notes: `Deduction failed for plan: ${ded.planName} due to insufficient deposit balance.`
                            }).catch(console.error);
                        }
                    }
                } catch (emailErr) {
                    console.error(`[ISOLATED ENGINE] Failed to trigger transaction emails:`, emailErr);
                }
            }

            return true;
        } catch (error: any) {
            if (error?.message?.includes('RESOURCE_EXHAUSTED')) {
                console.log(`[ISOLATED ENGINE] (${this.planId}) Execution bypassed due to Firebase Quota Exhaustion.`);
            } else {
                console.error(`[ISOLATED ENGINE] (${this.planId}) Execution failed. Details:`, error);
                throw error;
            }
            return false;
        } finally {
            // STEP 3: Safe, guaranteed Lock release under all circumstances
            if (isLockedByUs) {
                try {
                    await this.db.runTransaction(async (t) => {
                        t.update(invRef, {
                            processing: false,
                            execution_lock: false,
                            last_processing_ended_at: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`[ISOLATED ENGINE] (${this.planId}) Lock released successfully in transaction.`);
                    });
                } catch (unlockErr) {
                    console.error(`[ISOLATED ENGINE] (${this.planId}) Guaranteed unlock transaction failed:`, unlockErr);
                    // Safe fallback: try non-transactional write in case transaction is failing due to heavy contention
                    try {
                        await invRef.update({
                            processing: false,
                            execution_lock: false,
                            last_processing_ended_at: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`[ISOLATED ENGINE] (${this.planId}) Lock force-released non-transactionally.`);
                    } catch (fbErr) {
                        console.error(`[ISOLATED ENGINE] (${this.planId}) CRITICAL: Non-transactional fallback unlock failed!`, fbErr);
                    }
                }
            }
        }
    }
}
