import { getBachsConfig, getFirestoreDb } from './bachs.config';
import { FieldValue } from 'firebase-admin/firestore';

const formatBachsErrorMessage = (session: any, rawBodyText: string, status: number): string => {
  const detailStr = typeof session?.detail === 'string' ? session.detail : '';
  const msgStr = typeof session?.message === 'string' ? session.message : '';
  const errCode = session?.error_code || session?.code || '';

  if (errCode === 'DEPOSIT_LIMIT_EXCEEDED' || detailStr.includes('Deposit limit exceeded') || msgStr.includes('Deposit limit exceeded')) {
    const maxAllowed = session?.details?.max_allowed_amount || '1000.00';
    return `Bachs payment gateway limit exceeded (Max allowed by Bachs API key: $${maxAllowed} USD). Please raise limits in your Bachs Merchant Portal or reduce transaction amount.`;
  }

  if (detailStr) return detailStr;
  if (msgStr) return msgStr;
  if (typeof session?.error === 'string') return session.error;
  if (rawBodyText && !rawBodyText.startsWith('{')) return rawBodyText;
  
  return `Bachs API error (${status})`;
};

export interface CreateCheckoutParams {
  userId: string;
  email?: string;
  amount: number | string;
  currency?: string;
  planName?: string;
  returnUrl?: string;
}

