import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function syncPayments() {
  console.log("Starting sync for failed payments as well...");
  const failedSnap = await db.collection('payments').where('status', '==', 'failed').get();
  console.log(`Found ${failedSnap.docs.length} failed payments.`);

  for (const doc of failedSnap.docs) {
    const payment = doc.data();
    const paymentId = doc.id;
    const { user_id, amount } = payment;

    if (!user_id || !amount) {
        continue;
    }

    const txQ = await db.collection('transactions')
      .where('reference', '==', paymentId)
      .where('type', '==', 'deposit')
      .get();
      
    if (txQ.empty) {
      console.log(`Missing failed transaction for Payment: ${paymentId}. Syncing now...`);
      
      const txRef = db.collection('transactions').doc();
      await txRef.set({
             user_id: user_id,
             type: "deposit",
             amount: Number(amount),
             status: "failed",
             reference: paymentId,
             timestamp: payment.failed_at || payment.created_at || FieldValue.serverTimestamp()
      });
      console.log(`Successfully synced failed payment log ${paymentId}`);
    }
  }
  
  console.log("Failed Sync complete!");
  process.exit(0);
}

syncPayments().catch(console.error);
