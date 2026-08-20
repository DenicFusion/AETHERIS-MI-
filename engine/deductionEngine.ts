import admin from 'firebase-admin';
import { WalletEngine } from './walletEngine';
import { TransactionLogger } from './transactionLogger';

export class DeductionEngine {
    static async processDeduction(
        t: admin.firestore.Transaction,
        db: admin.firestore.Firestore,
        userRef: admin.firestore.DocumentReference,
        userId: string,
        invId: string,
        invData: any,
        intervalAmount: number,
        lateFee: number,
        sequence: number,
        prefetchedUserDoc?: admin.firestore.DocumentSnapshot
    ): Promise<boolean> {
        const totalNeeded = intervalAmount + lateFee;
        
        const success = await WalletEngine.deductInterval(t, userRef, userId, totalNeeded, prefetchedUserDoc);
        
        if (success) {
            TransactionLogger.log(
                t, db, userId, "INTERVAL_DEDUCTION", "SUCCESS", intervalAmount,
                invData.plan || "Investment", invId,
                lateFee > 0 ? `Interval Deduction (Interval_${sequence} - Overdue w/ Fee)` : `Interval Deduction (Interval_${sequence})`
            );
            return true;
        } else {
            TransactionLogger.log(
                t, db, userId, "INTERVAL_DEDUCTION", "FAILED", intervalAmount,
                invData.plan || "Investment", invId,
                "Insufficient balance for interval deduction"
            );
            return false;
        }
    }
}
