import admin from 'firebase-admin';
import { WalletEngine } from './walletEngine';
import { TransactionLogger } from './transactionLogger';

export class ActivationEngine {
    static async processPendingActivations(
        db: admin.firestore.Firestore,
        userId: string,
        // Accept transaction if called within a larger flow
        tOuter?: admin.firestore.Transaction,
        specificInvestmentId?: string
    ) {
        const userRef = db.collection('users').doc(userId);
        
        async function run(t: admin.firestore.Transaction) {
            let pendingDocs: admin.firestore.DocumentSnapshot[] = [];

            if (specificInvestmentId) {
                const invRef = db.collection('investments').doc(specificInvestmentId);
                const invSnap = await t.get(invRef);
                if (invSnap.exists) {
                    const data = invSnap.data();
                    if (data?.user_id === userId && data?.status === 'pending_activation') {
                        pendingDocs = [invSnap];
                    }
                }
            } else {
                const pendingQuery = await t.get(
                    db.collection('investments')
                      .where('user_id', '==', userId)
                      .where('status', '==', 'pending_activation')
                );
                pendingDocs = pendingQuery.docs;
            }
            
            if (pendingDocs.length === 0) return;
            
            // Pre-fetch user document before any writes
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) return;

            const userData = userDoc.data()!;
            let currentWalletBal = userData.wallet_balance ?? userData.balance ?? 0;
            const signupBonus = userData.signup_reward_amount ?? 0;
            let currentAvailDeposit = Math.max(0, currentWalletBal - signupBonus);
            
            for (const invDoc of pendingDocs) {
                const invData = invDoc.data()!;
                const intervalAmount = invData.amount_per_interval || invData.first_interval_amount || invData.total_amount || 0;
                const loopNow = new Date();
                const loopNowMs = loopNow.getTime();

                // Check 24-hour expiration for pending investments
                const createdTime = invData.created_at?.toDate?.()?.getTime?.() || 0;
                const expiresTime = invData.expires_at?.toDate?.()?.getTime?.() || (createdTime > 0 ? createdTime + 24 * 60 * 60 * 1000 : 0);
                const isExpired = expiresTime > 0 && loopNowMs >= expiresTime;

                if (isExpired) {
                    t.update(invDoc.ref, {
                        status: 'expired',
                        expired_at: admin.firestore.Timestamp.fromDate(loopNow)
                    });
                    TransactionLogger.log(
                        t, db, userId, "PLAN_EXPIRED", "FAILED", 0,
                        invData.plan || "Trading Plan", invDoc.id, "Pending trade expired after 24 hours without deposit"
                    );
                    const formattedAmount = `$${Number(invData.total_amount || 0).toLocaleString()}`;
                    const { notifyUser } = await import('../server/services/notifications');
                    notifyUser(userId, 'system_alert', 'Trade Allocation Expired ⏰', `Your pending trade "${invData.plan || 'Trading Plan'} ${formattedAmount}" has expired because payment was not completed within 24 hours.`).catch(console.error);
                    continue;
                }

                const canActivate = currentAvailDeposit >= intervalAmount && intervalAmount > 0;
                
                if (canActivate) {
                    // Deduct from wallet and lock balance
                    t.update(userRef, {
                        wallet_balance: admin.firestore.FieldValue.increment(-intervalAmount),
                        balance: admin.firestore.FieldValue.increment(-intervalAmount),
                        locked_balance: admin.firestore.FieldValue.increment(intervalAmount),
                        updated_at: admin.firestore.FieldValue.serverTimestamp()
                    });

                    currentAvailDeposit -= intervalAmount;
                    currentWalletBal -= intervalAmount;

                    TransactionLogger.log(
                        t, db, userId, "PLAN_ACTIVATED", "SUCCESS", 0,
                        invData.plan || "Trading Plan", invDoc.id, "Aetheris trading plan activated"
                    );

                    const intervalDays = invData.interval_days || 1;
                    const nextMs = loopNowMs + (intervalDays * 24 * 60 * 60 * 1000);
                    
                    t.update(invDoc.ref, {
                        status: 'active',
                        activation_time: admin.firestore.Timestamp.fromDate(loopNow),
                        last_execution_time: null,
                        next_execution_time: admin.firestore.Timestamp.fromMillis(nextMs),
                        next_profit_time: admin.firestore.Timestamp.fromMillis(nextMs),
                        total_profit_earned: 0,
                        progress: Math.min(100, Math.round((intervalAmount / (invData.total_amount || 1)) * 100)),
                        intervals_completed: 0,
                        deposited: intervalAmount,
                        profit_status: 'active',
                        trading_status: 'active',
                        interval_status: 'paid',
                        failed_activation_tx_recorded: false,
                        failed_tx_recorded: false
                    });

                    const totalIntervals = invData.total_intervals || 1;
                    for (let i = 1; i <= totalIntervals; i++) {
                        const iRef = invDoc.ref.collection('intervals').doc(`interval_${i}`);
                        const newDueMs = loopNowMs + ((i - 1) * intervalDays * 24 * 60 * 60 * 1000);
                        t.update(iRef, {
                            due_date: admin.firestore.Timestamp.fromMillis(newDueMs),
                            status: (i === 1) ? 'paid' : 'pending',
                            paid_at: (i === 1) ? admin.firestore.FieldValue.serverTimestamp() : null
                        });
                    }

                    TransactionLogger.log(
                        t, db, userId, "INTERVAL_DEDUCTION", "SUCCESS", intervalAmount,
                        invData.plan || "Trading Plan", invDoc.id, "Trading Operations Active - Initial Deduction"
                    );
                    
                    // Safe async notification hook (deferred)
                    const formattedAmount = `$${Number(invData.total_amount || 0).toLocaleString()}`;
                    const { notifyUser } = await import('../server/services/notifications');
                    notifyUser(userId, 'plan_activated', 'Aetheris Engine Activated ⚡', `Your AI Engine "${invData.plan} ${formattedAmount}" has been successfully initialized and activated.`).catch(console.error);

                } else {
                    const hasRecordedFailedTx = invData.failed_activation_tx_recorded === true;
                    if (!hasRecordedFailedTx) {
                        TransactionLogger.log(
                            t, db, userId, "INTERVAL_DEDUCTION", "FAILED", intervalAmount,
                            invData.plan || "Trading Plan", invDoc.id, "Insufficient capital balance"
                        );
                        t.update(invDoc.ref, {
                            failed_activation_tx_recorded: true
                        });
                    }
                    
                    const lastNotifiedAt = invData.last_pending_notified_at?.toDate()?.getTime() || 0;
                    const timeSinceLastNotification = loopNowMs - lastNotifiedAt;
                    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
                    
                    if (!invData.last_pending_notified_at || timeSinceLastNotification >= TWENTY_FOUR_HOURS_MS) {
                        t.update(invDoc.ref, {
                            last_pending_notified_at: admin.firestore.FieldValue.serverTimestamp()
                        });
                        const formattedAmount = `$${Number(invData.total_amount || 0).toLocaleString()}`;
                        const { notifyUser } = await import('../server/services/notifications');
                        notifyUser(userId, 'system_alert', 'Allocation Pending Capital', `Your allocation plan "${invData.plan} ${formattedAmount}" is pending capital distribution. Need $${intervalAmount.toFixed(2)} to initialize.`).catch(console.error);
                    }
                }
            }
        }

        if (tOuter) {
            await run(tOuter);
        } else {
            await db.runTransaction(run);
        }
    }

    static async processAllPendingActivations(db: admin.firestore.Firestore) {
        try {
            const pendingQuery = await db.collection('investments')
                .where('status', '==', 'pending_activation')
                .get();
            if (pendingQuery.empty) return;
            
            // Get unique user IDs with pending activations
            const userIds = Array.from(new Set(pendingQuery.docs.map(d => d.data().user_id).filter(Boolean)));
            for (const uid of userIds) {
                try {
                    await this.processPendingActivations(db, uid);
                } catch (userErr) {
                    console.error(`[ActivationEngine] Failed to process pending activations for user ${uid}:`, userErr);
                }
            }
        } catch (err) {
            console.error('[ActivationEngine] Error in processAllPendingActivations:', err);
        }
    }
}
