import { Request, Response } from 'express';
import { getBachsConfig, getFirestoreDb } from './bachs.config';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { notifyUser, notifyAdmin } from '../services/notifications';
import {
  confirmAndActivateFlexSubscription,
  advanceFlexSubscriptionCycle,
  cancelFlexSubscription
} from './bachs.service';

const TOLERANCE_SECONDS = 300;

function verifySignature(rawBody: string, secret: string, timestampHeader?: string, signatureHeader?: string): boolean {
  if (!timestampHeader || !signatureHeader) return false;
  const timestamp = parseInt(timestampHeader, 10);
  if (Number.isNaN(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export const handleBachsWebhook = async (req: Request, res: Response) => {
  try {
    const config = await getBachsConfig();
    const db = getFirestoreDb();

    const rawBody = (req as any).rawBody
      ? (req as any).rawBody.toString('utf8')
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const webhookSecret = (config?.mode === 'live' ? config?.live_webhook_secret : config?.test_webhook_secret) || process.env.BACHS_WEBHOOK_SECRET;

    const signatureHeader = req.headers['x-bachs-signature'] as string;
    const timestampHeader = req.headers['x-bachs-timestamp'] as string;

    if (webhookSecret && signatureHeader) {
      const isValid = verifySignature(rawBody, webhookSecret, timestampHeader, signatureHeader);
      if (!isValid) {
        console.warn('[BACHS WEBHOOK] Invalid HMAC signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(rawBody || '{}');
    const eventType = event.type || event.event || 'collection.succeeded';
    const metadata = event.data?.metadata || event.metadata || {};
    const subscription_id = event.data?.subscription_id || event.subscription_id || event.data?.subscription || event.subscription;

    // Handle Subscription Cancellations
    if (['customer.subscription.deleted', 'subscription.cancelled', 'subscription.deleted'].includes(eventType)) {
      const subId = subscription_id || event.data?.id || event.id;
      if (subId) {
        await cancelFlexSubscription(subId);
      }
      return res.status(200).json({ received: true });
    }

    // Handle Recurring Subscription Renewal Payments (invoice.paid)
    if (eventType === 'invoice.paid' || eventType === 'subscription.renewed') {
      const subId = subscription_id || event.data?.subscription_id || event.data?.id;
      const amount = Number(event.data?.amount_paid || event.data?.amount || event.amount || 0) / (event.data?.amount_paid > 1000 ? 100 : 1);
      if (subId) {
        await advanceFlexSubscriptionCycle(subId, amount);
      }
      return res.status(200).json({ received: true });
    }

    if (eventType === 'collection.succeeded' || eventType === 'payment.succeeded' || eventType === 'charge.completed' || eventType === 'customer.subscription.created') {
      const checkout_id = event.data?.checkout_id || event.data?.session_id || event.checkout_id || event.sessionId || event.id;
      const eventAmount = Number(event.data?.amount || event.amount || 0);

      if (!checkout_id) {
        console.warn('[BACHS WEBHOOK] Received succeeded event without checkout_id');
        return res.status(200).json({ received: true });
      }

      // Check if this is a Flex subscription checkout
      const isFlexSub = metadata.type === 'flex_subscription' || eventType === 'customer.subscription.created';
      const subCheckoutSnap = await db.collection('subscription_checkouts').doc(checkout_id).get();

      if (isFlexSub || subCheckoutSnap.exists) {
        await confirmAndActivateFlexSubscription(checkout_id, subscription_id, eventAmount);
        return res.status(200).json({ received: true });
      }

      // Normal Deposit Handler
      const snap = await db
        .collection('deposits')
        .where('checkoutId', '==', checkout_id)
        .limit(1)
        .get();

      let depositRef = !snap.empty ? snap.docs[0].ref : null;

      if (!depositRef) {
        const txDoc = await db.collection('transactions').doc(checkout_id).get();
        if (txDoc.exists) {
          depositRef = txDoc.ref;
        }
      }

      if (!depositRef) {
        console.error('[BACHS WEBHOOK] No matching deposit for checkout_id:', checkout_id);
        return res.status(200).json({ received: true });
      }

      // Atomic deposit completion
      await db.runTransaction(async (tx) => {
        const depositDoc = await tx.get(depositRef!);
        if (!depositDoc.exists) return;

        const depData = depositDoc.data();
        if (depData?.status === 'completed') return;

        const uid = depData?.uid || depData?.userId || depData?.user_id;
        const amountNum = Number(eventAmount || depData?.amount || 0);

        tx.update(depositRef!, {
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: new Date().toISOString(),
        });

        const txRef = db.collection('transactions').doc(checkout_id);
        const txSnap = await tx.get(txRef);
        if (txSnap.exists) {
          tx.update(txRef, {
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: new Date().toISOString(),
          });
        }

        if (uid) {
          const userRef = db.collection('users').doc(uid);
          tx.update(userRef, {
            balance: FieldValue.increment(amountNum),
          });

          notifyUser(
            uid,
            'deposit',
            'Deposit Confirmed',
            `Your deposit of $${amountNum.toFixed(2)} was verified by Bachs and credited to your wallet.`
          );
          notifyAdmin(
            'deposit',
            'Bachs Deposit Cleared',
            `User ${uid} deposited $${amountNum.toFixed(2)} via Bachs webhook.`
          );
        }
      });
    }

    if (['collection.failed', 'collection.abandoned', 'payment.failed', 'charge.failed'].includes(eventType)) {
      const checkout_id = event.data?.checkout_id || event.data?.session_id || event.checkout_id || event.sessionId;
      if (checkout_id) {
        const subSnap = await db.collection('subscription_checkouts').doc(checkout_id).get();
        if (subSnap.exists) {
          await subSnap.ref.update({
            status: 'failed',
            updatedAt: new Date().toISOString(),
          });
        }

        const snap = await db
          .collection('deposits')
          .where('checkoutId', '==', checkout_id)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            status: 'failed',
            updatedAt: new Date().toISOString(),
          });
        }

        const txRef = db.collection('transactions').doc(checkout_id);
        const txSnap = await txRef.get();
        if (txSnap.exists) {
          await txRef.update({
            status: 'failed',
            failedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[BACHS WEBHOOK ERROR]', error);
    return res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
};
