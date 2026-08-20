import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './dbService';
import admin from 'firebase-admin';
import { sendEmailDirect } from '../mail/mail.service';
import { baseTemplate } from '../mail/mail.templates';

const SYSTEM_EMAIL = process.env.SYSTEM_EMAIL || 'support@update.aetheriss.online';

async function logEmailMetric(db: FirebaseFirestore.Firestore, params: any, result: any, e?: any) {
    try {
      await db.collection('email_logs').add({
        userId: params.userId || 'system',
        email: params.to,
        type: params.type,
        subject: params.subject,
        status: e ? 'failed' : (result.success ? 'sent' : 'failed'),
        providerUsed: result?.provider,
        providerResponse: result,
        error: e?.message,
        createdAt: FieldValue.serverTimestamp()
      });
    } catch (ignore) {}
}

async function sendSystemEmail(params: { to: string, subject: string, html: string, type: string, userId?: string, from?: string }) {
  const db = getDb();
  try {
    let fromEmail = params.from;
    let finalSubject = params.subject;

    if (params.type === 'verification') {
      fromEmail = "Aetheris <verify-noreply@update.aetheriss.online>";
      finalSubject = params.subject || "Verify Your Account Now";
    } else if (params.type === 'transaction' || params.type === 'deposit' || params.type === 'withdrawal') {
      fromEmail = "Aetheris <no-reply@update.aetheriss.online>";
    } else if (params.type === 'support_reply') {
      fromEmail = "Aetheris <support@update.aetheriss.online>";
    }
    
    if (!fromEmail) fromEmail = SYSTEM_EMAIL;

    const result = await sendEmailDirect({
      to: params.to,
      from: fromEmail,
      subject: finalSubject,
      html: params.html
    });
    
    if (db) await logEmailMetric(db, params, result);
    return result.success;
  } catch (e: any) {
    if (db) await logEmailMetric(db, params, {}, e);
    return false;
  }
}

export async function notifyUser(
  userId: string, 
  type: 'deposit' | 'withdrawal' | 'profit' | 'interval' | 'broadcast' | 'system_alert' | 'referral_earning' | 'plan_activated' | 'plan_completed' | 'security' | 'support_reply', 
  title: string, 
  message: string,
  metadata?: {
    amount?: number | string;
    method?: string;
    referenceId?: string;
    transactionId?: string;
    status?: string;
    rejectionReason?: string;
  }
) {
  const db = getDb();
  if (!db) return;
  try {
    await db.collection('notifications').add({
      userId,
      type,
      title,
      message,
      status: 'unread',
      createdAt: FieldValue.serverTimestamp()
    });

    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      let pushSuccess = false;
      
      const prefs = userData.notification_preferences || {};
      const isEnabled = prefs[type] !== false && userData.push_enabled !== false;

      // Real-time Push Notification to Phone (FCM Multi-cast)
      if (isEnabled && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
         try {
           const messageObj = {
             notification: { title, body: message },
             tokens: userData.fcmTokens,
           };
           const response = await admin.messaging().sendEachForMulticast(messageObj);
           if (response.successCount > 0) {
             pushSuccess = true;
           }
           if (response.failureCount > 0) {
              const failedTokens: string[] = [];
              response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) failedTokens.push(userData.fcmTokens[idx]);
              });
              if (failedTokens.length > 0) {
                 await db.collection('users').doc(userId).update({
                    fcmTokens: FieldValue.arrayRemove(...failedTokens)
                 });
              }
           }
         } catch (fcmError) {
           console.error("[📱 FCM PUSH] Error", fcmError);
         }
      }

      // Real-time Phone/SMS Notification logging if phone_number is present
      if (userData.phone_number) {
        try {
          const cleanedPhone = String(userData.phone_number).trim();
          console.log(`\n================== [📱 SMS GATEWAY TRANSMISSION] ==================`);
          console.log(`Recipient UID:  ${userId}`);
          console.log(`Phone Network:  ${cleanedPhone}`);
          console.log(`Alert Title:    ${title}`);
          console.log(`Alert Body:     ${message}`);
          console.log(`==================================================================\n`);

          await db.collection('sms_logs').add({
            userId,
            phoneNumber: cleanedPhone,
            title,
            message,
            status: 'delivered',
            type,
            timestamp: FieldValue.serverTimestamp()
          });
        } catch (smsErr) {
          console.error("[📱 SMS GATEWAY] Logging failed:", smsErr);
        }
      }

      // Real-time Email Notification
      if (userData.email_notifications !== false || !pushSuccess) {
         if (userData.email) {
           if (type === 'withdrawal' && metadata) {
             try {
               const { sendTransactionEmail } = await import('../mail/mail.service');
               await sendTransactionEmail({
                 to: userData.email,
                 username: userData.username || 'Investor',
                 transactionType: 'Withdrawal',
                 amount: metadata.amount,
                 paymentMethod: metadata.method || 'Bank / Wire Transfer',
                 referenceId: metadata.referenceId || metadata.transactionId || 'WD-N/A',
                 transactionId: metadata.transactionId || 'WD-N/A',
                 accountStatus: metadata.status === 'completed' ? 'Settled & Transferred' : 'Declined & Returned',
                 actionText: 'View Portfolio',
                 actionLink: 'https://update.aetheriss.online/dashboard',
                 isFailed: metadata.status === 'declined' || metadata.status === 'rejected'
               });
             } catch (mailErr) {
               console.error("[📧 Transaction Mail Engine] Error in withdrawal email:", mailErr);
             }
           } else if (type !== 'deposit' && type !== 'withdrawal') {
             const innerHtml = `
               <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">${title}</h2>
               <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hello ${userData.username || 'Investor'},</p>
               <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap;">${message}</p>
             `;
             const emailHtml = baseTemplate(innerHtml);
             await sendSystemEmail({
               to: userData.email,
               subject: title,
               html: emailHtml,
               type,
               userId
             });
           }
         }
      }
    }
  } catch (e) {
    console.error("Failed to send user notification:", e);
  }
}

export async function notifyAdmin(type: string, title: string, message: string) {
  const db = getDb();
  if (!db) return;
  try {
    const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
    if (adminsSnap.empty) return;
    
    const adminFCMTokens: string[] = [];
    const batch = db.batch();
    
    adminsSnap.forEach(doc => {
       const data = doc.data();
       const notifRef = db.collection('notifications').doc();
       batch.set(notifRef, {
          userId: doc.id,
          type: "admin_alert",
          title: `[ADMIN] ${title}`,
          message,
          status: 'unread',
          createdAt: FieldValue.serverTimestamp()
       });

       if (Array.isArray(data.fcmTokens) && data.push_enabled !== false) {
           adminFCMTokens.push(...data.fcmTokens);
       }
    });
    
    await batch.commit();

    if (adminFCMTokens.length > 0) {
       try {
         const messageObj = {
           notification: { title: `[ADMIN] ${title}`, body: message },
           tokens: adminFCMTokens,
         };
         await admin.messaging().sendEachForMulticast(messageObj);
       } catch (fcmError) {
         console.error("[📱 ADMIN FCM] Error:", fcmError);
       }
    }
  } catch (e) {
    console.error("Failed to notify admins:", e);
  }
}
