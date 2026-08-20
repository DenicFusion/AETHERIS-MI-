import { getDb } from "../services/dbService";

export interface BachsConfig {
  provider: "bachs";
  mode: "test" | "live" | "sandbox";
  test_secret_key: string;
  live_secret_key: string;
  test_webhook_secret: string;
  live_webhook_secret: string;
  test_product_id: string;
  live_product_id: string;
  test_merchant_id: string;
  live_merchant_id: string;
  test_publishable_key: string;
  live_publishable_key: string;
  methods?: {
    bacs_direct_debit?: boolean;
    card?: boolean;
    bank_transfer?: boolean;
    faster_payments?: boolean;
    sepa?: boolean;
    wire_transfer?: boolean;
  };
}

export const getFirestoreDb = () => {
  return getDb();
};

export const getBachsConfig = async (): Promise<BachsConfig | null> => {
  const db = getFirestoreDb();
  let docData: Partial<BachsConfig> = {};

  try {
    const docRef = await db.collection("payment_settings").doc("bachs").get();
    if (docRef.exists) {
      docData = (docRef.data() as BachsConfig) || {};
    }
  } catch (err) {
    console.warn("[BACHS CONFIG] Could not read payment_settings/bachs from Firestore:", err);
  }

  const envKey = process.env.BACHS_API_KEY || process.env.BACHS_PAYMENTS_API_KEY || "";
  const envWebhook = process.env.BACHS_WEBHOOK_SECRET || process.env.BACHS_PAYMENTS_WEBHOOK_KEY || "";
  const envProduct = process.env.BACHS_PRODUCT_ID || "";
  const envEnv = (process.env.BACHS_ENV || "").toLowerCase();

  // Determine effective mode:
  // 1. If process.env.BACHS_ENV is "live" or "production", mode is "live".
  // 2. If API key is a live key (e.g. sk_live_...), mode is "live".
  // 3. Otherwise respect docData.mode or default to "test".
  let effectiveMode: "test" | "live" | "sandbox" = "test";

  if (envEnv === "live" || envEnv === "production") {
    effectiveMode = "live";
  } else if (envEnv === "sandbox" || envEnv === "test") {
    effectiveMode = "test";
  } else if (envKey.startsWith("sk_live_") || envKey.startsWith("live_") || envKey.startsWith("pk_live_")) {
    effectiveMode = "live";
  } else if (docData.mode) {
    effectiveMode = docData.mode;
  }

  const isLive = effectiveMode === "live";

  // Select secret keys & product IDs
  const live_secret_key = docData.live_secret_key || (isLive ? envKey : envKey);
  const test_secret_key = docData.test_secret_key || (!isLive ? envKey : envKey);

  const live_product_id = docData.live_product_id || (isLive ? envProduct : envProduct);
  const test_product_id = docData.test_product_id || (!isLive ? envProduct : envProduct);

  const live_webhook_secret = docData.live_webhook_secret || (isLive ? envWebhook : envWebhook);
  const test_webhook_secret = docData.test_webhook_secret || (!isLive ? envWebhook : envWebhook);

  const mergedConfig: BachsConfig = {
    provider: "bachs",
    mode: effectiveMode,
    test_secret_key: test_secret_key || envKey,
    live_secret_key: live_secret_key || envKey,
    test_webhook_secret: test_webhook_secret || envWebhook,
    live_webhook_secret: live_webhook_secret || envWebhook,
    test_product_id: test_product_id || envProduct,
    live_product_id: live_product_id || envProduct,
    test_merchant_id: docData.test_merchant_id || process.env.BACHS_MERCHANT_ID || "",
    live_merchant_id: docData.live_merchant_id || process.env.BACHS_MERCHANT_ID || "",
    test_publishable_key: docData.test_publishable_key || process.env.VITE_BACHS_PUBLISHABLE_KEY || "",
    live_publishable_key: docData.live_publishable_key || process.env.VITE_BACHS_PUBLISHABLE_KEY || "",
    methods: docData.methods || {
      bacs_direct_debit: true,
      card: true,
      bank_transfer: true,
      faster_payments: true,
      sepa: true,
      wire_transfer: true
    }
  };

  return mergedConfig;
};
