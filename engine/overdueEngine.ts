import admin from 'firebase-admin';

export class OverdueEngine {
    static checkOverdue(dueTime: number, currentTime: number): { isOverdue: boolean, lateFee: number } {
        // Example logic: if more than 12 hours past due date
        const isOverdue = (currentTime - dueTime) > 12 * 60 * 60 * 1000;
        const lateFee = isOverdue ? 15 : 0;
        return { isOverdue, lateFee };
    }

    static markIntervalOverdue(
        t: admin.firestore.Transaction,
        intervalRef: admin.firestore.DocumentReference,
        invRef: admin.firestore.DocumentReference,
        lateFee: number
    ) {
        t.update(intervalRef, {
            status: 'overdue',
            late_fee_applied: lateFee
        });
        
        t.update(invRef, {
            status: 'overdue'
        });
    }
}