export const createBachsCheckoutSession = async ({
  userId,
  email,
  amount: rawAmount,
  currency = 'USD',
  planName = 'Account Deposit',
  returnUrl,
}: CreateCheckoutParams) => {
  const config = await getBachsConfig();
  const db = getFirestoreDb();

  const amountNum = Number(rawAmount);
  if (!amountNum || amountNum <= 0) {
    throw new Error('Enter a valid deposit amount.');
  }
  if (amountNum > 1000) {
    throw new Error('Bachs card/fiat gateway supports a maximum of $1,000.00. Deposits above $1,000 must be made via Crypto.');
  }
  // Decimal string ("100.00") as specified in section 0 & 2
  const amountStr = amountNum.toFixed(2);

  const envKey = process.env.BACHS_API_KEY || process.env.BACHS_PAYMENTS_API_KEY || '';
  const envProduct = process.env.BACHS_PRODUCT_ID || '';
  const envEnv = (process.env.BACHS_ENV || '').toLowerCase();

  const isLiveMode =
    config?.mode === 'live' ||
    envEnv === 'live' ||
    envEnv === 'production' ||
    envKey.startsWith('sk_live_') ||
    envKey.startsWith('live_') ||
    envKey.startsWith('pk_live_');

  const apiKey = (isLiveMode ? config?.live_secret_key : config?.test_secret_key) || envKey || '';
  const productId = (isLiveMode ? config?.live_product_id : config?.test_product_id) || envProduct || '';
  const isSandbox = !isLiveMode;

  // 1. Create the pending deposit record first in Firestore 'deposits'
  const depositRef = db.collection('deposits').doc();
  const depositId = depositRef.id;

  const targetBaseUrl = returnUrl || process.env.APP_URL || process.env.VITE_SITE_URL || 'https://aetheris.app';
  const cleanBaseUrl = targetBaseUrl.replace(/\/$/, '');
  
  const return_url = cleanBaseUrl.includes('?') 
    ? `${cleanBaseUrl}&deposit=${depositId}&payment_success=true` 
    : `${cleanBaseUrl}?deposit=${depositId}&payment_success=true`;
  const cancel_url = cleanBaseUrl.split('?')[0];

  await depositRef.set({
    uid: userId,
    userId,
    user_id: userId,
    amount: amountStr,
    currency,
    status: 'pending',
    checkoutId: null,
    createdAt: FieldValue.serverTimestamp(),
    completedAt: null,
    planName,
  });

  // Also maintain record in 'transactions' collection for compatibility
  const txRef = db.collection('transactions').doc(depositId);
  await txRef.set({
    id: depositId,
    userId,
    user_id: userId,
    amount: amountNum,
    currency,
    planName,
    type: 'deposit',
    status: 'pending',
    paymentMethod: 'Bachs Gateway',
    provider: 'bachs',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    depositId,
  });

  const apiBaseUrl = isSandbox ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io';

  if (isSandbox && (!apiKey || apiKey.includes('xxxxxxxxxxxx'))) {
    console.log('[BACHS SANDBOX DEMO] No Bachs API key configured, completing sandbox checkout redirect');
    return {
      checkoutUrl: return_url,
      depositId,
      checkoutSessionId: depositId,
      paymentLink: return_url,
      isExternal: false,
    };
  }

  if (!apiKey || apiKey.includes('xxxxxxxxxxxx')) {
    throw new Error('Bachs API Secret Key is missing or invalid in configuration.');
  }

  let checkoutUrl = '';
  let checkoutId = depositId;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  const requestBody = {
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        amount: amountStr,
      },
    ],
    customer: email ? { email } : undefined,
    return_url,
    cancel_url,
  };

  console.log('[BACHS CHECKOUT REQUEST]', {
    endpoint: `${apiBaseUrl}/v1/checkout-sessions`,
    body: requestBody,
    apiKeyLength: apiKey ? apiKey.length : 0,
    productId,
  });

  let responseStatus = 0;
  let rawBodyText = '';
  let session: any = null;

  try {
    const response = await fetch(`${apiBaseUrl}/v1/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });
    clearTimeout(timeoutId);

    responseStatus = response.status;
    rawBodyText = await response.text();

    console.log('[RAW BACHS CHECKOUT RESPONSE]', {
      status: responseStatus,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      rawBody: rawBodyText,
    });

    try {
      session = JSON.parse(rawBodyText);
    } catch (e) {
      session = { raw: rawBodyText };
    }

    if (response.ok && session && (session.checkout_url || session.url || session.id)) {
      checkoutUrl = session.checkout_url || session.url || '';
      checkoutId = session.id || session.checkout_id || depositId;

      await depositRef.update({ checkoutId });
      await txRef.update({ checkoutId, bachsSessionId: checkoutId });
    } else {
      const errMsg = formatBachsErrorMessage(session, rawBodyText, responseStatus);
      throw new Error(errMsg);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[BACHS CHECKOUT API ERROR]', {
      name: err.name,
      message: err.message,
      status: responseStatus,
      rawBody: rawBodyText,
    });

    if (isSandbox) {
      console.warn('[BACHS CHECKOUT SANDBOX FALLBACK] API call failed, falling back to sandbox redirect:', err.message);
      return {
        checkoutUrl: return_url,
        depositId,
        checkoutSessionId: depositId,
        paymentLink: return_url,
        isExternal: false,
      };
    }

    // Mark deposit as failed in Firestore since session creation failed
    await depositRef.update({ status: 'failed', errorMessage: err.message });
    await txRef.update({ status: 'failed', errorMessage: err.message });

    if (err.name === 'AbortError') {
      throw new Error('Bachs API timed out after 15 seconds while creating checkout session.');
    }
    throw new Error(err.message || 'Failed to communicate with Bachs payment gateway.');
  }

  if (!checkoutUrl) {
    throw new Error('Bachs API responded successfully but did not return a valid checkout_url.');
  }

  return {
    checkoutUrl,
    depositId,
    checkoutSessionId: checkoutId,
    paymentLink: checkoutUrl,
    isExternal: true,
  };
};

export interface CreateSubscriptionCheckoutParams {
  userId: string;
  email?: string;
  amount: number | string;
  currency?: string;
  planId: string;
  planName: string;
  totalAmount: number;
  intervalDays: number;
  durationDays: number;
  returnUrl?: string;
}

export const getBachsFlexSubscriptionProducts = () => ({
  1: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_1 },
  2: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_2 },
  3: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_3 },
  4: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_4 },
  5: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_5 },
  6: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_6 },
  7: { productId: process.env.BACHS_FLEX_SUBSCRIPTION_DAY_7 },
});

export const createBachsSubscriptionCheckoutSession = async ({
  userId,
  email,
  amount: rawAmount,
  currency = 'USD',
  planId,
  planName = 'STARTER FLEX',
  totalAmount,
  intervalDays,
  durationDays,
  returnUrl,
}: CreateSubscriptionCheckoutParams) => {
  const config = await getBachsConfig();
  const db = getFirestoreDb();

  const amountNum = Number(rawAmount);
  if (!amountNum || amountNum <= 0) {
    throw new Error('Enter a valid recurring interval amount.');
  }
  if (amountNum > 1000) {
    throw new Error('Bachs recurring subscription gateway supports up to $1,000.00 per interval max. Recurring plans above $1,000 must use Account Balance / Crypto.');
  }

  const envKey = process.env.BACHS_API_KEY || process.env.BACHS_PAYMENTS_API_KEY || '';
  const envEnv = (process.env.BACHS_ENV || '').toLowerCase();

  const isLiveMode =
    config?.mode === 'live' ||
    envEnv === 'live' ||
    envEnv === 'production' ||
    envKey.startsWith('sk_live_') ||
    envKey.startsWith('live_') ||
    envKey.startsWith('pk_live_');

  const apiKey = (isLiveMode ? config?.live_secret_key : config?.test_secret_key) || envKey || '';
  const isSandbox = !isLiveMode;

  // Read Flex recurring interval (1 to 7 days)
  const normalizedInterval = Math.max(1, Math.min(7, Math.round(Number(intervalDays || 3))));

  // Map to corresponding Bachs subscription product configuration
  const BACHS_FLEX_SUBSCRIPTION_PRODUCTS: Record<number, { productId?: string }> = getBachsFlexSubscriptionProducts();
  let flexProductId =
    BACHS_FLEX_SUBSCRIPTION_PRODUCTS[normalizedInterval]?.productId ||
    process.env[`BACHS_FLEX_SUBSCRIPTION_DAY_${normalizedInterval}`] ||
    '';

  // Read Firestore payment_settings/bachs if configured
  if (!flexProductId) {
    try {
      const docRef = await db.collection('payment_settings').doc('bachs').get();
      if (docRef.exists) {
        const docData = docRef.data() || {};
        flexProductId = docData[`flex_subscription_day_${normalizedInterval}`] || '';
      }
    } catch (err) {
      console.warn(`[BACHS CONFIG] Error reading flex_subscription_day_${normalizedInterval}:`, err);
    }
  }

  // Ensure BACHS_PRODUCT_ID is NOT used for Flex subscriptions.
  if (!flexProductId && !isSandbox && (!apiKey || apiKey.includes('xxxxxxxxxxxx'))) {
    throw new Error(
      `No Bachs subscription Product ID configured for a ${normalizedInterval}-day Flex interval. Please configure BACHS_FLEX_SUBSCRIPTION_DAY_${normalizedInterval}.`
    );
  }

  const productId = flexProductId || `prod_flex_day_${normalizedInterval}`;

  // Synchronize recurring amount, interval, duration, and plan total
  const validTotalAmount = Number(totalAmount) || 300;
  const validDurationDays = Number(durationDays) || 15;
  const computedIntervals = Math.max(1, Math.floor(validDurationDays / normalizedInterval));
  const amountPerIntervalNum = validTotalAmount / computedIntervals;
  const amountStr = amountPerIntervalNum.toFixed(2);

  const subCheckoutRef = db.collection('subscription_checkouts').doc();
  const checkoutSessionId = subCheckoutRef.id;

  const targetBaseUrl = returnUrl || process.env.APP_URL || process.env.VITE_SITE_URL || 'https://aetheris.app';
  const cleanBaseUrl = targetBaseUrl.replace(/\/$/, '');

  const return_url = cleanBaseUrl.includes('?') 
    ? `${cleanBaseUrl}&sub_checkout=${checkoutSessionId}&payment_success=true` 
    : `${cleanBaseUrl}?sub_checkout=${checkoutSessionId}&payment_success=true`;
  const cancel_url = cleanBaseUrl.split('?')[0];

  await subCheckoutRef.set({
    id: checkoutSessionId,
    uid: userId,
    userId,
    user_id: userId,
    email: email || '',
    amount: amountStr,
    amountPerInterval: amountPerIntervalNum,
    totalAmount: validTotalAmount,
    intervalDays: normalizedInterval,
    durationDays: validDurationDays,
    planId,
    planName,
    currency,
    status: 'pending',
    checkoutId: checkoutSessionId,
    type: 'flex_subscription',
    productId,
    createdAt: FieldValue.serverTimestamp(),
  });

  const apiBaseUrl = isSandbox ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io';

  if (isSandbox && (!apiKey || apiKey.includes('xxxxxxxxxxxx'))) {
    console.log('[BACHS SUBSCRIPTION SANDBOX DEMO] No Bachs API key configured, completing sandbox checkout redirect');
    return {
      checkoutUrl: return_url,
      checkoutSessionId,
      paymentLink: return_url,
      isExternal: false,
    };
  }

  if (!apiKey || apiKey.includes('xxxxxxxxxxxx')) {
    throw new Error('Bachs API Secret Key is missing or invalid in configuration.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const requestBody = {
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        amount: amountStr,
      },
    ],
    customer: email ? { email } : undefined,
    return_url,
    cancel_url,
    metadata: {
      uid: userId,
      type: 'flex_subscription',
      planId,
      planName,
      totalAmount: String(validTotalAmount),
      intervalDays: String(normalizedInterval),
      durationDays: String(validDurationDays),
      amountPerInterval: amountStr,
      productId,
    },
  };

  let responseStatus = 0;
  let rawBodyText = '';
  let session: any = null;

  try {
    const response = await fetch(`${apiBaseUrl}/v1/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });
    clearTimeout(timeoutId);

    responseStatus = response.status;
    rawBodyText = await response.text();

    try {
      session = JSON.parse(rawBodyText);
    } catch {
      session = { raw: rawBodyText };
    }

    if (response.ok && session && (session.checkout_url || session.url || session.id)) {
      const checkoutUrl = session.checkout_url || session.url || '';
      const finalCheckoutId = session.id || session.checkout_id || checkoutSessionId;

      await subCheckoutRef.update({ checkoutId: finalCheckoutId });

      return {
        checkoutUrl,
        checkoutSessionId: finalCheckoutId,
        paymentLink: checkoutUrl,
        isExternal: true,
      };
    } else {
      const errMsg = formatBachsErrorMessage(session, rawBodyText, responseStatus);
      throw new Error(errMsg);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (isSandbox) {
      console.warn('[BACHS SUBSCRIPTION SANDBOX FALLBACK] API call failed, falling back to sandbox redirect:', err.message);
      return {
        checkoutUrl: return_url,
        checkoutSessionId,
        paymentLink: return_url,
        isExternal: false,
      };
    }
    await subCheckoutRef.update({ status: 'failed', errorMessage: err.message });
    throw new Error(err.message || 'Failed to initialize Bachs subscription checkout.');
  }
};

