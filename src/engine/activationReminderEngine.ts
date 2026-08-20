import * as admin from 'firebase-admin';
import { sendSystemEmail } from '../../server';
import { notifyUser } from '../../server/services/notifications';
import { baseTemplate } from '../../server/templates/emailTemplates';

export class ActivationReminderEngine {
    static async run(db: admin.firestore.Firestore) {
        try {
            console.log("[ActivationReminderEngine] Scanning for inactive new users...");
            const now = Date.now();
            
            // We want to find users who signed up and have not activated a plan.
            // Since we don't necessarily have a strict `created_at` on all users,
            // we will query users and check their investments.
            // To be efficient, we check users created in the past 3 days who haven't been reminded.
            // Or we just scan all users without `activation_reminded` flag who have $0 investments.
            
            const usersSnap = await db.collection('users')
                .where('activation_reminded', '==', null)
                .limit(100)
                .get();

            if (usersSnap.empty) {
                return;
            }

            for (const doc of usersSnap.docs) {
                const userData = doc.data();
                const userId = doc.id;
                
                // If they have any active or completed investments, we skip.
                const invSnap = await db.collection('investments')
                    .where('user_id', '==', userId)
                    .limit(1)
                    .get();

                if (!invSnap.empty) {
                    // They have a plan. Mark as reminded so we don't check again.
                    await doc.ref.update({ activation_reminded: true });
                    continue;
                }

                // If no investments, let's see how old the user is.
                // If we don't have created_at, default to a day older so they get it.
                // Ideally they should get it 1-2 hours after signup.
                
                const createdAt = userData.created_at?.toDate?.()?.getTime() || (now - 3600000);   
                
                // If they are older than 1 hour.
                if (now - createdAt >= 3600000) {
                     console.log(`[ActivationReminderEngine] Sending reminder to ${userData.email}`);
                     
                     if (userData.email) {
                         const promoHtml = baseTemplate(`
                             <h3 style="margin-top: 0; color: #ffffff; font-size: 22px;">Hi ${userData.username || 'there'},</h3>
                             <p style="color: #cbd5e1; font-size: 16px;">We noticed you signed up but haven't activated a trading plan yet. Jumpstart your earnings today by exploring our AI-driven investment tiers!</p>
                             <div style="text-align: center; margin: 32px 0;">
                               <a href="https://aetheriss.online/dashboard/plans" style="display: inline-block; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Investment Plans</a>
                             </div>
                         `, 'Activate Your Trading Plan 🚀');
                         
                         await sendSystemEmail({
                             to: userData.email,
                             subject: 'Action Required: Activate Your Trading Plan - Aetheris',
                             html: promoHtml,
                             userId: userId,
                             type: 'marketing'
                         }).catch(() => {});
                     }
                     
                     await notifyUser(
                         userId,
                         'system_alert',
                         'Activate Your Trading Plan 🚀',
                         "You're missing out! Browse and activate an AI Trading Plan to start generating daily yield."
                     ).catch(() => {});
                     
                     await doc.ref.update({ activation_reminded: true });
                }
            }
            console.log("[ActivationReminderEngine] Scan complete.");
        } catch (e) {
            console.error("[ActivationReminderEngine] Error:", e);
        }
    }
}
