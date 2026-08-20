import admin from 'firebase-admin';
import { WalletEngine } from './walletEngine';
import { TransactionLogger } from './transactionLogger';

export class ProfitEngine {
    static async processIntervalProfit(
        t: admin.firestore.Transaction,
        db: admin.firestore.Firestore,
        userRef: admin.firestore.DocumentReference,
        userId: string,
        invId: string,
        invData: any,
        intervalDocRef: admin.firestore.DocumentReference,
        intervalData: any,
        isMaturity: boolean
    ): Promise<number> {
        // Prevent duplicate payout for this exact interval
        if (intervalData.prev_profit_paid === true) {
            return 0;
        }

        const isFlex = invData.model === 'flex' || (!invData.isFixed && invData.model !== 'fixed' && invData.model !== 'quick_trade');
        const profitPerInterval = invData.profit_per_interval || ((invData.expected_total_profit || 0) / (invData.total_intervals || 1));
        
        // For Flex model during intermediate cycles, accrue profit on the contract instead of adding to spendable profit balance immediately
        if (isFlex && !isMaturity) {
            t.update(intervalDocRef, { prev_profit_paid: true, accrued_profit: profitPerInterval });
            TransactionLogger.log(
                t, db, userId, "FLEX_CYCLE_COMPLETED", "SUCCESS", profitPerInterval,
                invData.plan || "Flex Plan", invId, 
                `Flex Cycle ${intervalData.sequence} Profit Accrued: $${profitPerInterval.toFixed(2)} (Unlocks at final maturity)`
            );
            return profitPerInterval;
        }

        await WalletEngine.applyProfit(t, userRef, userId, profitPerInterval);
        
        t.update(intervalDocRef, { prev_profit_paid: true });

        TransactionLogger.log(
            t, db, userId, isMaturity ? "MATURITY_PROFIT" : "CYCLE_DISTRIBUTION", "SUCCESS", profitPerInterval,
            invData.plan || "Trading Plan", invId, 
            isMaturity ? `Final Maturity Profit Payout` : `Trading Cycle Distribution Processed (Interval_${intervalData.sequence})`
        );

        return profitPerInterval;
    }
}
