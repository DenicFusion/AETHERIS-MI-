import { Router } from 'express';
import express from 'express';
import { handleBachsWebhook } from './bachs.webhook';
import {
  createBachsCheckoutSession,
  createBachsSubscriptionCheckoutSession,
  getBachsPaymentStatus,
  confirmAndActivateFlexSubscription,
  verifyBachsProduct
} from './bachs.service';
import { getBachsConfig, getFirestoreDb } from './bachs.config';

const router = Router();
const jsonParser = express.json();

// Endpoint to directly verify Bachs product settings from Bachs API
router.get('/api/payments/bachs/verify-product', async (req, res) => {
  try {
    const productIdOverride = req.query.productId as string | undefined;
    const result = await verifyBachsProduct(productIdOverride);
    res.json(result);
  } catch (error: any) {
    console.error('[BACHS VERIFY PRODUCT ERROR]', error);
    res.status(500).json({ error: error.message || 'Failed to verify Bachs product' });
  }
});

router.get('/api/payments/bachs/debug-config', async (req, res) => {
  try {
    const config = await getBachsConfig();
    res.json({
      mode: config?.mode,
      has_test_secret_key: !!config?.test_secret_key,
      test_secret_key_len: config?.test_secret_key?.length || 0,
      test_secret_key_prefix: config?.test_secret_key ? config.test_secret_key.substring(0, 8) + '...' : '',
      has_live_secret_key: !!config?.live_secret_key,
      live_secret_key_len: config?.live_secret_key?.length || 0,
      test_product_id: config?.test_product_id,
      live_product_id: config?.live_product_id,
      env_BACHS_API_KEY: process.env.BACHS_API_KEY ? process.env.BACHS_API_KEY.substring(0, 8) + '...' : 'NONE',
      env_BACHS_PRODUCT_ID: process.env.BACHS_PRODUCT_ID || 'NONE',
      env_BACHS_ENV: process.env.BACHS_ENV || 'NONE',
      flex_subscription_products: {
        1: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_1 || 'NONE',
        2: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_2 || 'NONE',
        3: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_3 || 'NONE',
        4: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_4 || 'NONE',
        5: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_5 || 'NONE',
        6: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_6 || 'NONE',
        7: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_7 || 'NONE',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for creating a Bachs deposit checkout session
router.post('/api/payments/bachs/create', jsonParser, async (req, res) => {
  try {
    const { userId, email, amount, currency, planName, returnUrl: clientReturnUrl } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing required deposit parameters' });
    }

    const reqOrigin = req.get('referer') || req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const returnUrl = clientReturnUrl || reqOrigin;

    const session = await createBachsCheckoutSession({
      userId,
      email,
      amount,
      currency,
      planName,
      returnUrl,
    });

    res.json({
      checkoutUrl: session.checkoutUrl,
      sessionUrl: session.paymentLink,
      checkoutSessionId: session.checkoutSessionId,
      depositId: session.depositId,
      isExternal: session.isExternal,
    });
  } catch (error: any) {
    console.error('[BACHS CHECKOUT CREATION ERROR]', error);
    res.status(500).json({ error: error.message || 'Failed to create Bachs payment session' });
  }
});

// Endpoint for creating a Bachs Flex recurring subscription checkout session
router.post('/api/payments/bachs/create-subscription', jsonParser, async (req, res) => {
  try {
    const { userId, email, amount, currency, planId, planName, totalAmount, intervalDays, durationDays, returnUrl: clientReturnUrl } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing required subscription parameters' });
    }

    const reqOrigin = req.get('referer') || req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const returnUrl = clientReturnUrl || reqOrigin;

    const session = await createBachsSubscriptionCheckoutSession({
      userId,
      email,
      amount, // $150 per interval
      currency,
      planId: planId || 'starter',
      planName: planName || 'STARTER FLEX',
      totalAmount: Number(totalAmount || 300),
      intervalDays: Number(intervalDays || 3),
      durationDays: Number(durationDays || 15),
      returnUrl,
    });

    res.json({
      checkoutUrl: session.checkoutUrl,
      sessionUrl: session.paymentLink,
      checkoutSessionId: session.checkoutSessionId,
      isExternal: session.isExternal,
    });
  } catch (error: any) {
    console.error('[BACHS SUBSCRIPTION CHECKOUT ERROR]', error);
    res.status(500).json({ error: error.message || 'Failed to create Bachs subscription session' });
  }
});

// Endpoint to check Bachs config status
router.get('/api/payments/bachs/config', async (req, res) => {
  try {
    const config = await getBachsConfig();
    const db = getFirestoreDb();
    const globalConfigRef = await db.collection("config").doc("global").get();
    const globalConfig = globalConfigRef.data();
    const isFiatEnabled = globalConfig?.paymentGateways?.fiat !== false;
    res.json({
      enabled: isFiatEnabled && !!config,
      provider: 'bachs',
      mode: config?.mode || 'test',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve Bachs config' });
  }
});

// Endpoint to sync/get checkout status
router.post('/api/payments/bachs/sync', jsonParser, async (req, res) => {
  try {
    const { checkoutSessionId } = req.body;
    if (!checkoutSessionId) {
      return res.status(400).json({ error: 'Missing checkoutSessionId' });
    }

    const db = getFirestoreDb();
    const subSnap = await db.collection('subscription_checkouts').doc(checkoutSessionId).get();
    if (subSnap.exists) {
      // Check if already completed or try activating
      const subData = subSnap.data()!;
      if (subData.status === 'completed' && subData.investmentId) {
        return res.json({ status: 'completed', investmentId: subData.investmentId });
      }
      const activeRes = await confirmAndActivateFlexSubscription(checkoutSessionId);
      return res.json(activeRes);
    }

    const statusInfo = await getBachsPaymentStatus(checkoutSessionId);
    return res.json({ status: statusInfo.status, amount: statusInfo.amount });
  } catch (error: any) {
    console.error('[BACHS PAYMENT SYNC ERROR]', error);
    res.status(500).json({ error: error.message || 'Payment sync failed' });
  }
});

// Endpoint specifically to sync/confirm Flex subscription checkout
router.post('/api/payments/bachs/sync-subscription', jsonParser, async (req, res) => {
  try {
    const { checkoutSessionId, subscriptionId } = req.body;
    if (!checkoutSessionId) {
      return res.status(400).json({ error: 'Missing checkoutSessionId' });
    }

    const activeRes = await confirmAndActivateFlexSubscription(checkoutSessionId, subscriptionId);
    return res.json(activeRes);
  } catch (error: any) {
    console.error('[BACHS SUBSCRIPTION SYNC ERROR]', error);
    res.status(500).json({ error: error.message || 'Subscription sync failed' });
  }
});

// Endpoint to cancel Bachs payment / subscription checkout
router.post('/api/payments/bachs/cancel', jsonParser, async (req, res) => {
  const db = getFirestoreDb();
  try {
    const { checkoutSessionId } = req.body;
    if (!checkoutSessionId) {
      return res.status(400).json({ error: 'Missing checkoutSessionId' });
    }

    const subSnap = await db.collection('subscription_checkouts').doc(checkoutSessionId).get();
    if (subSnap.exists) {
      await subSnap.ref.update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
    }

    const snap = await db.collection('deposits').where('checkoutId', '==', checkoutSessionId).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
    }

    const txRef = db.collection('transactions').doc(checkoutSessionId);
    const txSnap = await txRef.get();
    if (txSnap.exists) {
      await txRef.update({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return res.json({ status: 'cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Payment cancel failed' });
  }
});

// Webhook listener - raw body middleware for HMAC verification
router.post('/api/payments/bachs/webhook', express.raw({ type: 'application/json' }), handleBachsWebhook);

export default router;
