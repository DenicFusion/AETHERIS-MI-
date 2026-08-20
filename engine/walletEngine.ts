import admin from 'firebase-admin';

export class WalletEngine {
    static async deductInterval(
        t: admin.firestore.Transaction,
        userRef: admin.firestore.DocumentReference,
        userId: string,
        amount: number,
        prefetchedUserDoc?: admin.firestore.DocumentSnapshot
    ): Promise<boolean> {
        const userDoc = prefetchedUserDoc || await t.get(userRef);
        if (!userDoc.exists) return false;

        const userData = userDoc.data()!;
        const currentWalletBalance = userData.wallet_balance ?? userData.balance ?? 0;
        const currentLockedBalance = userData.locked_balance ?? 0;

        const signupBonus = userData.signup_reward_amount ?? 0;
        const currentDepositBalance = Math.max(0, currentWalletBalance - signupBonus);

        if (currentDepositBalance >= amount) {
            t.update(userRef, {
                wallet_balance: admin.firestore.FieldValue.increment(-amount),
                balance: admin.firestore.FieldValue.increment(-amount),
                locked_balance: admin.firestore.FieldValue.increment(amount),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            return true;
        }
        return false;
    }

    static async releasePrincipal(
        t: admin.firestore.Transaction,
        userRef: admin.firestore.DocumentReference,
        amount: number
    ): Promise<void> {
        t.update(userRef, {
            wallet_balance: admin.firestore.FieldValue.increment(amount),
            balance: admin.firestore.FieldValue.increment(amount),
            locked_balance: admin.firestore.FieldValue.increment(-amount),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    static async applyProfit(
        t: admin.firestore.Transaction,
        userRef: admin.firestore.DocumentReference,
        userId: string,
        amount: number
    ): Promise<void> {
        t.update(userRef, {
            profit_balance: admin.firestore.FieldValue.increment(amount),
            total_profits: admin.firestore.FieldValue.increment(amount),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}
