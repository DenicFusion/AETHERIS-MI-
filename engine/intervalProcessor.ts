import admin from 'firebase-admin';
import { OverdueEngine } from './overdueEngine';
import { WalletEngine } from './walletEngine';
import { TransactionLogger } from './transactionLogger';
import { TradingEngineService } from '../src/lib/TradingEngineService';

export interface ProcessReport {
    didRun: boolean;
    actions: string[];
    intervalsHealed: number;
    initialCompleted: number;
    finalCompleted: number;
    initialProfitEarned: number;
    finalProfitEarned: number;
    initialDeposited: number;
    finalDeposited: number;
    initialBalance: number;
    finalBalance: number;
    reachedMaturity: boolean;
    brokeOnDeductionFailure: boolean;
    lockStatus?: string;
    pausedDueToFunds?: boolean;
    pausedDetails?: {
        userEmail: string;
        username: string;
        planName: string;
        neededAmount: number;
        userBalance: number;
    };
    successfulDeductions?: {
        amount: number;
        planName: string;
        userEmail: string;
        username: string;
    }[];
    failedDeductions?: {
        amount: number;
        planName: string;
        userEmail: string;
        username: string;
    }[];
    eventsToNotify?: {
        userId: string;
        type: 'deposit' | 'withdrawal' | 'profit' | 'interval' | 'broadcast' | 'system_alert' | 'referral_earning' | 'plan_activated' | 'plan_completed' | 'security' | 'support_reply';
        title: string;
        message: string;
    }[];
    adminNotificationsToNotify?: {
        type: string;
        title: string;
        message: string;
    }[];
}

