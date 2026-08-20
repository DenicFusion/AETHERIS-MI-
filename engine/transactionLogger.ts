import admin from 'firebase-admin';

export class TransactionLogger {
    static log(
        t: admin.firestore.Transaction,
        db: admin.firestore.Firestore,
        userId: string,
        type: string,
        status: string,
        amount: number,
        planName: string,
        referenceId: string,
        message: string,
        customTimestamp?: admin.firestore.Timestamp
    ) {
        const txRef = db.collection('transactions').doc();
        t.set(txRef, {
            user_id: userId,
            type,
            status,
            amount,
            plan: planName,
            reference: referenceId,
            message,
            timestamp: customTimestamp || admin.firestore.FieldValue.serverTimestamp()
        });
    }
}
