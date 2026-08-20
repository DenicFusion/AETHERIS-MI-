import admin from 'firebase-admin';
import { notifyUser } from '../server/services/notifications';

export class ActivationReminderEngine {
    static async runReminders(db: admin.firestore.Firestore) {
        console.log('[ActivationReminderEngine] Scanning for un-activated user portfolios...');
        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        
        try {
            // Fetch all users
            const usersSnap = await db.collection('users').get();
            
            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                const userData = userDoc.data();
                
                // Exclude administrators or disabled reminders
                if (userData.reminders_disabled === true || userData.role === 'admin') {
                    continue;
                }
                
                // Query active investments/payout cycles for this user
                const activePlans = await db.collection('investments')
                    .where('userId', '==', userId)
                    .where('status', '==', 'active')
                    .limit(1)
                    .get();
                
                if (!activePlans.empty) {
                    // User is already active, skip
                    continue;
                }
                
                // No active plan is registered
                const lastReminder = userData.last_activation_reminder_sent_at?.toDate?.()?.getTime() || 0;
                
                let shouldSend = false;
                let isImmediate = false;
                
                if (lastReminder === 0) {
                    shouldSend = true;
                    isImmediate = true;
                } else if (now - lastReminder >= threeDaysMs) {
                    shouldSend = true;
                }
                
                if (shouldSend) {
                    console.log(`[ActivationReminderEngine] Sending reminder to ${userData.email}`);
                    
                    const title = isImmediate
                        ? "Discover Automated Market Systems"
                        : "Portfolio Setup Pending Activation";
                    
                    const message = isImmediate
                        ? "Your Aetheris account is verified and ready. Explore available AI trading plans and automated market systems designed to help you achieve your financial objectives with advanced quantitative models."
                        : "New automated opportunities are active in your region. Explore available AI trading plans and automated market systems, and configure your first trading cycle directly inside your terminal.";
                    
                    // Dispatches push notification + email automatically
                    await notifyUser(userId, 'system_alert', title, message);
                    
                    await db.collection('users').doc(userId).update({
                        last_activation_reminder_sent_at: admin.firestore.Timestamp.fromMillis(now),
                        activation_reminder_count: admin.firestore.FieldValue.increment(1)
                    });
                }
            }
        } catch (err: any) {
            console.error('[ActivationReminderEngine] Routine failed:', err);
        }
    }
}