export class IntervalProcessor {
    static async processNextInterval(
        t: admin.firestore.Transaction,
        db: admin.firestore.Firestore,
        invDoc: admin.firestore.DocumentSnapshot,
        userRef: admin.firestore.DocumentReference,
        currentTime: number
    ): Promise<ProcessReport> {
        const invData = invDoc.data()!;
        const invId = invDoc.id;
        const userId = invData.user_id;

        const report: ProcessReport = {
            didRun: false,
            actions: [],
            intervalsHealed: 0,
            initialCompleted: invData.intervals_completed || 0,
            finalCompleted: invData.intervals_completed || 0,
            initialProfitEarned: invData.total_profit_earned || 0,
            finalProfitEarned: invData.total_profit_earned || 0,
            initialDeposited: invData.deposited || 0,
            finalDeposited: invData.deposited || 0,
            initialBalance: 0,
            finalBalance: 0,
            reachedMaturity: false,
            brokeOnDeductionFailure: false,
            successfulDeductions: [],
            failedDeductions: [],
            eventsToNotify: [],
            adminNotificationsToNotify: []
        };

        // Bullet-proof permanent lock check for completed investments
        if (invData.status === 'completed') {
            report.actions.push(`Investment ${invId} is already completed. Process call rejected and locked.`);
            report.lockStatus = "completed_lock";
            return report;
        }

        // Fetch userDoc first (all reads must occur before all writes)
        const userDoc = await t.get(userRef);
        const userData = userDoc.data() || {};

        const initialUserBalance = userData.wallet_balance ?? userData.balance ?? 0;
        report.initialBalance = initialUserBalance;
        report.finalBalance = initialUserBalance;

        // Find all pending and overdue intervals
        const intervalsQuery = await t.get(
            db.collection('investments').doc(invId).collection('intervals')
                .where('status', 'in', ['pending', 'overdue'])
                .orderBy('sequence', 'asc')
        );

        // Find all paid intervals to definitively know how many completed we have
        const paidQuery = await t.get(
            db.collection('investments').doc(invId).collection('intervals')
                .where('status', '==', 'paid')
        );
        const actualPaidCount = paidQuery.size;

        if (intervalsQuery.empty) {
            // Check if maturity date has been reached
            const activationTime = invData.activation_time || invData.created_at || invData.started_at;
            const activationMs = activationTime ? activationTime.toDate().getTime() : currentTime;
            const durationDays = invData.duration_days || 30;
            const planMaturityTime = activationMs + (durationDays * 24 * 60 * 60 * 1000);

            if (currentTime >= planMaturityTime) {
                // All intervals paid -> Process Plan Maturity & return Principal & Profit
                await this.handleMaturity(t, db, invDoc, userRef, invData, userId, invId, report);
                report.didRun = true;
                report.reachedMaturity = true;
                
                report.finalCompleted = invData.total_intervals || 1;
                report.finalProfitEarned = invData.expected_total_profit || 0;
                report.finalDeposited = invData.deposited || 0;
                return report;
            } else {
                // Important: sync next_execution_time to the maturity time so the UI shows a countdown to Plan Completion
                const currentNextExecTime = invData.next_execution_time?.toDate ? invData.next_execution_time.toDate().getTime() : null;
                if (!currentNextExecTime || currentNextExecTime !== planMaturityTime) {
                    t.update(invDoc.ref, {
                        next_execution_time: admin.firestore.Timestamp.fromMillis(planMaturityTime),
                        next_profit_time: admin.firestore.Timestamp.fromMillis(planMaturityTime),
                        status: 'active'
                    });
                    report.actions.push(`Self-repair: Synced next_execution_time to the plan maturity date ${new Date(planMaturityTime).toISOString()}.`);
                }

                report.actions.push(`Investment has paid all intervals but has not yet reached full duration maturity.`);
                // Exit safely without error
                return report;
            }
        }

        // State trackers that carry values over multiple backlogged intervals
        let newCompleted = actualPaidCount;
        let newDeposited = newCompleted * (invData.amount_per_interval || 0);
        let newTotalProfitEarned = invData.total_profit_earned || 0;

        const signupBonus = userData.signup_reward_amount ?? 0;
        let virtualDepositBalance = Math.max(0, initialUserBalance - signupBonus);

        let virtualWalletBalance = initialUserBalance;
        let virtualLockedBalance = userData.locked_balance ?? 0;
        let virtualProfitBalance = userData.profit_balance ?? 0;
        let virtualTotalProfits = userData.total_profits ?? 0;

        const activationTime = invData.activation_time || invData.created_at || invData.started_at;
        const activationMs = activationTime ? activationTime.toDate().getTime() : currentTime;
        const intervalDays = invData.interval_days || 1;
        const totalIntervals = invData.total_intervals || 1;
        
        const expectedTotalProfit = invData.expected_total_profit || 0;
        const profitPerInterval = invData.profit_per_interval || (expectedTotalProfit / totalIntervals);

        let didRunAny = false;
        let brokeOnDeductionFailure = false;
        let reachedMaturityInLoop = false;

        const docsToProcess = intervalsQuery.docs;
        const model = invData.model || (invData.isFixed ? 'fixed' : 'flex');

        for (const intDoc of docsToProcess) {
            const intData = intDoc.data();
            const seq = intData.sequence;
            const dueTime = intData.due_date.toDate().getTime();

            // Check if it's actually time to process
            if (currentTime < dueTime) {
                // Check if upcoming Flex renewal due reminder should be triggered (<= 6 hours away)
                if (model === 'flex' && dueTime - currentTime <= 6 * 60 * 60 * 1000 && intData.renewal_due_notified !== true) {
                    const recurringPrincipal = invData.recurring_principal || invData.amount_per_interval || (invData.total_amount / totalIntervals);
                    report.eventsToNotify = report.eventsToNotify || [];
                    report.eventsToNotify.push({
                        userId,
                        type: 'interval',
                        title: `Flex Renewal Due`,
                        message: `Your next $${recurringPrincipal.toFixed(2)} recurring contribution is due in 6 hours.`
                    });
                    t.update(intDoc.ref, { renewal_due_notified: true });
                }

                report.actions.push(`Interval_${seq} is scheduled for future (${new Date(dueTime).toISOString()}). Stopping catch-up loop.`);
                break; // Not due yet, stop checking subsequent intervals
            }

            didRunAny = true;

            // 1. Process Profit for completed previous interval (before we deduct the new one)
            const isFirstInterval = seq === 1;

            if (!isFirstInterval && intData.prev_profit_paid !== true) {
                t.update(intDoc.ref, { prev_profit_paid: true });

                if (model === 'flex') {
                    // FOR FLEX: Accumulate into investment's total_profit_earned, but do NOT add to user profit balance until final maturity!
                    newTotalProfitEarned += profitPerInterval;
                    t.update(intDoc.ref, { accrued_profit: profitPerInterval });

                    const recurringPrincipal = invData.recurring_principal || invData.amount_per_interval || (invData.total_amount / totalIntervals);
                    const returnPct = invData.return_pct || invData.expectedReturn || 0;
                    const cycleProfit = profitPerInterval || (recurringPrincipal * (returnPct / 100));
                    const cyclePayout = recurringPrincipal + cycleProfit;

                    if (intData.cycle_completed_tx_logged !== true) {
                        const txRef = db.collection('transactions').doc();
                        t.set(txRef, {
                            user_id: userId,
                            type: "FLEX_CYCLE_COMPLETED",
                            status: "SUCCESS",
                            amount: cycleProfit,
                            principal: recurringPrincipal,
                            profit: cycleProfit,
                            payout: cyclePayout,
                            cycle: seq - 1,
                            total_cycles: totalIntervals,
                            plan: invData.plan || "Flex Plan",
                            model: 'flex',
                            reference: invId,
                            message: `Flex Cycle ${seq - 1} Completed. Cycle Profit: $${cycleProfit.toFixed(2)} accrued (Unlocks at final completion).`,
                            timestamp: admin.firestore.Timestamp.fromMillis(currentTime + (seq * 10000))
                        });

                        t.update(intDoc.ref, { cycle_completed_tx_logged: true });

                        report.eventsToNotify = report.eventsToNotify || [];
                        report.eventsToNotify.push({
                            userId,
                            type: 'profit',
                            title: `Flex Cycle Completed`,
                            message: `Cycle ${seq - 1} of ${totalIntervals} has completed! +$${cycleProfit.toFixed(2)} accrued (Unlocks at final plan completion).`
                        });
                    }

                    report.actions.push(`Interval_${seq}: Accrued Flex cycle profit of $${cycleProfit.toFixed(2)} (accumulates until final completion).`);
                } else {
                    // For Fixed/Standard: Apply profit immediately to user's profit balance
                    virtualProfitBalance += profitPerInterval;
                    virtualTotalProfits += profitPerInterval;
                    newTotalProfitEarned += profitPerInterval;

                    TransactionLogger.log(
                        t, db, userId, "CYCLE_DISTRIBUTION", "SUCCESS", profitPerInterval,
                        invData.plan || "Trading Plan", invId, 
                        `Trading Cycle Distribution Processed (Interval_${seq})`,
                        admin.firestore.Timestamp.fromMillis(currentTime + (seq * 10000))
                    );

                    report.eventsToNotify = report.eventsToNotify || [];
                    report.eventsToNotify.push({
                        userId,
                        type: 'profit',
                        title: `Cycle Distribution Processed ⚡`,
                        message: `Your trading cycle distribution of $${profitPerInterval.toFixed(2)} under your trading plan "${invData.plan || 'Trading Plan'}" has been successfully processed and credited to your balance.`
                    });

                    report.actions.push(`Interval_${seq}: Executed missed trading cycle distribution of $${profitPerInterval.toFixed(2)}.`);
                }

                report.adminNotificationsToNotify = report.adminNotificationsToNotify || [];
                report.adminNotificationsToNotify.push({
                    type: 'cycle_distribution',
                    title: 'Cycle Distribution Processed',
                    message: `Trading cycle distribution of $${profitPerInterval.toFixed(2)} has been successfully processed for user ${userData.username || userId} under plan "${invData.plan || 'Trading Plan'}".`
                });
            }

            // 2. Process Deduction
            const intervalAmount = intData.amount_due || invData.amount_per_interval || 0;
            const { isOverdue, lateFee } = OverdueEngine.checkOverdue(dueTime, currentTime);
            const totalNeeded = intervalAmount + lateFee;

            if (virtualDepositBalance >= totalNeeded) {
                // Success: deduct virtual state
                virtualDepositBalance -= totalNeeded;
                virtualWalletBalance -= totalNeeded;
                virtualLockedBalance += intervalAmount;

                t.update(intDoc.ref, {
                    status: 'paid',
                    paid_at: admin.firestore.FieldValue.serverTimestamp()
                });

                newCompleted += 1;
                newDeposited += intervalAmount;
                report.intervalsHealed += 1;
                report.successfulDeductions?.push({
                    amount: intervalAmount,
                    planName: invData.plan || "Trading Plan",
                    userEmail: userData.email,
                    username: userData.username || userData.full_name?.split(' ')[0] || "Valued User"
                });

                if (model === 'flex') {
                    const recurringPrincipal = intervalAmount;
                    const returnPct = invData.return_pct || invData.expectedReturn || 0;
                    const cycleProfit = recurringPrincipal * (returnPct / 100);
                    const cyclePayout = recurringPrincipal + cycleProfit;

                    if (intData.cycle_started_tx_logged !== true) {
                        const txRef = db.collection('transactions').doc();
                        t.set(txRef, {
                            user_id: userId,
                            type: seq === 1 ? "FLEX_CYCLE_STARTED" : "FLEX_RENEWAL_COMPLETED",
                            status: "SUCCESS",
                            amount: recurringPrincipal,
                            principal: recurringPrincipal,
                            profit: cycleProfit,
                            payout: cyclePayout,
                            cycle: seq,
                            total_cycles: totalIntervals,
                            plan: invData.plan || "Flex Plan",
                            model: 'flex',
                            reference: invId,
                            message: `Flex Cycle ${seq} ${seq === 1 ? 'Started' : 'Renewed'}. Recurring principal: $${recurringPrincipal.toFixed(2)} | Target payout: $${cyclePayout.toFixed(2)} | Due: Day ${seq * intervalDays}`,
                            timestamp: admin.firestore.Timestamp.fromMillis(currentTime + (seq * 10000) - 5000)
                        });

                        t.update(intDoc.ref, { cycle_started_tx_logged: true });

                        report.eventsToNotify = report.eventsToNotify || [];
                        report.eventsToNotify.push({
                            userId,
                            type: 'interval',
                            title: seq === 1 ? `Flex Cycle 1 Started` : `Flex Cycle Renewed`,
                            message: seq === 1 
                                ? `Principal: $${recurringPrincipal.toFixed(2)}. Target payout: $${cyclePayout.toFixed(2)}. Due: Day ${intervalDays}`
                                : `$${recurringPrincipal.toFixed(2)} has been allocated for your next Flex cycle.`
                        });
                    }
                } else {
                    TransactionLogger.log(
                        t, db, userId, "INTERVAL_DEDUCTION", "SUCCESS", intervalAmount,
                        invData.plan || "Trading Plan", invId,
                        lateFee > 0 ? `Interval Deduction (Interval_${seq} - Overdue w/ Fee)` : `Interval Deduction (Interval_${seq})`,
                        admin.firestore.Timestamp.fromMillis(currentTime + (seq * 10000) - 5000)
                    );

                    report.eventsToNotify = report.eventsToNotify || [];
                    report.eventsToNotify.push({
                        userId,
                        type: 'interval',
                        title: `Allocation Balance Covered 🔄`,
                        message: `Successfully processed capital interval payment of $${intervalAmount.toFixed(2)} under your system trading plan "${invData.plan || 'Trading Plan'}".`
                    });
                }

                report.actions.push(`Interval_${seq}: Executed deduction of $${intervalAmount.toFixed(2)}${lateFee > 0 ? ` with extra late fee of $${lateFee.toFixed(2)}` : ''}.`);

                report.adminNotificationsToNotify = report.adminNotificationsToNotify || [];
                report.adminNotificationsToNotify.push({
                    type: 'interval_deduction',
                    title: 'Interval Deduction',
                    message: `Successfully processed interval deduction of $${intervalAmount.toFixed(2)} for user ${userData.username || userId} under plan "${invData.plan || 'Trading Plan'}".`
                });

                // Setup Next Interval times INDEPENDENT of everything else
                if (newCompleted >= totalIntervals) {
                    reachedMaturityInLoop = true;
                    
                    // Release Principal
                    virtualWalletBalance += newDeposited;
                    virtualLockedBalance -= newDeposited;

                    report.actions.push(`Plan reached maturity in loop! Released principal of $${newDeposited.toFixed(2)} back to user balance.`);

                    if (model === 'flex') {
                        // For Flex: Entire accumulated profit is released into profit balance upon final completion
                        const totalFlexProfit = expectedTotalProfit;
                        virtualProfitBalance += totalFlexProfit;
                        virtualTotalProfits += totalFlexProfit;
                        newTotalProfitEarned = totalFlexProfit;

                        TransactionLogger.log(
                            t, db, userId, "MATURITY_PROFIT", "SUCCESS", totalFlexProfit,
                            invData.plan || "Flex Plan", invId,
                            `Flex Plan Final Maturity: Full Accumulated Profit of $${totalFlexProfit.toFixed(2)} Released to Profit Balance`
                        );
                        report.actions.push(`Flex Plan reached final completion! Credited total accumulated profit of $${totalFlexProfit.toFixed(2)} to profit balance.`);
                    } else {
                        // Any final extra outstanding final profit?
                        if (newTotalProfitEarned < expectedTotalProfit - 0.01) {
                            const remainingProfit = expectedTotalProfit - newTotalProfitEarned;
                            virtualProfitBalance += remainingProfit;
                            virtualTotalProfits += remainingProfit;
                            newTotalProfitEarned = expectedTotalProfit;
                        }
                    }
                    break; // Fully complete
                }
            } else {
                // Failed to deduct: stop progression, record why & set status
                brokeOnDeductionFailure = true;

                const lastNotifiedAt = intData.last_notified_at?.toDate()?.getTime() || 0;
                const timeSinceLastNotification = currentTime - lastNotifiedAt;
                const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
                const shouldNotify = (!intData.last_notified_at || timeSinceLastNotification >= TWENTY_FOUR_HOURS_MS);
                const hasRecordedFailedTx = intData.failed_tx_recorded === true;

                if (isOverdue) {
                    OverdueEngine.markIntervalOverdue(t, intDoc.ref, invDoc.ref, lateFee);
                    report.actions.push(`Interval_${seq}: Overdue deduction unresolved due to insufficient balance. Short of $${totalNeeded.toFixed(2)} (Deposit balance: $${virtualDepositBalance.toFixed(2)}). Plan status set to OVERDUE.`);
                } else {
                    t.update(invDoc.ref, { status: 'paused', interval_status: 'failed' });
                    report.actions.push(`Interval_${seq}: Deduction unresolved due to insufficient balance. Short of $${totalNeeded.toFixed(2)} (Deposit balance: $${virtualDepositBalance.toFixed(2)}). Plan status set to PAUSED.`);
                }

                const intervalUpdates: any = {};

                if (model === 'flex') {
                    const recurringPrincipal = intervalAmount;
                    const shortfall = totalNeeded - virtualDepositBalance;

                    if (!hasRecordedFailedTx) {
                        const txRef = db.collection('transactions').doc();
                        t.set(txRef, {
                            user_id: userId,
                            type: "FLEX_RENEWAL_FAILED",
                            status: "FAILED",
                            amount: recurringPrincipal,
                            principal: recurringPrincipal,
                            shortfall: shortfall,
                            plan: invData.plan || "Flex Plan",
                            model: 'flex',
                            reference: invId,
                            message: `Flex Renewal Failed. $${recurringPrincipal.toFixed(2)} required to start next cycle. Available balance: $${virtualWalletBalance.toFixed(2)}. Shortfall: $${shortfall.toFixed(2)}.`,
                            reason: "insufficient allocated balance",
                            timestamp: admin.firestore.Timestamp.fromMillis(currentTime + (seq * 10000) - 5000)
                        });

                        intervalUpdates.failed_tx_recorded = true;
                    }

                    if (shouldNotify) {
                        report.eventsToNotify = report.eventsToNotify || [];
                        report.eventsToNotify.push({
                            userId,
                            type: 'system_alert',
                            title: `Flex Renewal Required`,
                            message: `$${recurringPrincipal.toFixed(2)} is required to start your next cycle. Available balance: $${virtualWalletBalance.toFixed(2)}. Shortfall: $${shortfall.toFixed(2)}.`
                        });
                    }
                } else {
                    if (!hasRecordedFailedTx) {
                        const txRef = db.collection('transactions').doc();
                        t.set(txRef, {
                            user_id: userId,
                            type: "INTERVAL_DEDUCTION",
                            status: "FAILED",
                            amount: intervalAmount,
                            plan: invData.plan || "Trading Plan",
                            reference: invId,
                            message: "Allocation interval contribution failed due to insufficient allocated balance",
                            reason: "insufficient allocated balance",
                            timestamp: admin.firestore.Timestamp.fromMillis(currentTime + (seq * 10000) - 5000)
                        });
                        
                        intervalUpdates.failed_tx_recorded = true;
                    }

                    if (shouldNotify) {
                        report.eventsToNotify = report.eventsToNotify || [];
                        report.eventsToNotify.push({
                            userId,
                            type: 'system_alert',
                            title: `Trading Operations Auto-Paused ⚠️`,
                            message: `Capital interval payment was not completed due to insufficient balance. Your active trading plan "${invData.plan || 'Trading Plan'}" has been paused. Reason: insufficient allocated balance.`
                        });
                    }
                }

                if (shouldNotify) {
                    report.failedDeductions?.push({
                        amount: intervalAmount,
                        planName: invData.plan || "Trading Plan",
                        userEmail: userData.email,
                        username: userData.username || userData.full_name?.split(' ')[0] || "Valued User"
                    });

                    report.adminNotificationsToNotify = report.adminNotificationsToNotify || [];
                    report.adminNotificationsToNotify.push({
                        type: 'failed_deduction',
                        title: `Failed Interval Deduction`,
                        message: `Trading plan for user ${userData.username || userId} has been paused because of failed interval deduction ($${intervalAmount.toFixed(2)} needed).`
                    });

                    report.pausedDueToFunds = true;
                    report.pausedDetails = {
                        userEmail: userData.email || "",
                        username: userData.username || "Investor",
                        planName: invData.plan || "Investment Plan",
                        neededAmount: totalNeeded,
                        userBalance: virtualWalletBalance
                    };
                    
                    intervalUpdates.last_notified_at = admin.firestore.FieldValue.serverTimestamp();
                }

                if (Object.keys(intervalUpdates).length > 0) {
                    t.update(intDoc.ref, intervalUpdates);
                }

                break; // Stop any further processing
            }
        }

        if (!didRunAny) {
            // Self-repair synchronization logic:
            // Check if intervals_completed or next_execution_time are out of sync with actual database status.
            const firstPendingDoc = intervalsQuery.docs[0];
            const firstPendingData = firstPendingDoc?.data();
            const firstPendingDue = firstPendingData?.due_date;
            
            let needsHealingSync = false;
            const invUpdates: any = {};

            // 1. Check intervals completed
            if (invData.intervals_completed !== actualPaidCount) {
                invUpdates.intervals_completed = actualPaidCount;
                needsHealingSync = true;
                report.actions.push(`Self-repair: Syncing intervals_completed from ${invData.intervals_completed} to actual paid size ${actualPaidCount}.`);
            }

            // 2. Check deposited amount
            const correctDeposited = actualPaidCount * (invData.amount_per_interval || 0);
            if (invData.deposited !== correctDeposited) {
                invUpdates.deposited = correctDeposited;
                invUpdates.progress = Math.min(100, Math.round((correctDeposited / (invData.total_amount || 1)) * 100));
                needsHealingSync = true;
                report.actions.push(`Self-repair: Syncing deposited amount to $${correctDeposited.toFixed(2)}.`);
            }

            // 3. Check next_execution_time
            if (firstPendingDue) {
                const currentNextExecTime = invData.next_execution_time?.toDate ? invData.next_execution_time.toDate().getTime() : null;
                const pendingDueTime = firstPendingDue.toDate().getTime();

                // If next_execution_time is in the past but the pending interval is scheduled in the future, we are out of sync!
                if (!currentNextExecTime || (currentNextExecTime < currentTime && pendingDueTime > currentTime) || currentNextExecTime !== pendingDueTime) {
                    invUpdates.next_execution_time = firstPendingDue;
                    invUpdates.next_profit_time = firstPendingDue;
                    needsHealingSync = true;
                    report.actions.push(`Self-repair: Syncing next_execution_time and next_profit_time to the next scheduled interval's due date (${new Date(pendingDueTime).toISOString()}).`);
                }
            }

            // 4. Force status to active if appropriate
            if (['paused', 'overdue'].includes(invData.status) && firstPendingDue && firstPendingDue.toDate().getTime() > currentTime) {
                invUpdates.status = 'active';
                invUpdates.interval_status = 'pending';
                invUpdates.trading_status = 'active';
                invUpdates.profit_status = 'active';
                needsHealingSync = true;
                report.actions.push(`Self-repair: Changing status back to active since the upcoming interval is scheduled in the future.`);
            }

            if (needsHealingSync) {
                t.update(invDoc.ref, invUpdates);
                report.didRun = true;
                report.finalCompleted = invUpdates.intervals_completed ?? invData.intervals_completed;
                report.finalDeposited = invUpdates.deposited ?? invData.deposited;
                report.actions.push(`Executed automatic synchronization and repaired out-of-sync plan timestamp indicators.`);
                return report;
            }

            report.actions.push(`No pending or overdue intervals were currently due. Countdown clock is correctly keeping track.`);
            return report;
        }

        // Commit all virtual user balances inside transaction
        t.update(userRef, {
            wallet_balance: virtualWalletBalance,
            balance: virtualWalletBalance,
            locked_balance: virtualLockedBalance,
            profit_balance: virtualProfitBalance,
            total_profits: virtualTotalProfits,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        report.finalBalance = virtualWalletBalance;
        report.finalCompleted = newCompleted;
        report.finalProfitEarned = newTotalProfitEarned;
        report.finalDeposited = newDeposited;
        report.reachedMaturity = reachedMaturityInLoop;
        report.brokeOnDeductionFailure = brokeOnDeductionFailure;
        report.didRun = true;

        // Setup Investment doc updates
        const invUpdates: any = {
            intervals_completed: newCompleted,
            deposited: newDeposited,
            total_profit_earned: newTotalProfitEarned,
            progress: Math.min(100, Math.round((newDeposited / (invData.total_amount || 1)) * 100))
        };

        if (reachedMaturityInLoop) {
            invUpdates.status = 'completed';
            invUpdates.completed_at = admin.firestore.FieldValue.serverTimestamp();
            report.actions.push(`Investment marked as completed.`);
        } else if (!brokeOnDeductionFailure) {
            invUpdates.status = 'active';
            invUpdates.last_execution_time = admin.firestore.FieldValue.serverTimestamp();

            // Set up all future interval due times precisely and deterministically starting from activationMs
            for (let i = newCompleted + 1; i <= totalIntervals; i++) {
                const iRef = invDoc.ref.collection('intervals').doc(`interval_${i}`);
                const intervalDueTs = activationMs + ((i - 1) * intervalDays * 24 * 60 * 60 * 1000);
                t.update(iRef, { due_date: admin.firestore.Timestamp.fromMillis(intervalDueTs) });
            }

            const nextDueTs = activationMs + (newCompleted * intervalDays * 24 * 60 * 60 * 1000);
            invUpdates.next_profit_time = admin.firestore.Timestamp.fromMillis(nextDueTs);
            invUpdates.next_execution_time = admin.firestore.Timestamp.fromMillis(nextDueTs);

            report.actions.push(`Reset independent countdown timing: Next execution set to ${new Date(nextDueTs).toISOString()}. Realized countdown from activation date (${new Date(activationMs).toLocaleDateString()}).`);
        }

        t.update(invDoc.ref, invUpdates);
        return report;
    }

    static async handleMaturity(
        t: admin.firestore.Transaction,
        db: admin.firestore.Firestore,
        invDoc: admin.firestore.DocumentSnapshot,
        userRef: admin.firestore.DocumentReference,
        invData: any,
        userId: string,
        invId: string,
        report: ProcessReport
    ) {
        const actions = report.actions;
        if (invData.status === 'completed') {
            actions.push(`Maturity block skipped: already completed.`);
            return;
        }

        const invUpdates: any = {
            status: 'completed',
            progress: 100,
            completed_at: admin.firestore.FieldValue.serverTimestamp()
        };

        const depositAmount = invData.deposited || 0;

        // Accumulate user updates to avoid "cannot write to document twice in a single transaction" error
        const userUpdates: any = {};
        
        // Unlock and refund principal back to main balance and wallet balance
        userUpdates.wallet_balance = admin.firestore.FieldValue.increment(depositAmount);
        userUpdates.balance = admin.firestore.FieldValue.increment(depositAmount);
        userUpdates.locked_balance = admin.firestore.FieldValue.increment(-depositAmount);
        userUpdates.updated_at = admin.firestore.FieldValue.serverTimestamp();
        
        actions.push(`Maturity Payout triggered: fully released original deposit amount $${depositAmount.toFixed(2)} back to wallet.`);

        // Retrieve fresh plan configuration to ensure payout values are derived from exact percentage in Admin Panel
        const planName = invData.plan || "";
        const isProPlan = invData.isPro === true || planName.toUpperCase().includes("PRO");
        const cleanBaseName = planName.replace(" PRO", "").trim().toUpperCase();
        
        let planConfig: any = {};
        try {
            const planSnap = await db.collection('plans').doc(cleanBaseName.toLowerCase()).get();
            if (planSnap.exists) {
                planConfig = planSnap.data() || {};
            }
        } catch (planErr) {
            console.error(`[Maturity] Failed to load fresh plan configuration for ${cleanBaseName}:`, planErr);
        }

        const mergedData = {
            ...planConfig,
            ...invData, // values directly on the investment (total_amount, isPro, etc) override if not set
            maxOutcome: planConfig.maxOutcome !== undefined ? planConfig.maxOutcome : invData.maxOutcome,
            proMultiplier: planConfig.proMultiplier !== undefined ? planConfig.proMultiplier : invData.proMultiplier
        };

        const outcomes = TradingEngineService.getPlanOutcomes(mergedData);
        const expectedTotalProfitAtMaturity = Math.max(outcomes.maxOutcome - outcomes.capital, invData.expected_total_profit || 0);

        const model = invData.model || (invData.isFixed ? 'fixed' : 'flex');
        const completionValue = invData.completion_value || invData.completionValue || (depositAmount + expectedTotalProfitAtMaturity);

        if (invData.completion_tx_logged !== true) {
            invUpdates.completion_tx_logged = true;

            const txRef = db.collection('transactions').doc();
            if (model === 'flex') {
                const totalCycles = invData.total_cycles || invData.total_intervals || 1;
                const recurringPrincipal = invData.recurring_principal || invData.amount_per_interval || (invData.total_amount / totalCycles);
                const returnPct = invData.return_pct || invData.expectedReturn || 0;
                const cycleProfit = recurringPrincipal * (returnPct / 100);
                const cyclePayout = recurringPrincipal + cycleProfit;

                t.set(txRef, {
                    user_id: userId,
                    type: "FLEX_CYCLE_COMPLETED",
                    status: "SUCCESS",
                    amount: cyclePayout,
                    principal: recurringPrincipal,
                    profit: cycleProfit,
                    payout: cyclePayout,
                    cycle: totalCycles,
                    total_cycles: totalCycles,
                    plan: invData.plan || "Flex Plan",
                    model: 'flex',
                    reference: invId,
                    message: `Flex Cycle ${totalCycles} Completed. Cycle Principal: $${recurringPrincipal.toFixed(2)} | Cycle Profit: $${cycleProfit.toFixed(2)} | Cycle Payout: $${cyclePayout.toFixed(2)}`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                report.eventsToNotify = report.eventsToNotify || [];
                report.eventsToNotify.push({
                    userId,
                    type: 'plan_completed',
                    title: `Flex Cycle Completed`,
                    message: `Cycle ${totalCycles} of ${totalCycles} has completed. Payout: +$${cyclePayout.toFixed(2)}`
                });
            } else {
                t.set(txRef, {
                    user_id: userId,
                    type: "PROFIT_PAYOUT",
                    status: "SUCCESS",
                    amount: completionValue,
                    principal: depositAmount,
                    profit: expectedTotalProfitAtMaturity,
                    payout: completionValue,
                    plan: invData.plan || "Investment Plan",
                    model: model,
                    reference: invId,
                    message: `${model === 'quick_trade' ? 'Quick Trade' : 'Fixed'} investment completed successfully. Investment: $${depositAmount.toFixed(2)} | Target Payout: $${completionValue.toFixed(2)} | Profit: $${expectedTotalProfitAtMaturity.toFixed(2)}`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                report.eventsToNotify = report.eventsToNotify || [];
                report.eventsToNotify.push({
                    userId,
                    type: 'plan_completed',
                    title: `Profit Payout`,
                    message: `Your ${model === 'quick_trade' ? 'Quick Trade' : 'Fixed'} investment has completed. Payout: +$${completionValue.toFixed(2)}`
                });
            }
        }

        report.adminNotificationsToNotify = report.adminNotificationsToNotify || [];
        report.adminNotificationsToNotify.push({
            type: 'plan_completed',
            title: 'Trading Plan Completed',
            message: `Trading plan "${invData.plan || 'Trading Plan'}" for user ${userId} has successfully completed with final outstanding projections paid.`
        });

        // Calculate and pay outstanding final profits at maturity
        const earnedSoFar = invData.total_profit_earned || 0;

        let remainingProfit = 0;
        if (model === 'flex') {
            // For Flex model, the entire accumulated profit is released as a lump sum at final maturity
            remainingProfit = expectedTotalProfitAtMaturity;
            
            userUpdates.profit_balance = admin.firestore.FieldValue.increment(remainingProfit);
            userUpdates.total_profits = admin.firestore.FieldValue.increment(remainingProfit);
            
            invUpdates.total_profit_earned = expectedTotalProfitAtMaturity;

            TransactionLogger.log(
                t, db, userId, "MATURITY_PROFIT", "SUCCESS", remainingProfit,
                invData.plan || "Flex Plan", invId,
                `Flex Plan Final Maturity: Full Accumulated Profit of $${remainingProfit.toFixed(2)} Released to Profit Balance`
            );
            actions.push(`Flex Final Maturity: Full accumulated profit of $${remainingProfit.toFixed(2)} credited to user profit balance.`);
        } else {
            if (earnedSoFar < expectedTotalProfitAtMaturity - 0.01) {
                remainingProfit = expectedTotalProfitAtMaturity - earnedSoFar;
                
                userUpdates.profit_balance = admin.firestore.FieldValue.increment(remainingProfit);
                userUpdates.total_profits = admin.firestore.FieldValue.increment(remainingProfit);
                
                invUpdates.total_profit_earned = expectedTotalProfitAtMaturity;

                TransactionLogger.log(
                    t, db, userId, "MATURITY_PROFIT", "SUCCESS", remainingProfit,
                    invData.plan || "Investment", invId,
                    "Final Maturity Profit Payout"
                );
                actions.push(`Maturity Payout triggered: Paid outstanding final yield balance of $${remainingProfit.toFixed(2)}.`);
            }
        }

        // Calculate and cache final balance offline to prevent violating Firestore's read-before-write transaction rules
        report.finalBalance = (report.initialBalance ?? 0) + depositAmount + remainingProfit;

        t.update(userRef, userUpdates);
        t.update(invDoc.ref, invUpdates);
    }
}