export const verifyBachsProduct = async (overrideProductId?: string) => {
  const config = await getBachsConfig();
  const envKey = process.env.BACHS_API_KEY || process.env.BACHS_PAYMENTS_API_KEY || '';
  const envProduct = process.env.BACHS_PRODUCT_ID || '';
  const envEnv = (process.env.BACHS_ENV || '').toLowerCase();

  const isLiveMode =
    config?.mode === 'live' ||
    envEnv === 'live' ||
    envEnv === 'production' ||
    envKey.startsWith('sk_live_') ||
    envKey.startsWith('live_') ||
    envKey.startsWith('pk_live_');

  const apiKey = (isLiveMode ? config?.live_secret_key : config?.test_secret_key) || envKey || '';
  const productId = overrideProductId || (isLiveMode ? config?.live_product_id : config?.test_product_id) || envProduct || '';
  const isSandbox = !isLiveMode;
  const apiBaseUrl = isSandbox ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io';

  if (!apiKey) {
    throw new Error('No Bachs API Key configured.');
  }
  if (!productId) {
    throw new Error('No Bachs Product ID configured.');
  }

  const response = await fetch(`${apiBaseUrl}/v1/products/${productId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const rawText = await response.text();
  console.log('[RAW BACHS GET PRODUCT RESPONSE]', {
    status: response.status,
    productId,
    rawText,
  });

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  return {
    status: response.status,
    productId,
    apiBaseUrl,
    product: data,
  };
};

export const getBachsPaymentStatus = async (checkoutSessionId: string) => {
  const db = getFirestoreDb();
  
  // Check subscription_checkouts first
  const subSnap = await db.collection('subscription_checkouts').doc(checkoutSessionId).get();
  if (subSnap.exists) {
    const data = subSnap.data()!;
    return {
      status: data.status || 'pending',
      amount: data.amountPerInterval || data.amount,
      userId: data.uid || data.userId,
      isSubscription: true,
    };
  }

  // Check deposits collection
  const depositSnap = await db.collection('deposits').where('checkoutId', '==', checkoutSessionId).limit(1).get();
  if (!depositSnap.empty) {
    const data = depositSnap.docs[0].data();
    return {
      status: data.status || 'pending',
      amount: data.amount,
      userId: data.uid || data.userId,
      isSubscription: false,
    };
  }

  // Fallback check transactions collection
  const txDoc = await db.collection('transactions').doc(checkoutSessionId).get();
  if (txDoc.exists) {
    const data = txDoc.data();
    return {
      status: data?.status || 'pending',
      amount: data?.amount,
      userId: data?.userId || data?.user_id,
      isSubscription: data?.type === 'flex_subscription',
    };
  }

  return { status: 'pending' };
};

export const confirmAndActivateFlexSubscription = async (
  checkoutSessionId: string,
  subscriptionId?: string,
  paymentAmount?: number
) => {
  const db = getFirestoreDb();

  // 1. Locate checkout data from subscription_checkouts
  let subCheckoutRef = db.collection('subscription_checkouts').doc(checkoutSessionId);
  let subSnap = await subCheckoutRef.get();
  let checkoutData: any = null;

  if (subSnap.exists) {
    checkoutData = subSnap.data();
  } else {
    const qSnap = await db.collection('subscription_checkouts').where('checkoutId', '==', checkoutSessionId).limit(1).get();
    if (!qSnap.empty) {
      subSnap = qSnap.docs[0].ref as any;
      checkoutData = qSnap.docs[0].data();
    }
  }

  if (!checkoutData) {
    const depSnap = await db.collection('deposits').where('checkoutId', '==', checkoutSessionId).limit(1).get();
    if (!depSnap.empty) {
      checkoutData = depSnap.docs[0].data();
    }
  }

  if (!checkoutData) {
    console.warn('[FLEX ACTIVATION] No subscription checkout record found for sessionId:', checkoutSessionId);
    return { status: 'not_found' };
  }

  // Idempotency check: check if investment already created for this checkout or subscription
  const existingInvSnap = await db.collection('investments')
    .where('checkout_id', '==', checkoutSessionId)
    .limit(1)
    .get();

  if (!existingInvSnap.empty) {
    const invData = existingInvSnap.docs[0].data();
    return { status: 'completed', investmentId: existingInvSnap.docs[0].id, investment: invData };
  }

  if (subscriptionId) {
    const subInvSnap = await db.collection('investments')
      .where('subscription_id', '==', subscriptionId)
      .limit(1)
      .get();
    if (!subInvSnap.empty) {
      const invData = subInvSnap.docs[0].data();
      return { status: 'completed', investmentId: subInvSnap.docs[0].id, investment: invData };
    }
  }

  // Not yet created -> Create the Flex Trade NOW!
  const userId = checkoutData.uid || checkoutData.userId || checkoutData.user_id;
  const planName = checkoutData.planName || 'STARTER FLEX';
  const planId = checkoutData.planId || 'starter';
  const totalAmount = Number(checkoutData.totalAmount || 300);
  const intervalDays = Number(checkoutData.intervalDays || 3);
  const durationDays = Number(checkoutData.durationDays || 15);
  const amountPerInterval = Number(paymentAmount || checkoutData.amountPerInterval || checkoutData.amount || 150);
  const totalCycles = Math.max(1, Math.floor(durationDays / intervalDays));

  const now = new Date();
  const activatedAt = now.toISOString();
  const cycleEndTime = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000)).toISOString();
  const totalEndTime = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000)).toISOString();

  const invRef = db.collection('investments').doc();
  const invId = invRef.id;

  const returnPct = Number(checkoutData.returnPct || 100);
  const cycleProfit = amountPerInterval * (returnPct / 100);
  const cycleTargetPayout = amountPerInterval + cycleProfit;
  const totalCompletionValue = cycleTargetPayout * totalCycles;
  const expectedTotalProfit = totalCompletionValue - totalAmount;

  await db.runTransaction(async (t) => {
    t.set(invRef, {
      user_id: userId,
      plan: planName,
      plan_name: planName,
      plan_id: planId,
      model: 'flex',
      type: 'flex',
      isFixed: false,
      isPro: false,
      status: 'active',

      principal: totalAmount,
      total_amount: totalAmount,
      amount: totalAmount,
      amount_per_interval: amountPerInterval,
      recurring_principal: amountPerInterval,
      return_pct: returnPct,
      expectedReturn: returnPct,
      completion_value: totalCompletionValue,
      completionValue: totalCompletionValue,
      expected_payout: totalCompletionValue,
      expected_total_profit: expectedTotalProfit,

      totalAllocation: totalAmount,
      total_duration_days: durationDays,
      duration_days: durationDays,
      recurring_interval_days: intervalDays,
      interval_days: intervalDays,

      totalCycles,
      current_cycle_number: 1,
      currentCycleNumber: 1,
      deposited: amountPerInterval,
      total_profit_earned: 0,
      daily_profit: 0,

      created_at: FieldValue.serverTimestamp(),
      activated_at: activatedAt,
      start_date: activatedAt,
      end_date: totalEndTime,

      cycle_start_time: activatedAt,
      cycle_end_time: cycleEndTime,
      next_allocation_date: cycleEndTime,
      last_deposit_date: activatedAt,

      checkout_id: checkoutSessionId,
      subscription_id: subscriptionId || checkoutSessionId,
    });

    const firstIntervalRef = invRef.collection('intervals').doc();
    t.set(firstIntervalRef, {
      sequence: 1,
      amount: amountPerInterval,
      status: 'paid',
      paidAt: activatedAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection('transactions').doc();
    t.set(txRef, {
      user_id: userId,
      type: "FLEX_CYCLE_STARTED",
      status: "SUCCESS",
      amount: amountPerInterval,
      principal: amountPerInterval,
      profit: cycleProfit,
      payout: cycleTargetPayout,
      cycle: 1,
      total_cycles: totalCycles,
      plan: planName,
      model: 'flex',
      reference: invId,
      subscription_id: subscriptionId || checkoutSessionId,
      message: `Flex Cycle 1 Started via Bachs Subscription. Principal: $${amountPerInterval.toFixed(2)} | Target payout: $${cycleTargetPayout.toFixed(2)} | Interval: ${intervalDays} days`,
      timestamp: FieldValue.serverTimestamp(),
    });

    if (subSnap && subSnap.exists) {
      t.update(subSnap.ref, {
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        investmentId: invId,
        subscriptionId: subscriptionId || checkoutSessionId,
      });
    }
  });

  try {
    const { notifyUser, notifyAdmin } = await import('../services/notifications');
    notifyUser(
      userId,
      'plan_activated',
      'Aetheris Flex Activated 🚀',
      `Your ${planName} ($${amountPerInterval.toFixed(2)} per ${intervalDays}-day interval) subscription has been confirmed and is now generating yield!`
    );
    notifyAdmin(
      'deposit',
      'Aetheris Flex Subscription Confirmed',
      `User ${userId} activated ${planName} via Bachs subscription.`
    );
  } catch (err) {
    console.error('Notification error:', err);
  }

  return { status: 'completed', investmentId: invId };
};

export const advanceFlexSubscriptionCycle = async (
  subscriptionId: string,
  paymentAmount?: number
) => {
  const db = getFirestoreDb();

  const snap = await db.collection('investments')
    .where('subscription_id', '==', subscriptionId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn('[BACHS RENEWAL] No active Flex trade found for subscriptionId:', subscriptionId);
    return null;
  }

  const invDoc = snap.docs[0];
  const invData = invDoc.data();
  const userId = invData.user_id;

  const currentCycle = Number(invData.current_cycle_number || invData.currentCycleNumber || 1);
  const nextCycle = currentCycle + 1;
  const intervalDays = Number(invData.interval_days || invData.recurring_interval_days || 3);
  const amountPerInterval = Number(paymentAmount || invData.amount_per_interval || invData.recurring_principal || 150);
  const totalCycles = Number(invData.totalCycles || 5);

  const now = new Date();
  const activatedAt = now.toISOString();
  const cycleEndTime = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000)).toISOString();

  const newDeposited = (Number(invData.deposited) || 0) + amountPerInterval;

  await db.runTransaction(async (t) => {
    t.update(invDoc.ref, {
      current_cycle_number: nextCycle,
      currentCycleNumber: nextCycle,
      deposited: newDeposited,
      cycle_start_time: activatedAt,
      cycle_end_time: cycleEndTime,
      next_allocation_date: cycleEndTime,
      last_deposit_date: activatedAt,
      updated_at: FieldValue.serverTimestamp(),
    });

    const intervalRef = invDoc.ref.collection('intervals').doc();
    t.set(intervalRef, {
      sequence: nextCycle,
      amount: amountPerInterval,
      status: 'paid',
      paidAt: activatedAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection('transactions').doc();
    t.set(txRef, {
      user_id: userId,
      type: "FLEX_CYCLE_RENEWED",
      status: "SUCCESS",
      amount: amountPerInterval,
      cycle: nextCycle,
      total_cycles: totalCycles,
      plan: invData.plan || invData.plan_name,
      model: 'flex',
      reference: invDoc.id,
      subscription_id: subscriptionId,
      message: `Flex Cycle ${nextCycle} Renewed via Subscription. $${amountPerInterval.toFixed(2)} credited for next ${intervalDays}-day interval.`,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  try {
    const { notifyUser } = await import('../services/notifications');
    notifyUser(
      userId,
      'interval',
      'Flex Renewal Confirmed',
      `Cycle ${nextCycle} for ${invData.plan} was renewed successfully ($${amountPerInterval.toFixed(2)}).`
    );
  } catch (err) {
    console.error('Notification error:', err);
  }

  return invDoc.id;
};

export const cancelFlexSubscription = async (subscriptionId: string) => {
  const db = getFirestoreDb();

  const snap = await db.collection('investments')
    .where('subscription_id', '==', subscriptionId)
    .limit(1)
    .get();

  if (snap.empty) {
    return false;
  }

  const invDoc = snap.docs[0];
  const invData = invDoc.data();

  await invDoc.ref.update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  });

  const txRef = db.collection('transactions').doc();
  await txRef.set({
    user_id: invData.user_id,
    type: "FLEX_SUBSCRIPTION_CANCELLED",
    status: "CANCELLED",
    amount: invData.amount_per_interval || 0,
    plan: invData.plan || invData.plan_name,
    model: 'flex',
    reference: invDoc.id,
    subscription_id: subscriptionId,
    message: `Flex Subscription for ${invData.plan} was terminated/cancelled.`,
    timestamp: FieldValue.serverTimestamp(),
  });

  try {
    const { notifyUser } = await import('../services/notifications');
    notifyUser(
      invData.user_id,
      'system_alert',
      'Flex Subscription Cancelled',
      `Your subscription for ${invData.plan} has been cancelled.`
    );
  } catch (err) {
    console.error('Notification error:', err);
  }

  return true;
};

