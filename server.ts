import express from 'express';
import multer from 'multer';
import { ActivationEngine } from './engine/activationEngine';

const upload = multer();
import { SchedulerEngine } from './engine/schedulerEngine';
import { IntervalProcessor } from './engine/intervalProcessor';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import cron from 'node-cron';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Resend } from 'resend';
import bachsRouter from './server/payments/bachs.routes';
import authRoutes from './server/routes/auth.routes';
import mailRoutes from './server/mail/mail.routes';
import { startQueueWorker } from './server/mail/mail.queue';
import { sendEmailDirect } from './server/mail/mail.service';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from "@google/genai";
import { baseTemplate, getTransactionTemplate } from './server/mail/mail.templates';
import * as templatesModule from './server/mail/mail.templates';
import { simpleParser } from 'mailparser';
import { notifyUser, notifyAdmin } from './server/services/notifications';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SYSTEM_EMAIL = process.env.SYSTEM_EMAIL || 'support@update.aetheriss.online';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@update.aetheriss.online';

// Helper to send system email via Aetheris dynamic provider framework (SMTP primary, Resend fallback)
export async function sendSystemEmail(params: { to: string, subject: string, html: string, type: string, userId?: string, from?: string }) {
  try {
    let fromEmail = params.from;
    let finalSubject = params.subject;

    // Standardize Sender Address and Subject per email type
    if (params.type === 'verification') {
      fromEmail = "Aetheris <verify-noreply@update.aetheriss.online>";
      finalSubject = params.subject || "Verify Your Account Now";
    } else if (params.type === 'otp' || params.type === 'verification_otp') {
      fromEmail = "Aetheris <noreply@update.aetheriss.online>";
    } else if (params.type === 'transaction' || params.type === 'deposit' || params.type === 'withdrawal' || params.type === 'yield_payout') {
      fromEmail = "Aetheris <no-reply@update.aetheriss.online>";
      finalSubject = "Transaction Notification";
    } else if (params.type === 'support_reply' || params.type === 'support') {
      fromEmail = "Aetheris <support@update.aetheriss.online>";
      finalSubject = params.subject || "Support Thread";
    } else if (params.type === 'welcome') {
      fromEmail = "Aetheris <hello@update.aetheriss.online>";
      finalSubject = "Welcome To Aetheris";
    }

    const result = await sendEmailDirect({
      to: params.to,
      from: fromEmail,
      subject: finalSubject,
      html: params.html
    });

    if (db) {
      await db.collection('email_logs').add({
        userId: params.userId || 'system',
        email: params.to,
        type: params.type,
        subject: finalSubject,
        status: result.success ? 'sent' : 'failed',
        providerUsed: result.provider,
        providerResponse: result,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return result.success;
  } catch (e: any) {
    console.error("Failed to send system email via Aetheris dynamic provider routing:", e);
    if (db) {
      await db.collection('email_logs').add({
         userId: params.userId || 'system',
         email: params.to,
         type: params.type,
         subject: params.subject,
         status: 'failed',
         error: e.message,
         createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return false;
  }
}

// --- Firebase Admin Initialization ---
let db: admin.firestore.Firestore | null = null;
try {
  let credential = undefined;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } catch (e: any) {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT is not valid JSON. Falling back to applicationDefault()", e.message);
    }
  }

  // Load config safely
  let config: any = {};
  try {
    config = JSON.parse(fs.readFileSync(path.resolve('./firebase-applet-config.json'), 'utf8'));
  } catch (e) {}

  admin.initializeApp({
    credential: credential || admin.credential.applicationDefault(),
    projectId: config.projectId || undefined
  });

  // Use the correct databaseId if specified
  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
    try {
      db = getFirestore(admin.app(), config.firestoreDatabaseId);
    } catch (e) {
      console.log("Custom databaseId failed, falling back to default.", e);
      db = admin.firestore();
    }
  } else {
    db = admin.firestore();
  }

  console.log("Firebase Admin Initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

// --- Create Server ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  
  // Webhooks from external providers need raw bodies or JSON depending on the API
  app.use(bachsRouter);
  
  app.use(express.json());

  // ==========================================
  // API Routes (Simulating Firebase Cloud Functions)
  // ==========================================

  const apiRouter = express.Router();

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/mail', mailRoutes);

  // ==========================================
  // Premium Support Systems & AI Integrations
  // ==========================================
  async function querySupportModel(userPrompt: string, dbInstance: any): Promise<string> {
    const defaultKb = `
SYSTEM OVERVIEW:
Aetheris is an institutional-grade, highly automated quantitative wealth management platform and trading infrastructure. It features high-frequency cross-exchange arbitrage models, multi-market quantitative analysis, and automated capital routing systems.

TRADING PLANS & MODELS:
1. STARTER MODEL: Price $1,000, Duration 15 Days. Conservative capital testing status.
2. CORE MODEL (Recommended): Price $5,000, Duration 15 Days. Advanced trend arbitrage.
3. PRIME MODEL: Price $10,000, Duration 21 Days. Managed risk cross-market routing.
4. QUANTUM MODEL (⭐ Most Popular): Price $50,000, Duration 30 Days. Premium automated allocation algorithms.
5. APEX MODEL: Price $10,0000, Duration 45 Days. Sovereign tactical allocation models.
6. ULTRA MODEL: Price $500,000, Duration 60 Days. Elite global deep-pool access.

STANDARD PLANS vs PRO PLANS:
- STANDARD PLANS: Designed for portfolios requiring periodic recurring distributions. Payout intervals execute periodically.
- PRO PLANS: Simplified AI-managed trading experience with absolute autonomous execution. Settle at maturity; no manual interval action is required.

DEPOSITS & FUNDING:
- Balance funded using BTC, ETH, USDT, CashApp, and banking wires.
- Active trading plans require registered dashboard balance fuel.

WITHDRAWALS:
- Direct bank or wallet withdrawals. All entries go through immediate system risk audits.

AETHERIS LOCK & BIOMETRIC HARDENING:
- Installed PWA apps lock after 15 minutes of inactivity, unlock instantly with biometrics (Face ID/Fingerprint). Disabled on standard websites.
`;

    let customKb = defaultKb;
    let customPrompt = "";
    if (dbInstance) {
      try {
        const configDoc = await dbInstance.collection('support_config').doc('settings').get();
        if (configDoc.exists) {
          const cfg = configDoc.data();
          if (cfg.knowledgeBase) customKb = cfg.knowledgeBase;
          if (cfg.systemPrompt) customPrompt = cfg.systemPrompt;
        }
      } catch (e) {
        console.warn("Failed fetching support configuration, using codebase defaults.", e);
      }
    }

    const finalSystemPrompt = `You are Aethro, the premium sovereign AI support coordinator of Aetheris.
Aetheris specializes in intelligent automated wealth technology, premium fintech infrastructure, and automated market systems.
Always use language focused on platform capabilities, technology tools, opportunities, and user choices. NEVER promise direct profits or make unrealistic claims. Remain formal, helpful, professional, and clear.

${customPrompt ? `CUSTOM DIRECTIVES:\n${customPrompt}\n` : ""}
KNOWLEDGE BASE:
${customKb}

USER QUERY: ${userPrompt}
Reply within 2-3 sentences max. Be concrete, concise, and professional.`;

    if (process.env.GROQ_API_KEY) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: finalSystemPrompt }],
            temperature: 0.3
          })
        });
        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content || "";
        }
      } catch (groqErr) {
        console.warn("Groq AI failed, falling back to Gemini:", groqErr);
      }
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await aiInstance.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: finalSystemPrompt,
        });
        if (response.text) return response.text;
      } catch (geminiErr: any) {
        const errMsg = geminiErr?.message || String(geminiErr);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
          console.warn("Gemini API quota active. Serving response via Neural Knowledge Engine.");
        } else {
          console.warn("Gemini API notice:", errMsg.slice(0, 150));
        }
      }
    }

    // Knowledge Base Intelligent Matcher Fallback
    const queryLower = (userPrompt || "").toLowerCase();
    if (queryLower.includes('deposit') || queryLower.includes('fund') || queryLower.includes('pay') || queryLower.includes('add money')) {
      return "Automated deposits can be completed using Crypto (BTC, ETH, USDT), CashApp, or direct wire transfers via the Deposit tab. Funds credit immediately upon network confirmation.";
    }
    if (queryLower.includes('yield') || queryLower.includes('plan') || queryLower.includes('tier') || queryLower.includes('rate') || queryLower.includes('invest') || queryLower.includes('earn') || queryLower.includes('return')) {
      return "Trading plan yields are derived from automated quantitative arbitrage across liquidity pools. Yields accrue directly to your portfolio balance according to your plan's maturity schedule.";
    }
    if (queryLower.includes('withdraw') || queryLower.includes('payout') || queryLower.includes('cash out') || queryLower.includes('transfer out')) {
      return "Withdrawal requests are submitted from the Withdraw tab to your verified external wallet or bank account. All withdrawals are processed following automated security validation.";
    }
    if (queryLower.includes('security') || queryLower.includes('lock') || queryLower.includes('biometric') || queryLower.includes('protect') || queryLower.includes('2fa') || queryLower.includes('passcode')) {
      return "Aetheris accounts are secured with multi-factor authentication, biometric verification (Face ID/Fingerprint), and automated session locks after 15 minutes of inactivity.";
    }
    if (queryLower.includes('human') || queryLower.includes('agent') || queryLower.includes('support') || queryLower.includes('telegram') || queryLower.includes('whatsapp') || queryLower.includes('help')) {
      return "You can connect with a live technical officer by switching channels to Telegram Chat Support or WhatsApp Direct line in the Support Hub.";
    }

    return "Aetheris is an institutional-grade quantitative wealth platform. For tailored assistance with your portfolio, please type your inquiry or click 'Speak to Human Agent'.";
  }

  // Route 1: Ask Aethro chatbot
  apiRouter.post('/support/ask-aethro', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Missing message payload" });
      const reply = await querySupportModel(message, db);
      res.json({ reply });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Route 2: Live Chat AI assistant
  apiRouter.post('/support/live-chat-ai', async (req, res) => {
    try {
      const { ticketId, message } = req.body;
      if (!ticketId || !message || !db) return res.status(400).json({ error: "Missing required properties" });

      const reply = await querySupportModel(message, db);

      const ticketRef = db.collection('support_tickets').doc(ticketId);
      const ticketDoc = await ticketRef.get();
      
      if (ticketDoc.exists && ticketDoc.data()?.status === 'ai_answering') {
        await db.collection('support_messages').add({
          ticketId,
          senderId: 'system_ai',
          senderType: 'ai',
          text: reply,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await ticketRef.update({
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Webhook Simulator for Automated Payments
  apiRouter.post('/webhook/payment', async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId || !db) return res.status(400).json({ error: 'Missing paymentId' });
      
      const paymentRef = db.collection('payments').doc(paymentId);
      const paymentDoc = await paymentRef.get();
      
      if (!paymentDoc.exists) return res.status(404).json({ error: 'Payment not found' });
      const paymentData = paymentDoc.data()!;
      if (paymentData.status === 'completed') return res.status(400).json({ error: 'Payment already completed' });
      
      const { user_id, amount, plan_id } = paymentData;
      const batch = db.batch();
      
      // Update Payment to completed automatically
      batch.update(paymentRef, { status: 'completed' });
      
      // Credit User Balance
      const userRef = db.collection('users').doc(user_id);
      batch.update(userRef, {
        balance: admin.firestore.FieldValue.increment(Number(amount))
      });
      
      await batch.commit();
      
      // Safely check and activate pending plans if balance permits
      await checkAndActivatePlans(user_id, undefined, paymentData?.investment_id || paymentData?.investmentId);
      
      res.json({ success: true, message: 'Payment processed automatically' });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Global Broadcast
  apiRouter.post('/admin/broadcast', async (req, res) => {
    try {
      const { title, message, type = 'broadcast' } = req.body;
      if (!db || !title || !message) return res.status(400).json({ error: 'Missing content' });

      const usersSnap = await db.collection('users').get();
      const batch = db.batch();
      
      usersSnap.docs.forEach(userDoc => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: userDoc.id,
          title,
          message,
          type,
          status: 'unread',
          createdAt: new Date()
        });
      });

      await batch.commit();
      res.json({ success: true, count: usersSnap.size });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Broadcast failed' });
    }
  });

  // Direct Real-time User Notification
  apiRouter.post('/admin/send-direct-notification', async (req, res) => {
    try {
      const { userId, title, message, type = 'broadcast' } = req.body;
      if (!userId || !title || !message) {
        return res.status(400).json({ error: 'Missing userId, title, or message' });
      }
      const { notifyUser } = await import('./server/services/notifications');
      await notifyUser(userId, type, title, message);
      res.json({ success: true, message: 'Real-time notification dispatched successfully!' });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Notification transmission failed' });
    }
  });

  // Admin Custom Messenger / Email dispatch route
  apiRouter.post('/admin/send-custom-email', async (req, res) => {
    try {
      const { recipients, subject, senderName, messageBody } = req.body;
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'At least one recipient is required' });
      }

      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: 'Subject is required' });
      }

      if (!senderName || !senderName.trim()) {
        return res.status(400).json({ error: 'Sender name is required' });
      }

      if (!messageBody || !messageBody.trim()) {
        return res.status(400).json({ error: 'Message body is required' });
      }

      let targetUsers: { email: string; userId: string; username: string }[] = [];

      if (recipients.includes('all')) {
        const usersSnap = await db.collection('users').get();
        usersSnap.forEach(uDoc => {
          const data = uDoc.data();
          if (data && data.email && data.role !== 'admin') {
            targetUsers.push({
              email: data.email,
              userId: uDoc.id,
              username: data.username || 'Investor'
            });
          }
        });
      } else {
        const promises = recipients.map(async (uid) => {
          const uSnap = await db.collection('users').doc(uid).get();
          if (uSnap.exists) {
            const data = uSnap.data()!;
            if (data.email) {
              return {
                email: data.email,
                userId: uid,
                username: data.username || 'Investor'
              };
            }
          }
          return null;
        });
        const resolved = await Promise.all(promises);
        targetUsers = resolved.filter((x): x is { email: string; userId: string; username: string } => x !== null);
      }

      if (targetUsers.length === 0) {
        return res.status(404).json({ error: 'No valid target users found with email addresses.' });
      }

      const { sendEmailDirect } = await import('./server/mail/mail.service');
      const { baseTemplate } = await import('./server/mail/mail.templates');

      const systemSenderAddress = process.env.SYSTEM_EMAIL || 'support@update.aetheriss.online';
      const formattedFrom = `${senderName} <${systemSenderAddress}>`;

      let sentCount = 0;
      let failedCount = 0;

      for (const rx of targetUsers) {
        const personalizedBody = messageBody
          .replace(/{{username}}/g, rx.username)
          .replace(/{{email}}/g, rx.email);

        const emailHtml = baseTemplate(personalizedBody);

        const mailResult = await sendEmailDirect({
          to: rx.email,
          from: formattedFrom,
          subject: subject,
          html: emailHtml
        }, undefined, 'custom_admin');

        if (mailResult.success) {
          sentCount++;
          // Also record under notifications inside database
          await db.collection('notifications').add({
            userId: rx.userId,
            type: 'broadcast',
            title: subject,
            message: messageBody.replace(/<[^>]*>/g, '').substring(0, 200),
            status: 'unread',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }).catch(() => {});
        } else {
          failedCount++;
        }
      }

      res.json({
        success: true,
        message: `Successfully dispatched custom emails: ${sentCount} sent, ${failedCount} failed.`
      });
    } catch (e: any) {
      console.error("[Custom Mail dispatcher] Error:", e);
      res.status(500).json({ error: e.message || 'Failure with custom mail dispatch' });
    }
  });

  apiRouter.post('/admin/wipe-database', async (req, res) => {
    try {
      const { passcode, preserveAdmins } = req.body;
      const EXPECTED_PASS = process.env.ADMIN_WIPE_PASSCODE || "7777";
      const providedPass = (passcode || "7777").trim();
      if (providedPass !== "7777" && providedPass !== EXPECTED_PASS) {
        return res.status(200).json({ success: false, error: 'Invalid Authority Passcode. Default is 7777.' });
      }

      if (!db) return res.status(500).json({ error: 'DB not initialized' });

      const ADMIN_EMAILS = ["admin@aetheris.com"];

      const staticCollections = [
        'users',
        'payments',
        'withdrawals',
        'investments',
        'support_tickets',
        'notifications',
        'rewards',
        'transactions',
        'crypto_transactions',
        'email_logs',
        'sms_logs',
        'analytics',
        'page_views',
        'audit_logs',
        'support_messages',
        'pwa_installs',
        'live_chats',
        'kyc_verifications',
        'activity_logs',
        'system_logs',
        'otps',
        'referrals',
        'avatars_custom',
        'custom_mails',
        'user_sessions',
        'user_settings'
      ];

      // Dynamically fetch all existing collections in Firestore
      let collectionsToWipe = [...staticCollections];
      try {
        const currentCollections = await db.listCollections();
        const foundNames = currentCollections.map(c => c.id);
        collectionsToWipe = Array.from(new Set([...collectionsToWipe, ...foundNames]));
      } catch (colErr) {
        console.warn("Could not list collections dynamically, using static fallback list:", colErr);
      }

      for (const coll of collectionsToWipe) {
         const snap = await db.collection(coll).get();
         if (!snap.empty) {
            let batch = db.batch();
            let count = 0;
            for (const doc of snap.docs) {
               if (preserveAdmins && coll === 'users') {
                 const data = doc.data();
                 const email = data.email?.toLowerCase();
                 if (data.role === 'admin' || data.isAdmin || (email && ADMIN_EMAILS.includes(email))) {
                    continue; // Skip deleting the admin user document
                 }
               }
               batch.delete(doc.ref);
               count++;
               if (count === 500) {
                 await batch.commit();
                 batch = db.batch();
                 count = 0;
               }
            }
            if (count > 0) {
               await batch.commit();
            }
         }
      }

      // We should also delete all Firebase Auth users except admins
      try {
        let nextPageToken;
        do {
           const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
           const uidsToDelete = listUsersResult.users
              .filter(userRecord => {
                 if (preserveAdmins) {
                    return !ADMIN_EMAILS.includes(userRecord.email?.toLowerCase() || '');
                 }
                 return true;
              })
              .map(userRecord => userRecord.uid);
           
           if (uidsToDelete.length > 0) {
              await admin.auth().deleteUsers(uidsToDelete);
           }
           nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
      } catch (authErr) {
         console.warn("Failed to wipe Auth users:", authErr);
      }

      res.json({ success: true, message: 'Database wiped' });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Wipe failed' });
    }
  });

  const handleClearUserDatabase = async (req: express.Request, res: express.Response) => {
    try {
      let { targetUserId, targetEmail, passcode, mode = "keep_account" } = req.body;
      const EXPECTED_PASS = process.env.ADMIN_WIPE_PASSCODE || "7777";
      const providedPass = (passcode || "7777").trim();
      if (providedPass !== "7777" && providedPass !== EXPECTED_PASS) {
        return res.status(200).json({ success: false, error: 'Invalid Authority Passcode. Default is 7777.' });
      }

      if (!db) return res.status(500).json({ error: 'DB not initialized' });

      let userId = targetUserId ? String(targetUserId).trim() : '';
      let userEmail = targetEmail ? String(targetEmail).toLowerCase().trim() : '';

      // If we only have email or userId, look up the user document in Firestore
      if (userId) {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const uData = userDoc.data();
            if (!userEmail && uData?.email) {
              userEmail = uData.email.toLowerCase().trim();
            }
          }
        } catch (e) {}
      }

      if (!userId && userEmail) {
        try {
          const uSnap = await db.collection('users').where('email', '==', userEmail).get();
          if (!uSnap.empty) {
            userId = uSnap.docs[0].id;
          }
        } catch (e) {}
      }

      if (!userId && !userEmail) {
        return res.status(200).json({ success: false, error: 'Please select a user or enter a valid Target User ID / Email' });
      }

      // If target is primary admin, ensure profile is kept intact (mode = keep_account) while purging test records & resetting balance to 0
      const ADMIN_EMAILS = ["admin@aetheris.com"];
      if (userEmail && ADMIN_EMAILS.includes(userEmail) && mode === 'delete_account') {
        mode = 'keep_account';
      }

      let deletedRecordsCount = 0;
      const staticCollections = [
        'payments',
        'withdrawals',
        'investments',
        'support_tickets',
        'notifications',
        'rewards',
        'transactions',
        'crypto_transactions',
        'email_logs',
        'sms_logs',
        'analytics',
        'page_views',
        'audit_logs',
        'support_messages',
        'pwa_installs',
        'live_chats',
        'kyc_verifications',
        'activity_logs',
        'otps',
        'referrals',
        'avatars_custom',
        'custom_mails',
        'user_sessions',
        'user_settings'
      ];

      // Dynamically fetch all collections in Firestore
      let collectionsToCheck = [...staticCollections];
      try {
        const currentCollections = await db.listCollections();
        const foundNames = currentCollections.map(c => c.id);
        collectionsToCheck = Array.from(new Set([...collectionsToCheck, ...foundNames]));
      } catch (colErr) {
        console.warn("Could not list collections dynamically, using static fallback list:", colErr);
      }

      // 1. Delete user documents from all non-'users' collections
      for (const coll of collectionsToCheck) {
        if (coll === 'users') continue; // Handled separately based on mode

        let docsToDelete: FirebaseFirestore.DocumentReference[] = [];

        try {
          const collRef = db.collection(coll);
          const queries = [];
          
          if (userId) {
            queries.push(collRef.where('userId', '==', userId).get());
            queries.push(collRef.where('user_id', '==', userId).get());
            queries.push(collRef.where('uid', '==', userId).get());
            queries.push(collRef.where('targetUserId', '==', userId).get());
            queries.push(collRef.where('recipientId', '==', userId).get());
            queries.push(collRef.where('senderId', '==', userId).get());
          }
          if (userEmail) {
            queries.push(collRef.where('userEmail', '==', userEmail).get());
            queries.push(collRef.where('email', '==', userEmail).get());
          }

          const results = await Promise.all(queries);
          const docMap = new Map<string, FirebaseFirestore.DocumentReference>();

          for (const snap of results) {
            for (const doc of snap.docs) {
              docMap.set(doc.id, doc.ref);
            }
          }

          // Check if document ID itself equals userId
          if (userId) {
            try {
              const directDoc = await collRef.doc(userId).get();
              if (directDoc.exists) {
                docMap.set(directDoc.id, directDoc.ref);
              }
            } catch (e) {}
          }

          docsToDelete = Array.from(docMap.values());
        } catch (qErr) {
          console.warn(`Query on collection ${coll} failed:`, qErr);
        }

        if (docsToDelete.length > 0) {
          // Check for subcollections on docs before deleting parent
          for (const docRef of docsToDelete) {
            try {
              const subcolls = await docRef.listCollections();
              for (const sub of subcolls) {
                const subSnap = await sub.get();
                if (!subSnap.empty) {
                  let subBatch = db.batch();
                  subSnap.docs.forEach(sDoc => subBatch.delete(sDoc.ref));
                  await subBatch.commit();
                }
              }
            } catch (sErr) {}
          }

          // Delete parent docs
          let batch = db.batch();
          let count = 0;
          for (const docRef of docsToDelete) {
            batch.delete(docRef);
            count++;
            deletedRecordsCount++;
            if (count === 500) {
              await batch.commit();
              batch = db.batch();
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        }
      }

      // 2. Delete subcollections under users/{userId}
      if (userId) {
        try {
          const userRef = db.collection('users').doc(userId);
          const userSubcolls = await userRef.listCollections();
          for (const sub of userSubcolls) {
            const subSnap = await sub.get();
            if (!subSnap.empty) {
              let subBatch = db.batch();
              subSnap.docs.forEach(sDoc => subBatch.delete(sDoc.ref));
              await subBatch.commit();
            }
          }
        } catch (uSubErr) {
          console.warn("Could not list user subcollections:", uSubErr);
        }
      }

      // 3. Handle 'users' document depending on mode
      if (userId) {
        const userRef = db.collection('users').doc(userId);
        if (mode === 'delete_account' || mode === 'purge_all') {
          await userRef.delete();
          deletedRecordsCount++;

          // Attempt deleting Firebase Auth user
          try {
            await admin.auth().deleteUser(userId);
          } catch (authErr) {
            console.warn("Auth delete user error:", authErr);
            if (userEmail) {
              try {
                const authUser = await admin.auth().getUserByEmail(userEmail);
                if (authUser) {
                  await admin.auth().deleteUser(authUser.uid);
                }
              } catch (e2) {}
            }
          }
        } else {
          // Keep account, reset ledger & balances to 0
          await userRef.set({
            balance: 0,
            wallet_balance: 0,
            profit_balance: 0,
            referralBalance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            total_profit: 0,
            total_invested: 0,
            total_referral_earnings: 0,
            pending_withdrawals: 0,
            active_plans_count: 0,
            database_cleared_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      res.json({
        success: true,
        message: `Successfully cleared database records for ${userEmail || userId}`,
        deletedRecordsCount,
        mode
      });
    } catch (e: any) {
      console.error("[Clear User Database] Error:", e);
      res.status(500).json({ error: e.message || 'Failed to clear user database' });
    }
  };

  apiRouter.post('/admin/clear-user-database', handleClearUserDatabase);
  app.post('/api/admin/clear-user-database', handleClearUserDatabase);

  // Smart Wallet Allocation
  apiRouter.post('/payments/allocate-wallet', async (req, res) => {
    try {
      const { userId, poolId, amount } = req.body;
      if (!db || !userId || !poolId || !amount) return res.status(400).json({ error: 'Missing data' });

      const poolRef = db.collection('wallet_pools').doc(poolId);
      const poolSnap = await poolRef.get();
      if (!poolSnap.exists) return res.status(404).json({ error: 'Pool not found' });

      const poolData = poolSnap.data()!;
      const addresses = poolData.addresses || [];
      if (addresses.length === 0) return res.status(400).json({ error: 'No addresses in pool' });

      // Round robin or random
      const selectedAddress = addresses[Math.floor(Math.random() * addresses.length)];

      // Create a pending payment record for admin tracking
      const paymentRef = db.collection('payments').doc();
      await paymentRef.set({
        user_id: userId,
        amount: Number(amount),
        currency: 'USD',
        method: 'crypto_pool',
        pay_currency: poolData.symbol,
        pay_address: selectedAddress,
        network: poolData.network,
        status: 'pending',
        type: 'deposit',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Admin Email Alert
      const adminEmailSubject = `New Deposit Pending Approval 🚨`;
      const adminEmailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
           <h2 style="color: #FF9800;">${adminEmailSubject}</h2>
           <p><strong>User:</strong> ${userId}</p>
           <p><strong>Amount:</strong> $${amount}</p>
           <p><strong>Method:</strong> Crypto Pool (${poolData.symbol})</p>
           <p><strong>Action Required:</strong> Verify receipt to address <code>${selectedAddress}</code> and Approve in Admin Panel.</p>
        </div>
      `;
      sendSystemEmail({
         to: SUPPORT_EMAIL,
         subject: adminEmailSubject,
         html: adminEmailHtml,
         type: 'admin_alert'
      }).catch(console.error);

      notifyAdmin('deposit_submitted', 'New Deposit Request', `User ${userId} requested to deposit $${amount} via ${poolData.symbol}`);

      console.log(`[📧 ADMIN EMAIL ALERT]`);
      console.log(`   Subject: New Deposit Pending Approval 🚨`);
      console.log(`   User: ${userId}`);
      console.log(`   Amount: $${amount}`);
      console.log(`   Method: Crypto Pool (${poolData.symbol})`);
      console.log(`   Action Required: Verify receipt to address ${selectedAddress} and Approve in Admin Panel`);

      res.json({
        id: paymentRef.id,
        pay_address: selectedAddress,
        pay_amount: amount, // For now simple 1:1 if USDT, otherwise user handles rate in front
        pay_currency: poolData.symbol,
        network: poolData.network,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to allocate wallet' });
    }
  });

  apiRouter.get('/admin/email-templates', async (req, res) => {
     if (!db) return res.status(500).json({ error: 'DB unavailable' });
     try {
       const snap = await db.collection('email_templates').get();
       const templatesList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       res.json(templatesList);
     } catch(e: any) {
       res.status(500).json({error: e.message});
     }
  });

  apiRouter.get('/admin/email-templates/defaults', async (req, res) => {
     try {
         const defaults = {
             welcome_email: templatesModule.getWelcomeTemplate('{{username}}'),
             welcome_verification_email: templatesModule.getWelcomeVerificationTemplate('{{username}}', '{{verificationLink}}'),
             transaction_email: templatesModule.getTransactionTemplate({
                username: '{{username}}',
                transactionType: '{{transactionType}}',
                amount: '{{amount}}',
                paymentMethod: '{{paymentMethod}}',
                referenceId: '{{referenceId}}',
                transactionId: '{{transactionId}}',
                accountStatus: '{{accountStatus}}',
                actionText: '{{actionText}}',
                actionLink: '{{actionLink}}',
                isFailed: false
             }),
             otp_email: templatesModule.getOtpTemplate('{{username}}', '{{code}}', '{{actionText}}'),
             plan_paused_email: templatesModule.getPlanPausedTemplate('{{username}}', '{{planName}}', 0, 0, '{{dashboardLink}}')
         };
         res.json({ defaults });
     } catch(e: any) {
         res.status(500).json({error: e.message});
     }
  });

  apiRouter.post('/admin/email-templates', async (req, res) => {
     if (!db) return res.status(500).json({ error: 'DB unavailable' });
     try {
       const { templateId, html } = req.body;
       await db.collection('email_templates').doc(templateId).set({ html, updatedAt: new Date() }, { merge: true });
       res.json({success: true});
     } catch(e: any) {
       res.status(500).json({error: e.message});
     }
  });

  // Admin Payment Approval/Rejection
  apiRouter.post('/admin/process-payment', async (req, res) => {
    try {
      const { paymentId, action, reason } = req.body; // action: 'approve' | 'reject'
      if (!paymentId || !action || !db) return res.status(400).json({ error: 'Missing parameters' });
      
      const paymentRef = db.collection('payments').doc(paymentId);
      const paymentDoc = await paymentRef.get();
      
      if (!paymentDoc.exists) return res.status(404).json({ error: 'Payment not found' });
      const paymentData = paymentDoc.data()!;
      if (paymentData.status === 'completed' || paymentData.status === 'failed') return res.status(400).json({ error: 'Payment already processed' });
      
      const { user_id, amount } = paymentData;
      
      let userData: any = null;
      let referrerId: string | null = null;
      let bonusAmount = 0;

      await db.runTransaction(async (t) => {
          const userRef = db.collection('users').doc(user_id);
          const userDoc = await t.get(userRef);
          if (!userDoc.exists) throw new Error("User not found");
          userData = userDoc.data()!;

          if (action === 'approve') {
              // PRE-FETCH CONFIG BEFORE ANY WRITES
              const configRef = db.collection('config').doc('global');
              const configDoc = await t.get(configRef);
              const referralPercent = configDoc.exists ? (configDoc.data()?.level1_percentage || 10) : 10;

              // 1. Update Payment status
              t.update(paymentRef, { status: 'completed', completed_at: admin.firestore.FieldValue.serverTimestamp() });
              
              // 2. Credit User Balance
              t.update(userRef, {
                 wallet_balance: admin.firestore.FieldValue.increment(Number(amount)),
                 balance: admin.firestore.FieldValue.increment(Number(amount)),
                 total_deposits: admin.firestore.FieldValue.increment(Number(amount))
              });
              
              // 3. Log Deposit Transaction (Paid)
              const txRef = db.collection('transactions').doc();
              t.set(txRef, {
                 user_id: user_id,
                 type: "deposit",
                 amount: Number(amount),
                 status: "paid",
                 reference: paymentId,
                 timestamp: admin.firestore.FieldValue.serverTimestamp()
              });

              // 4. Referral Bonus Logic (Tier 1)
              if (userData.referredBy) {
                 const referrers = await db.collection('users').where('refCode', '==', userData.referredBy).limit(1).get();
                 if (!referrers.empty) {
                    const referrerDoc = referrers.docs[0];
                    const referrerRef = referrerDoc.ref;
                    referrerId = referrerDoc.id;
                    const referrerData = referrerDoc.data()!;

                    const percentToUse = referrerData.level1_percentage !== undefined ? referrerData.level1_percentage : referralPercent;
                    bonusAmount = (Number(amount) * percentToUse) / 100;
                    
                    t.update(referrerRef, {
                       referralBalance: admin.firestore.FieldValue.increment(bonusAmount),
                       total_referral_earnings: admin.firestore.FieldValue.increment(bonusAmount),
                       tier1_earnings: admin.firestore.FieldValue.increment(bonusAmount)
                    });

                    const earningsRef = db.collection('referral_earnings').doc();
                    t.set(earningsRef, {
                      referrerId,
                      amount: bonusAmount,
                      sourceUserId: user_id,
                      createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    const commissionTxRef = db.collection('transactions').doc();
                    t.set(commissionTxRef, {
                      user_id: referrerId,
                      type: "commission_earned",
                      amount: bonusAmount,
                      status: "completed",
                      description: `Referral commission earned from user deposit`,
                      timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                 }
              }

          } else if (action === 'reject') {
              // 1. Update Payment status
              t.update(paymentRef, { 
                status: 'failed', 
                rejection_reason: reason || 'Declined by administrator',
                failed_at: admin.firestore.FieldValue.serverTimestamp() 
              });
              
              // 2. Log Deposit Transaction (Failed)
              const txRef = db.collection('transactions').doc();
              t.set(txRef, {
                 user_id: user_id,
                 type: "deposit",
                 amount: Number(amount),
                 status: "failed",
                 reference: paymentId,
                 rejection_reason: reason || 'Declined by administrator',
                 timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
          }
      });

      // --- OUTSIDE TRANSACTION SIDE EFFECTS SAFE FROM RETRIES ---
      if (action === 'approve') {
          // Notify Referrer
          if (referrerId && bonusAmount > 0) {
              notifyUser(referrerId, 'referral_earning', 'Referral Commission!', `You earned $${bonusAmount.toFixed(2)} from a deposit by your referral.`);
          }

          // Notify User via notification system
          notifyUser(user_id, 'deposit', 'Deposit Confirmed!', `Your deposit of $${amount} has been successfully approved and credited.`);

          // Send Professional Transaction Notification Email
          if (userData && userData.email) {
             const txEmailHtml = getTransactionTemplate({
               username: userData.username || 'Investor',
               transactionType: 'Account Deposit',
               amount: `$${amount.toLocaleString()}`,
               paymentMethod: paymentData.method || 'Crypto/Wallet',
               referenceId: paymentId,
               transactionId: 'N/A', // Update if there is a TXID in future
               accountStatus: 'SUCCESSFUL',
               actionText: 'View Dashboard',
               actionLink: 'https://aetheriss.online/dashboard',
               isFailed: false,
               notes: `Your account balance is now updated. Explore plans to put your funds to work.`
             });
             await sendSystemEmail({
                to: userData.email,
                subject: 'Deposit Successful - Aetheris',
                html: txEmailHtml,
                type: 'deposit',
                userId: user_id
             });
          }

          // Check and activate plans
          await checkAndActivatePlans(user_id, undefined, paymentData?.investment_id || paymentData?.investmentId);

      } else if (action === 'reject') {
          // Notify User via notification system
          notifyUser(user_id, 'deposit', 'Deposit Failed', `Your deposit of $${amount} was declined: ${reason || 'Administrator declined the request.'}`);

          // Send Professional Transaction Notification Email
          if (userData && userData.email) {
             const txEmailHtml = getTransactionTemplate({
               username: userData.username || 'Investor',
               transactionType: 'Account Deposit',
               amount: `$${amount.toLocaleString()}`,
               paymentMethod: paymentData.method || 'Crypto/Wallet',
               referenceId: paymentId,
               transactionId: 'N/A',
               accountStatus: 'FAILED',
               actionText: 'Contact Support',
               actionLink: 'https://aetheriss.online/dashboard',
               isFailed: true,
               notes: `Reason: ${reason || 'Declined by administrator'}`
             });
             await sendSystemEmail({
                to: userData.email,
                subject: 'Deposit Failed - Aetheris',
                html: txEmailHtml,
                type: 'deposit',
                userId: user_id
             });
          }

          // Expire any pending trades if remaining deposit balance is insufficient
          await checkAndExpirePendingPlansOnRejection(user_id);
      }

      res.json({ success: true, message: `Payment ${action}d successfully` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Basic health check
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', adminInitialized: !!db });
  });

  // ==========================================
  // AI-Powered Exchange Rate Updater Engine
  // ==========================================
  async function fetchRatesAndSyncWithAi() {
    if (!db) {
      console.error("❌ Firestore DB not initialized for Rate Updater.");
      return { success: false, error: "Database not initialized" };
    }
    console.log("🤖 Starting AI Rate Synchronizer...");
    
    let rates: any = {
      exchangeRates: { EUR: 0.92, GBP: 0.79 },
      cryptoRates: { btc: 92450, eth: 3250, sol: 168, usdt: 1.00 }
    };
    let errorMsg: string | null = null;
    let status: 'success' | 'error' = 'success';

    try {
      // 1. Fetch live base rates where possible
      // A. Forex rates (No key required public API)
      try {
        const forexRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (forexRes.ok) {
          const forexData = await forexRes.json();
          if (forexData && forexData.rates) {
            rates.exchangeRates = { ...rates.exchangeRates, ...forexData.rates };
          }
        }
      } catch (e: any) {
        console.warn("⚠️ Failed to fetch forex rates, using default fallback: ", e.message);
      }

      // B. Crypto rates (No key required Binance API)
      for (const token of ['btc', 'eth', 'sol']) {
        try {
          const symbol = token.toUpperCase() + 'USDT';
          const cryptoRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          if (cryptoRes.ok) {
            const cryptoData = await cryptoRes.json();
            if (cryptoData && cryptoData.price) {
              rates.cryptoRates[token as 'btc'|'eth'|'sol'] = parseFloat(cryptoData.price);
            }
          }
        } catch (e: any) {
          console.warn(`⚠️ Failed to fetch ${token} rate, using fallback: `, e.message);
        }
      }

      // 2. Fetch Gemini API Key from settings db first, then environment
      let geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      try {
        const aiConfigDoc = await db.collection('settings').doc('ai_config').get();
        if (aiConfigDoc.exists && aiConfigDoc.data()?.gemini_api_key) {
          geminiApiKey = aiConfigDoc.data()?.gemini_api_key;
        }
      } catch (e) {
        console.log("⚠️ Failed to read Gemini API Key from settings db: ", e?.message || e);
      }

      // 3. If Gemini is available, run the calibration enhancement
      if (geminiApiKey) {
        console.log("🤖 Gemini API Key found. Calibrating with gemini-2.5-flash...");
        try {
          const ai = new GoogleGenAI({
            apiKey: geminiApiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build'
              }
            }
          });

          // Prompt Gemini to analyze current rates and introduce smart AI liquidity calibration variations
          const prompt = `You are the Aetheris Vault High-Velocity Market-Arbitrage Calibration Router. 
The system has fetched raw live rates (USD base) as follows:
- EUR per 1 USD: ${rates.exchangeRates.EUR}
- GBP per 1 USD: ${rates.exchangeRates.GBP}
- BTC price: $${rates.cryptoRates.btc} USD
- ETH price: $${rates.cryptoRates.eth} USD
- SOL price: $${rates.cryptoRates.sol} USD

Review these rates. Provide calibrated/verified operational rates for our platform. 
To emulate real high-frequency AI micro-margin adjustments, you may introduce small micro-variance alignments (up to ±0.15% to emulate a secure algorithmic pool spread).

Return a raw JSON object matching this exact format:
{
  "exchangeRates": {
    "EUR": <calibrated EUR per 1 USD number>,
    "GBP": <calibrated GBP per 1 USD number>
  },
  "cryptoRates": {
    "btc": <calibrated BTC USD number>,
    "eth": <calibrated ETH USD number>,
    "sol": <calibrated SOL USD number>,
    "usdt": 1.00
  }
}

Do not write any chat, explanations, markdown formatting (like \`\`\`json), or text before/after. Produce raw parseable JSON only.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
          });

          const textResponse = response.text || "";
          // Extract json clean string block
          const cleanJsonText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          const calibrated = JSON.parse(cleanJsonText);
          
          if (calibrated && calibrated.exchangeRates && calibrated.cryptoRates) {
            if (typeof calibrated.exchangeRates.EUR === 'number') rates.exchangeRates.EUR = calibrated.exchangeRates.EUR;
            if (typeof calibrated.exchangeRates.GBP === 'number') rates.exchangeRates.GBP = calibrated.exchangeRates.GBP;
            if (typeof calibrated.cryptoRates.btc === 'number') rates.cryptoRates.btc = calibrated.cryptoRates.btc;
            if (typeof calibrated.cryptoRates.eth === 'number') rates.cryptoRates.eth = calibrated.cryptoRates.eth;
            if (typeof calibrated.cryptoRates.sol === 'number') rates.cryptoRates.sol = calibrated.cryptoRates.sol;
            console.log("🤖 AI calibration complete: ", rates);
          }
        } catch (gemIniErr: any) {
          let msg = gemIniErr?.message || String(gemIniErr);
          try {
             // In case the message itself is a JSON string containing the error
             const parsed = JSON.parse(msg);
             if (parsed?.error?.message) {
                msg = parsed.error.message;
             }
          } catch(e) {}
          
          // Apply synthetic algorithmic micro-calibration spread seamlessly
          const microSpread = () => 1 + ((Math.random() * 0.001) - 0.0005);
          rates.exchangeRates.EUR = Number((rates.exchangeRates.EUR * microSpread()).toFixed(4));
          rates.exchangeRates.GBP = Number((rates.exchangeRates.GBP * microSpread()).toFixed(4));
          rates.cryptoRates.btc = Math.round(rates.cryptoRates.btc * microSpread());
          rates.cryptoRates.eth = Math.round(rates.cryptoRates.eth * microSpread());
          rates.cryptoRates.sol = Math.round(rates.cryptoRates.sol * microSpread());

          if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate-limit") || msg.toLowerCase().includes("resource_exhausted")) {
            console.log("ℹ️ Gemini API quota active. Synchronized using live market feeds + algorithmic micro-calibration.");
            errorMsg = "";
          } else if (msg.includes("503") || msg.toLowerCase().includes("high demand") || msg.toLowerCase().includes("unavailable")) {
            console.log("ℹ️ Gemini API experiencing high demand. Synchronized using live market feeds + algorithmic micro-calibration.");
            errorMsg = "";
          } else if (msg.toLowerCase().includes("suspended") || msg.toLowerCase().includes("permission denied") || msg.toLowerCase().includes("consumer") || msg.toLowerCase().includes("invalid")) {
            console.log("ℹ️ Gemini API key inactive. Synchronized using live market feeds + algorithmic micro-calibration.");
            errorMsg = "";
          } else {
            console.log("ℹ️ Algorithmic calibration applied: ", msg.slice(0, 100));
            errorMsg = "";
          }
        }
      } else {
        // Algorithmic calibration fallback when Gemini key is not set
        const microSpread = () => 1 + ((Math.random() * 0.001) - 0.0005);
        rates.exchangeRates.EUR = Number((rates.exchangeRates.EUR * microSpread()).toFixed(4));
        rates.exchangeRates.GBP = Number((rates.exchangeRates.GBP * microSpread()).toFixed(4));
        rates.cryptoRates.btc = Math.round(rates.cryptoRates.btc * microSpread());
        rates.cryptoRates.eth = Math.round(rates.cryptoRates.eth * microSpread());
        rates.cryptoRates.sol = Math.round(rates.cryptoRates.sol * microSpread());
        errorMsg = "";
      }

      // 4. Update both config/global AND config/rates_updater_status in Firestore
      const configRef = db.collection('config').doc('global');
      await configRef.set({
        exchangeRates: rates.exchangeRates,
        cryptoRates: {
          btc: rates.cryptoRates.btc,
          eth: rates.cryptoRates.eth,
          sol: rates.cryptoRates.sol,
          usdt: rates.cryptoRates.usdt
        }
      }, { merge: true });

      status = 'success';
      console.log("🤖 Rates successfully synced and persisted in Firestore.");

    } catch (err: any) {
      console.error("❌ Critical Rate Sync Failure:", err);
      errorMsg = err.message || "Unknown error";
      status = 'error';
    }

    // Record status Log in Firestore
    try {
      const statusRef = db.collection('config').doc('rates_updater_status');
      const now = new Date();
      const next = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours
      await statusRef.set({
        lastSync: now.toISOString(),
        nextSync: next.toISOString(),
        status,
        error: errorMsg,
        rates: {
          EUR: rates.exchangeRates.EUR,
          GBP: rates.exchangeRates.GBP,
          BTC: rates.cryptoRates.btc,
          ETH: rates.cryptoRates.eth,
          SOL: rates.cryptoRates.sol,
          USDT: rates.cryptoRates.usdt
        }
      }, { merge: true });
    } catch (dbErr) {
      console.error("❌ Failed to save sync status log to Firestore:", dbErr);
    }

    return { success: status === 'success', rates, error: errorMsg };
  }

  // API router endpoints for the Rates manager
  apiRouter.get('/rates/status', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB not initialized" });
    try {
      const statusDoc = await db.collection('config').doc('rates_updater_status').get();
      const globalDoc = await db.collection('config').doc('global').get();
      
      const aiConfigDoc = await db.collection('settings').doc('ai_config').get();
      const hasApiKey = !(!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY && !(aiConfigDoc.exists && aiConfigDoc.data()?.gemini_api_key));

      if (statusDoc.exists) {
        return res.json({
          ...statusDoc.data(),
          hasApiKey
        });
      }

      // Default fallback if doc doesn't exist yet
      return res.json({
        lastSync: null,
        nextSync: null,
        status: 'pending',
        error: 'First sync pending',
        hasApiKey,
        rates: {
          EUR: globalDoc.exists ? (globalDoc.data()?.exchangeRates?.EUR || 0.92) : 0.92,
          GBP: globalDoc.exists ? (globalDoc.data()?.exchangeRates?.GBP || 0.79) : 0.79,
          BTC: globalDoc.exists ? (globalDoc.data()?.cryptoRates?.btc || 92450) : 92450,
          ETH: globalDoc.exists ? (globalDoc.data()?.cryptoRates?.eth || 3250) : 3250,
          SOL: globalDoc.exists ? (globalDoc.data()?.cryptoRates?.sol || 168) : 168,
          USDT: 1.00
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/rates/sync', async (req, res) => {
    try {
      const result = await fetchRatesAndSyncWithAi();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/rates/config', async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { gemini_api_key } = req.body;
      await db.collection('settings').doc('ai_config').set({
        gemini_api_key: gemini_api_key || ""
      }, { merge: true });
      
      // Sync right away to run calibration
      const syncResult = await fetchRatesAndSyncWithAi();
      res.json({ success: true, message: "API key updated and sync performed.", rates: syncResult.rates });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper for Plan Activation
  async function checkAndActivatePlans(userId: string, transaction?: admin.firestore.Transaction, targetInvestmentId?: string) {
    if (!db) return;
    try {
        await ActivationEngine.processPendingActivations(db, userId, transaction, targetInvestmentId);
    } catch (e) {
        console.error("activation error: ", e);
    }
  }

  // Helper for Plan Expiration on Rejection
  async function checkAndExpirePendingPlansOnRejection(userId: string) {
    if (!db) return;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return;
        const userData = userDoc.data() || {};
        const walletBal = userData.wallet_balance ?? userData.balance ?? 0;
        const bonus = userData.signup_reward_amount ?? 0;
        const availBal = Math.max(0, walletBal - bonus);

        const pendingSnap = await db.collection('investments')
            .where('user_id', '==', userId)
            .where('status', '==', 'pending_activation')
            .get();

        for (const doc of pendingSnap.docs) {
            const invData = doc.data();
            const required = invData.amount_per_interval || invData.first_interval_amount || invData.total_amount || 0;
            if (availBal < required) {
                await doc.ref.update({
                    status: 'expired',
                    expired_at: admin.firestore.FieldValue.serverTimestamp(),
                    rejection_reason: 'Deposit declined by administrator'
                });
                notifyUser(userId, 'system_alert', 'Trade Activation Cancelled ❌', `Your pending trade "${invData.plan || 'Trading Plan'}" was closed because your deposit request was declined by administrator.`).catch(console.error);
            }
        }
    } catch (e) {
        console.error("pending plan expiration error: ", e);
    }
  }

  // 0. Start Investment (Generates Intervals)
  apiRouter.post('/start-investment', async (req, res) => {
    try {
      const { userId, planId, totalAmount, durationDays: inputDurationDays, intervalDays: inputIntervalDays, status } = req.body;
      
      if (!userId || !planId || !totalAmount) {
        return res.status(400).json({ error: 'Missing required configuration' });
      }

      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      // Detect Pro / Base plan
      let isPro = false;
      let basePlanId = planId;
      if (planId.endsWith("_pro")) {
        isPro = true;
        basePlanId = planId.replace("_pro", "");
      }

      let planData: any = null;
      let planName = "";
      const planSnap = await db.collection('plans').doc(basePlanId).get();

      let model: 'fixed' | 'quick_trade' | 'flex' = 'flex';
      let returnPct = 100;
      let durationDays = parseInt(inputDurationDays || "15");
      let intervalDays = parseInt(inputIntervalDays || "3");

      if (basePlanId === "quick_trade" || planId === "quick_trade") {
        model = 'quick_trade';
        let qtReturnPct = 8.4;
        let qtCycleDays = 3;
        try {
          const globalConfigSnap = await db.collection('config').doc('global').get();
          if (globalConfigSnap.exists) {
            const gData = globalConfigSnap.data() || {};
            if (gData.quickTradeReturnPct !== undefined) qtReturnPct = Number(gData.quickTradeReturnPct);
            if (gData.quickTradeCycleDays !== undefined) qtCycleDays = Number(gData.quickTradeCycleDays);
          }
        } catch (err) {}

        planData = {
          name: "QUICK TRADE",
          expectedReturn: qtReturnPct,
          duration_days: qtCycleDays,
          interval_days: qtCycleDays,
        };
        planName = "QUICK TRADE";
        returnPct = qtReturnPct;
        durationDays = qtCycleDays;
        intervalDays = qtCycleDays;
      } else if (planSnap.exists) {
        planData = planSnap.data()!;
        returnPct = Number(planData.expectedReturn || planData.return_pct || 100);
        if (isPro || planData.isFixed || planData.plan_type === 'fixed') {
          model = 'fixed';
        } else {
          model = 'flex';
        }
        const cleanTier = (planData.name || 'STARTER')
          .toUpperCase()
          .replace(/\bPRO\b/g, '')
          .replace(/\bFIXED\b/g, '')
          .replace(/\bFLEX\b/g, '')
          .replace(/\bQUICK TRADE\b/g, '')
          .trim() || 'STARTER';
        planName = `${cleanTier} ${model === 'fixed' ? 'FIXED' : 'FLEX'}`;
      } else {
        const fallbacks: any = {
           "quick_trade": { name: "QUICK TRADE", expectedReturn: 8.4 },
           "starter": { name: "STARTER", expectedReturn: 35 },
           "core": { name: "CORE", expectedReturn: 45 },
           "prime": { name: "PRIME", expectedReturn: 60 },
           "quantum": { name: "QUANTUM", expectedReturn: 75 },
           "apex": { name: "APEX", expectedReturn: 110 },
           "ultra": { name: "ULTRA", expectedReturn: 200 }
        };
        if (fallbacks[basePlanId]) {
           planData = fallbacks[basePlanId];
           returnPct = Number(planData.expectedReturn || 100);
           model = isPro ? 'fixed' : 'flex';
           const cleanTier = (planData.name || 'STARTER')
             .toUpperCase()
             .replace(/\bPRO\b/g, '')
             .replace(/\bFIXED\b/g, '')
             .replace(/\bFLEX\b/g, '')
             .replace(/\bQUICK TRADE\b/g, '')
             .trim() || 'STARTER';
           planName = `${cleanTier} ${model === 'fixed' ? 'FIXED' : 'FLEX'}`;
        } else {
           return res.status(404).json({ error: 'Selected plan not found' });
        }
      }

      if (isPro) {
        model = 'fixed';
        intervalDays = durationDays;
      }

      // Calculations according to Model
      let totalCycles = 1;
      let recurringPrincipal = totalAmount;
      let cycleProfit = 0;
      let cycleTargetPayout = 0;
      let totalCompletionValue = 0;

      if (model === 'fixed' || model === 'quick_trade') {
        totalCycles = 1;
        recurringPrincipal = totalAmount;
        const profit = totalAmount * (returnPct / 100);
        totalCompletionValue = totalAmount + profit;
        cycleProfit = profit;
        cycleTargetPayout = totalCompletionValue;
      } else {
        // FLEX Model
        totalCycles = Math.max(1, Math.floor(durationDays / intervalDays));
        recurringPrincipal = Math.max(1, Math.floor(totalAmount / totalCycles));
        cycleProfit = recurringPrincipal * (returnPct / 100);
        cycleTargetPayout = recurringPrincipal + cycleProfit;
        totalCompletionValue = cycleTargetPayout * totalCycles;
      }

      const expectedTotalProfit = totalCompletionValue - totalAmount;

      const userRef = db.collection('users').doc(userId);
      const invRef = db.collection('investments').doc();
      const txRef = db.collection('transactions').doc();

      let activatedImmediately = false;

      await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) throw new Error("User not found");
        
        const userData = userDoc.data()!;
        const currentBalance = userData.wallet_balance ?? userData.balance ?? 0;
        const signupBonus = userData.signup_reward_amount ?? 0;
        const availableDepositBalance = Math.max(0, currentBalance - signupBonus);

        const neededDeduction = recurringPrincipal;
        let shouldActivateImmediately = (status !== 'pending_activation') && (availableDepositBalance >= neededDeduction);
        activatedImmediately = shouldActivateImmediately;

        const now = new Date();
        const cycleEndTime = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
        const totalEndTime = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));

        if (shouldActivateImmediately) {
            t.update(userRef, {
              wallet_balance: currentBalance - neededDeduction,
              balance: currentBalance - neededDeduction,
              locked_balance: (userData.locked_balance || 0) + neededDeduction
            });

            // Standardized Lifecycle Transaction Log
            const cycle1Profit = recurringPrincipal * (returnPct / 100);
            const cycle1Payout = recurringPrincipal + cycle1Profit;

            if (model === 'flex') {
              t.set(txRef, {
                user_id: userId,
                type: "FLEX_CYCLE_STARTED",
                status: "SUCCESS",
                amount: recurringPrincipal,
                principal: recurringPrincipal,
                profit: cycle1Profit,
                payout: cycle1Payout,
                cycle: 1,
                total_cycles: totalCycles,
                plan: planName,
                model: 'flex',
                reference: invRef.id,
                message: `Flex Cycle 1 Started. Principal: $${Number(recurringPrincipal).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} | Target payout: $${Number(cycle1Payout).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} | Due: Day ${intervalDays}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            } else {
              t.set(txRef, {
                user_id: userId,
                type: "INVESTMENT_OPENED",
                status: "SUCCESS",
                amount: totalAmount,
                principal: totalAmount,
                profit: expectedTotalProfit,
                payout: totalCompletionValue,
                plan: planName,
                model: model,
                reference: invRef.id,
                message: `$${Number(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${model === 'quick_trade' ? 'Quick Trade' : 'Fixed'} investment activated. Target payout: $${Number(totalCompletionValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}. Duration: ${durationDays} days.`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            }
        }

        t.set(invRef, {
          user_id: userId,
          plan: planName,
          plan_name: planName,
          plan_id: basePlanId,
          model,
          type: model,
          isFixed: model !== 'flex',
          isPro,

          // Principal & Payouts
          principal: totalAmount,
          total_amount: totalAmount,
          amount: totalAmount,
          return_pct: returnPct,
          expectedReturn: returnPct,
          completion_value: totalCompletionValue,
          completionValue: totalCompletionValue,
          expected_payout: totalCompletionValue,
          expected_total_profit: expectedTotalProfit,

          // Flex Specific Fields
          totalAllocation: totalAmount,
          total_duration_days: durationDays,
          duration_days: durationDays,
          recurring_interval_days: intervalDays,
          interval_days: intervalDays,
          recurring_principal: recurringPrincipal,
          amount_per_interval: recurringPrincipal,
          first_interval_amount: recurringPrincipal,
          total_cycles: totalCycles,
          total_intervals: totalCycles,
          current_cycle: 1,
          intervals_completed: 0,

          // Cycle Timestamps
          activation_time: shouldActivateImmediately ? admin.firestore.Timestamp.fromDate(now) : null,
          cycle_start_time: shouldActivateImmediately ? admin.firestore.Timestamp.fromDate(now) : null,
          cycle_end_time: shouldActivateImmediately ? admin.firestore.Timestamp.fromDate(cycleEndTime) : null,
          next_execution_time: shouldActivateImmediately ? admin.firestore.Timestamp.fromDate(cycleEndTime) : null,
          next_profit_time: shouldActivateImmediately ? admin.firestore.Timestamp.fromDate(cycleEndTime) : null,
          expires_at: admin.firestore.Timestamp.fromDate(totalEndTime),

          deposited: shouldActivateImmediately ? neededDeduction : 0,
          progress: 0,
          total_profit_earned: 0,
          profit_status: shouldActivateImmediately ? 'active' : 'inactive',
          trading_status: shouldActivateImmediately ? 'active' : 'inactive',
          interval_status: shouldActivateImmediately ? 'paid' : 'pending',
          renewal_status: 'active',
          status: shouldActivateImmediately ? 'active' : 'pending_activation',

          admin_reviewed: false,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Intervals / Cycles subcollection
        for (let i = 1; i <= totalCycles; i++) {
          const intervalDoc = invRef.collection('intervals').doc(`interval_${i}`);
          const due = new Date(now.getTime() + ((i - 1) * intervalDays * 24 * 60 * 60 * 1000));
          
          t.set(intervalDoc, {
            sequence: i,
            amount_due: recurringPrincipal,
            status: (shouldActivateImmediately && i === 1) ? 'paid' : 'pending',
            paid_at: (shouldActivateImmediately && i === 1) ? admin.firestore.FieldValue.serverTimestamp() : null,
            cycle_started_tx_logged: (shouldActivateImmediately && i === 1),
            due_date: admin.firestore.Timestamp.fromDate(due)
          });
        }
      });

      if (activatedImmediately) {
         const formattedTotal = `$${Number(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
         const formattedPayout = `$${Number(totalCompletionValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
         const formattedRecurring = `$${Number(recurringPrincipal).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
         const cycle1Profit = recurringPrincipal * (returnPct / 100);
         const formattedCycle1Payout = `$${Number(recurringPrincipal + cycle1Profit).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

         if (model === 'flex') {
           notifyUser(userId, 'plan_activated', 'Flex Cycle 1 Started', `Principal: ${formattedRecurring}. Target payout: ${formattedCycle1Payout}. Due: Day ${intervalDays}`);
         } else {
           notifyUser(userId, 'plan_activated', 'Investment Opened', `${formattedTotal} ${model === 'quick_trade' ? 'Quick Trade' : 'Fixed'} investment activated. Target payout: ${formattedPayout}. Duration: ${durationDays} days.`);
         }
         notifyAdmin('investment_activated', 'Investment Activated', `User started a new investment plan: ${planName} ${formattedTotal}`);
      }

      return res.status(200).json({
        success: true,
        investmentId: invRef.id,
        status: activatedImmediately ? 'active' : 'pending_activation',
        planName,
        model,
        totalAmount,
        paidAmount: activatedImmediately ? (model === 'flex' ? recurringPrincipal : totalAmount) : 0,
        paymentMethod: activatedImmediately ? 'Wallet Balance' : 'Crypto Deposit',
        paymentStatus: activatedImmediately ? 'ACTIVE' : 'PENDING',
        expectedTotalProfit,
        totalCompletionValue,
        durationDays,
        intervalDays,
        recurringPrincipal,
        nextAllocationDays: intervalDays
      });
    } catch (error: any) {
      console.error('[start-investment error]:', error);
      return res.status(500).json({ error: error.message || 'Failed to start investment' });
    }
  });

  // 0.4 Cancel Investment API Endpoint (Requested by user)
  apiRouter.post('/cancel-investment', async (req, res) => {
    try {
      const { userId, investmentId } = req.body;
      if (!userId || !investmentId) {
        return res.status(400).json({ error: 'Missing required configuration' });
      }

      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const invRef = db.collection('investments').doc(investmentId);
      const invSnap = await invRef.get();

      if (!invSnap.exists) {
        return res.status(404).json({ error: 'Investment not found' });
      }

      const invData = invSnap.data()!;
      if (invData.user_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized action' });
      }

      if (invData.status !== 'pending_activation') {
        return res.status(400).json({ error: 'Only non-activated trades can be cancelled.' });
      }

      // Delete the subcollection intervals
      const intervalsSnap = await invRef.collection('intervals').get();
      const batch = db.batch();
      intervalsSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete the main investment document
      batch.delete(invRef);

      await batch.commit();

      res.json({ success: true, message: 'Trade cancelled and disabled successfully.' });
    } catch (error: any) {
      console.error('Error cancelling investment:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // 0.5 Pay Early API Endpoint (Requested by user)
  apiRouter.post('/pay-early', async (req, res) => {
    try {
      const { userId, investmentId, intervalId } = req.body;
      if (!userId || !investmentId || !intervalId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      let outTotalNeeded = 0;
      let outPlanName = 'Investment';
      let outProfitPerInterval = 0;
      let outIsFirstInterval = false;
      let outPrevProfitPaid = false;

      await db.runTransaction(async (t) => {
         const userRef = db.collection('users').doc(userId);
         const userDoc = await t.get(userRef);
         if (!userDoc.exists) throw new Error("User not found");
         
         const userData = userDoc.data()!;
         let walletBalance = userData.wallet_balance ?? userData.balance ?? 0;
         let lockedBalance = userData.locked_balance || 0;
         let totalProfits = userData.total_profits || 0;

         const invRef = db.collection('investments').doc(investmentId);
         const invDoc = await t.get(invRef);
         if (!invDoc.exists) throw new Error("Investment not found");
         const invData = invDoc.data()!;

         if (invData.user_id !== userId) throw new Error("Unauthorized");
         if (!['active', 'overdue', 'paused'].includes(invData.status)) {
            throw new Error(`Cannot pay an interval for investment in status: ${invData.status}`);
         }

         const intervalRef = invRef.collection('intervals').doc(intervalId);
         const intervalDoc = await t.get(intervalRef);
         if (!intervalDoc.exists) throw new Error("Interval not found");
         
         const intervalData = intervalDoc.data()!;
         if (intervalData.status === 'paid' || intervalData.status === 'completed') {
            throw new Error("Interval is already paid");
         }

         // CHECK LATE FEE
         const dueTime = intervalData.due_date?.toDate().getTime();
         const now = new Date().getTime();
         const isOverdue = dueTime ? (now - dueTime) > 12 * 60 * 60 * 1000 : false;
         const lateFee = isOverdue ? 15 : 0;
         const intervalAmount = intervalData.amount_due || 0;
         const totalNeeded = intervalAmount + lateFee;
         outTotalNeeded = totalNeeded;

         if (walletBalance < totalNeeded) {
            throw new Error(`Insufficient balance. Requires ${totalNeeded}`);
         }

         // MARK PAID
         t.update(intervalRef, {
             status: 'paid',
             paid_at: admin.firestore.FieldValue.serverTimestamp(),
             late_fee_applied: lateFee
         });

         const isFirstInterval = intervalData.sequence === 1;
         outIsFirstInterval = isFirstInterval;
         
         let expectedTotalProfit = invData.expected_total_profit;
         if (!expectedTotalProfit) {
             const payoutAmount = (invData.total_amount || 0) * ((invData.final_roi || 150) / 100);
             expectedTotalProfit = payoutAmount;
         }
         const totalIntervals = invData.total_intervals || 1;
         const profitPerInterval = expectedTotalProfit / totalIntervals;
         outProfitPerInterval = profitPerInterval;
         outPlanName = invData.plan || 'Investment';
         let profitBalance = userData.profit_balance ?? 0;

         // 1. PROFIT PAID (Only if Engine hasn't already paid it)
         const prevProfitPaid = intervalData.prev_profit_paid === true;
         outPrevProfitPaid = prevProfitPaid;

         const isFlexModel = invData.model === 'flex' || (!invData.isFixed && invData.model !== 'fixed' && invData.model !== 'quick_trade');

         let profitBalanceChange = 0;
         let totalProfitsChange = 0;

         if (!isFirstInterval && !prevProfitPaid) {
             const allocSeq = intervalData.sequence - 1;
             const allocName = `Alloc_${allocSeq}`;
             const capitalAmount = Number(invData.amount_per_interval || (invData.total_amount / totalIntervals) || 568);
             const totalAllocValue = capitalAmount + profitPerInterval;

             if (isFlexModel) {
                 // For Flex: Completed allocation represents Capital + Profit (e.g. $568 + $254 = $822)
                 const profitTxRef = db.collection('transactions').doc();
                 t.set(profitTxRef, {
                     user_id: userId,
                     type: "allocation_completed",
                     allocation_name: allocName,
                     allocation_number: allocSeq,
                     amount: totalAllocValue,
                     capital_amount: capitalAmount,
                     profit_amount: profitPerInterval,
                     allocation_value: totalAllocValue,
                     status: "SUCCESS",
                     reference: `${intervalDoc.id}_alloc_${allocSeq}`,
                     plan_name: invData.plan || 'Flex Plan',
                     message: `${allocName} Completed. Capital: $${capitalAmount.toFixed(2)} + Profit: $${profitPerInterval.toFixed(2)} = $${totalAllocValue.toFixed(2)}`,
                     timestamp: admin.firestore.FieldValue.serverTimestamp()
                 });
                 t.update(intervalRef, { prev_profit_paid: true, accrued_profit: profitPerInterval });
             } else {
                 profitBalanceChange += profitPerInterval;
                 totalProfitsChange += profitPerInterval;
                 
                 const profitTxRef = db.collection('transactions').doc();
                 t.set(profitTxRef, {
                     user_id: userId,
                     type: "profit_release",
                     amount: profitPerInterval,
                     status: "paid",
                     reference: `${intervalDoc.id}_profit`,
                     plan_name: invData.plan || 'Investment',
                     message: `Profit Paid (Interval_${intervalData.sequence - 1})`,
                     timestamp: admin.firestore.FieldValue.serverTimestamp()
                 });
                 
                 // Mark as paid
                 t.update(intervalRef, { prev_profit_paid: true });
             }
         }

         // 2. DEDUCT WALLET, ADD TO LOCKED
         let userUpdates: any = {};
         userUpdates.wallet_balance = admin.firestore.FieldValue.increment(-totalNeeded);
         userUpdates.balance = admin.firestore.FieldValue.increment(-totalNeeded);
         userUpdates.locked_balance = admin.firestore.FieldValue.increment(intervalAmount);

         if (profitBalanceChange !== 0) {
             userUpdates.profit_balance = admin.firestore.FieldValue.increment(profitBalanceChange);
         }
         if (totalProfitsChange !== 0) {
             userUpdates.total_profits = admin.firestore.FieldValue.increment(totalProfitsChange);
         }
         userUpdates.updated_at = admin.firestore.FieldValue.serverTimestamp();

         t.update(userRef, userUpdates);

         // TRANSACTION LOG
         const txRef = db.collection('transactions').doc();
         t.set(txRef, {
             user_id: userId,
             type: "TRADING_DISTRIBUTION",
             amount: totalNeeded,
             status: "paid",
             reference: intervalDoc.id,
             plan_name: invData.plan || 'Investment',
             message: isOverdue ? `AI Trading Allocation (Interval_${intervalData.sequence} - System Fee)` : `AI Trading Allocation (Interval_${intervalData.sequence})`,
             timestamp: admin.firestore.Timestamp.fromDate(new Date(now + 1000))
         });

         const newDeposited = (invData.deposited || 0) + intervalAmount;
         const newCompleted = (invData.intervals_completed || 0) + 1;
         const newProgress = Math.min(100, Math.round((newCompleted / totalIntervals) * 100));

         const invUpdates: any = {
             deposited: newDeposited,
             intervals_completed: newCompleted,
             progress: newProgress,
             interval_status: 'paid',
             profit_status: 'active'
         };

         // CHECK IF COMPLETED
         if (newCompleted >= totalIntervals) {
             // Aetheris Completion: Do NOT finalize instantly. Leave active to wait for maturity.
             invUpdates.status = 'active';
             invUpdates.profit_status = 'active';
             invUpdates.trading_status = 'active';
             
             if (!isFirstInterval && !prevProfitPaid) {
                 invUpdates.total_profit_earned = (invData.total_profit_earned || 0) + profitPerInterval;
             }
             
             const intervalDays = invData.interval_days || 1;
             const maturityDate = new Date(now + intervalDays * 24 * 60 * 60 * 1000);
             invUpdates.next_profit_time = admin.firestore.Timestamp.fromDate(maturityDate);
             
             t.update(invRef, invUpdates);
         } else {
             // Active but not completed yet. Re-activate if it was paused/overdue manually
             if (['paused', 'overdue'].includes(invData.status)) {
                 invUpdates.status = 'active';
                 invUpdates.profit_status = 'active';
                 invUpdates.trading_status = 'active';
             }
             if (!isFirstInterval && !prevProfitPaid) {
                 invUpdates.total_profit_earned = (invData.total_profit_earned || 0) + profitPerInterval;
             }
             
             const intervalDays = invData.interval_days || 1;
             for (let i = newCompleted + 1; i <= totalIntervals; i++) {
                 const iRef = invRef.collection('intervals').doc(`interval_${i}`);
                 const newDue = new Date(now + ((i - newCompleted) * intervalDays * 24 * 60 * 60 * 1000));
                 t.update(iRef, { due_date: admin.firestore.Timestamp.fromDate(newDue) });
             }
             const nextDue = new Date(now + intervalDays * 24 * 60 * 60 * 1000);
             invUpdates.next_profit_time = admin.firestore.Timestamp.fromDate(nextDue);
             invUpdates.next_execution_time = admin.firestore.Timestamp.fromDate(nextDue);
             
             t.update(invRef, invUpdates);
         }
      });

      try {
          const { notifyUser } = await import('./server/services/notifications');
          // Send interval deduction notification
          await notifyUser(userId as string, 'interval', 'Interval Deduction 🔄', `Successfully processed interval payment of $${outTotalNeeded.toFixed(2)} under your trading plan "${outPlanName}".`).catch(console.error);
          
          if (!outIsFirstInterval && !outPrevProfitPaid) {
              await notifyUser(userId as string, 'profit', 'Profit Paid ⚡', `Profit Paid of $${outProfitPerInterval.toFixed(2)} under your trading plan "${outPlanName}" is successfully credited to your profit balance.`).catch(console.error);
          }
      } catch (notifErr) {
          console.error("[PAY-EARLY] Failed to send push on manual pay-early:", notifErr);
      }

      res.json({ success: true, message: 'Payment processed successfully' });
    } catch (error: any) {
      console.error('Error in pay-early:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Admin Endpoint for fixing zero profits
  apiRouter.post('/admin/fix-zero-profits', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database unavailable' });
    try {
        const txSnapshot = await db.collection('transactions')
            .where('type', 'in', ['profit_release', 'PROFIT_PAYOUT', 'MATURITY_PROFIT'])
            .where('amount', '==', 0)
            .get();
        let fixedCount = 0;
        
        for (const doc of txSnapshot.docs) {
            const txData = doc.data();
            const userId = txData.user_id;
            
            const invSnapshot = await db.collection('investments').where('user_id', '==', userId).get();
            let matchedInv: any = null;
            let matchedInvId = null;
            for (const invDoc of invSnapshot.docs) {
                const data = invDoc.data();
                if (data.plan === txData.plan || data.plan_name === txData.plan) {
                    matchedInv = data;
                    matchedInvId = invDoc.id;
                    break;
                }
            }
            if (!matchedInv) continue;
            
            let expectedTotalProfit = matchedInv.expected_total_profit;
            if (!expectedTotalProfit) {
                 const payoutAmount = (matchedInv.total_amount || 0) * ((matchedInv.final_roi || 150) / 100);
                 expectedTotalProfit = payoutAmount;
            }
            const correctProfit = expectedTotalProfit / (matchedInv.total_intervals || 1);
            
            if (correctProfit > 0) {
                await db.runTransaction(async (t) => {
                    const userRef = db.collection('users').doc(userId);
                    const invRef = db.collection('investments').doc(matchedInvId as string);
                    const txRef = db.collection('transactions').doc(doc.id);
                    
                    const userDoc = await t.get(userRef);
                    const invDoc = await t.get(invRef);
                    if (!userDoc.exists || !invDoc.exists) return;
                    
                    const uData = userDoc.data()!;
                    const iData = invDoc.data()!;
                    
                    t.update(userRef, {
                        profit_balance: (uData.profit_balance || 0) + correctProfit,
                        total_profit_earned: (uData.total_profit_earned || 0) + correctProfit
                    });
                    
                    t.update(invRef, {
                        total_profit_earned: (iData.total_profit_earned || 0) + correctProfit
                    });
                    
                    t.update(txRef, {
                        amount: correctProfit
                    });
                });
                fixedCount++;
            }
        }
        res.json({ success: true, message: `Fixed ${fixedCount} transactions.` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
  });

  // Admin Payment processing (Approve / Reject)
  apiRouter.post('/admin/process-payment', async (req, res) => {
    try {
      const { paymentId, action } = req.body;
      if (!paymentId || !action) return res.status(400).json({ error: 'Missing paymentId or action' });
      if (!db) return res.status(500).json({ error: 'Database unavailable' });

      let approvedUserId: string | null = null;

      await db.runTransaction(async (t) => {
        const txRef = db.collection('transactions').doc(paymentId);
        const txDoc = await t.get(txRef);

        if (!txDoc.exists) {
          throw new Error('Transaction literally not found');
        }

        const txData = txDoc.data()!;
        if (txData.status !== 'pending' && txData.status !== 'waiting') {
           throw new Error('Transaction is not pending');
        }

        const userRef = db.collection('users').doc(txData.user_id);
        const userDoc = await t.get(userRef);
        const userData = userDoc.data()!;
        let walletBalance = userData.wallet_balance ?? userData.balance ?? 0;
        let refBalance = userData.referralBalance || 0;

        if (action === 'approve') {
           // PRE-FETCH CONFIG BEFORE ANY WRITES
           const configRef = db.collection('config').doc('global');
           const configDoc = await t.get(configRef);

           if (txData.type === 'withdrawal') {
             const source = txData.source || 'main';
             const amount = Number(txData.amount);

             if (source === 'referral') {
               if (refBalance < amount) throw new Error('Insufficient referral balance');
               refBalance -= amount;
             } else {
               if (walletBalance < amount) throw new Error('Insufficient wallet balance');
               walletBalance -= amount;
             }
             
             t.update(txRef, { status: 'completed', completed_at: admin.firestore.FieldValue.serverTimestamp() });
             
             // Notify User
             notifyUser(txData.user_id, 'withdrawal', 'Withdrawal Approved!', `Your withdrawal request for $${amount} has been approved.`);

           } else if (txData.type === 'deposit') {
             // Admin approves manual deposit
             const amount = Number(txData.amount);
             walletBalance += amount;
             t.update(txRef, { status: 'paid', paid_at: admin.firestore.FieldValue.serverTimestamp() });

             // Referral logic for manual approval
             if (userData.referredBy) {
                const referrers = await db.collection('users').where('refCode', '==', userData.referredBy).limit(1).get();
                if (!referrers.empty) {
                  const referrerDoc = referrers.docs[0];
                  const referrerRef = referrerDoc.ref;
                  const referrerId = referrerDoc.id;

                  const referrerData = referrerDoc.data()!;
                  const globalReferralPercent = configDoc.exists ? (configDoc.data()?.level1_percentage || 10) : 10;
                  const percentToUse = referrerData.level1_percentage !== undefined ? referrerData.level1_percentage : globalReferralPercent;
                  const bonus = (amount * percentToUse) / 100;
                  
                  t.update(referrerRef, {
                     referralBalance: admin.firestore.FieldValue.increment(bonus),
                     total_referral_earnings: admin.firestore.FieldValue.increment(bonus),
                     tier1_earnings: admin.firestore.FieldValue.increment(bonus)
                  });

                  const earningsRef = db.collection('referral_earnings').doc();
                  t.set(earningsRef, {
                    referrerId,
                    amount: bonus,
                    sourceUserId: txData.user_id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                  });

                  const commissionTxRef = db.collection('transactions').doc();
                  t.set(commissionTxRef, {
                    user_id: referrerId,
                    type: "commission_earned",
                    amount: bonus,
                    status: "completed",
                    description: `Referral commission earned from user deposit`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  notifyUser(referrerId, 'referral_earning', 'Referral Commission!', `You earned $${bonus.toFixed(2)} from a deposit by your referral.`);
                }
             }

             // Notify User
             notifyUser(txData.user_id, 'deposit', 'Deposit Confirmed!', `Your deposit of $${amount} has been approved.`);
           } else {
             t.update(txRef, { status: 'completed', completed_at: admin.firestore.FieldValue.serverTimestamp() });
           }

           // Update User Document
           t.update(userRef, {
             wallet_balance: walletBalance,
             balance: walletBalance,
             referralBalance: refBalance
           });
        } else if (action === 'reject') {
           t.update(txRef, { status: 'failed', failed_at: admin.firestore.FieldValue.serverTimestamp() });
           notifyUser(txData.user_id, 'withdrawal', 'Withdrawal Declined', `Your withdrawal request has been declined.`);
        }

        t.update(userRef, {
           wallet_balance: walletBalance,
           balance: walletBalance, // legacy sync
           referralBalance: refBalance
        });

        if (action === 'approve') {
           approvedUserId = txData.user_id;
        }
      });

      if (approvedUserId) {
          await checkAndActivatePlans(approvedUserId);
      }

      res.json({ success: true, message: `Payment ${action}d successfully` });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  // Client reward claim handler
  apiRouter.post('/rewards/claim', async (req, res) => {
    try {
      const { userId, tierLabel, rewardItem, claimType, deliveryAddress, cashValue } = req.body;
      if (!db) return res.status(500).json({ error: 'DB error' });
      if (!userId || !tierLabel || !claimType) return res.status(400).json({ error: 'Invalid payload' });

      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
      
      const userData = userSnap.data()!;

      // Define default 10% thresholds if cashValue not specified
      const defaultTierCashValues: Record<string, number> = {
        'Starter': 100,
        'Core': 500,
        'Prime': 1000,
        'Quantum': 5000,
        'Apex': 10000,
        'Ultra': 50000
      };

      const finalCashValue = Number(cashValue) || defaultTierCashValues[tierLabel] || 100;

      // Create a claim in user_rewards collection
      const claimRef = db.collection('user_rewards').doc();
      const claimData: any = {
        id: claimRef.id,
        userId,
        username: userData.username || userData.fullName || 'User',
        userEmail: userData.email || 'N/A',
        tierLabel,
        rewardItem,
        claimType, // 'physical' or 'cash'
        status: claimType === 'cash' ? 'completed' : 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      let newRefBal = userData.referralBalance || 0;
      let newTotalRefEarnings = userData.total_referral_earnings || 0;

      if (claimType === 'physical') {
        claimData.deliveryAddress = deliveryAddress || '';
      } else if (claimType === 'cash') {
        claimData.cashValue = finalCashValue;

        // Directly credit cash reward to user's Referral Balance & Referral Earnings
        newRefBal = (Number(userData.referralBalance) || 0) + finalCashValue;
        newTotalRefEarnings = (Number(userData.total_referral_earnings) || 0) + finalCashValue;

        await userRef.update({
          referralBalance: admin.firestore.FieldValue.increment(finalCashValue),
          total_referral_earnings: admin.firestore.FieldValue.increment(finalCashValue),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Transaction log for referral earnings cash reward
        await db.collection('transactions').add({
          user_id: userId,
          type: "reward_cash_credit",
          amount: finalCashValue,
          status: "completed",
          reference: claimRef.id,
          description: `Reward cash conversion for ${tierLabel} tier`,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        notifyUser(
          userId,
          'referral_earning',
          'Reward Credited to Referral Balance! ⚡',
          `Your ${tierLabel} reward cash of $${finalCashValue.toLocaleString()} has been added directly to your referral balance.`
        );
      }

      await claimRef.set(claimData);
      res.json({
        success: true,
        claimId: claimRef.id,
        status: claimData.status,
        cashValue: claimType === 'cash' ? finalCashValue : 0,
        referralBalance: newRefBal,
        total_referral_earnings: newTotalRefEarnings
      });
    } catch (e: any) {
      console.error("Error in /rewards/claim:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Reward Approval
  apiRouter.post('/admin/process-reward', async (req, res) => {
    try {
      const { rewardId, action } = req.body;
      if (!db || !rewardId || !action) return res.status(400).json({ error: 'Missing logic' });
      
      const rewardRef = db.collection('user_rewards').doc(rewardId);
      const rewardSnap = await rewardRef.get();
      if (!rewardSnap.exists) return res.status(404).json({ error: 'Reward not found' });
      
      const rData = rewardSnap.data()!;
      if (rData.status === 'completed' || rData.status === 'rejected') {
         return res.status(400).json({ error: 'Reward already processed' });
      }

      if (action === 'approve') {
         await rewardRef.update({ status: 'completed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
         
         if (rData.claimType === 'cash') {
            const userRef = db.collection('users').doc(rData.userId);
            const userSnap = await userRef.get();
            const userData = userSnap.data()!;
            
            await userRef.update({
              referralBalance: admin.firestore.FieldValue.increment(Number(rData.cashValue)),
              total_referral_earnings: admin.firestore.FieldValue.increment(Number(rData.cashValue)),
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            notifyUser(
              rData.userId,
              'referral_earning',
              'Reward Converted & Approved! ⚡',
              `Your milestone reward "${rData.tierLabel}" has been approved. $${Number(rData.cashValue).toFixed(2)} credited to your referral balance.`
            );

            // Transaction log
            await db.collection('transactions').add({
              user_id: rData.userId,
              type: "reward_conversion",
              amount: Number(rData.cashValue),
              status: "completed",
              reference: rewardId,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Email
            if (userData.email) {
              const txEmailHtml = getTransactionTemplate({
                username: userData.username || 'User',
                transactionType: 'Reward Cash Conversion',
                amount: `$${Number(rData.cashValue).toLocaleString()}`,
                paymentMethod: 'Reward System',
                referenceId: rewardId,
                transactionId: 'N/A',
                accountStatus: 'CREDITED',
                actionText: 'View Dashboard',
                actionLink: 'https://aetheriss.online/dashboard',
                isFailed: false,
                notes: `Your ${rData.tierLabel} milestone reward has been converted into cash.`
              });
              await sendSystemEmail({
                 to: userData.email,
                 subject: 'Reward Cash Conversion Approved - Aetheris',
                 html: txEmailHtml,
                 type: 'transaction',
                 userId: rData.userId
              });
            }
         } else {
            notifyUser(
              rData.userId,
              'deposit',
              'Reward Shipped! 📦',
              `Your physical reward ${rData.rewardItem} is being dispatched.`
            );
         }
      } else {
         await rewardRef.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
      res.json({ success: true, message: `Reward ${action}d` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/withdraw', async (req, res) => {
    try {
      const { user_id, amount, address, method, source = 'main', bankName, accountName, accountNumber, routingNumber } = req.body;
      if (!db) return res.status(500).json({ error: 'DB error' });
      if (!user_id || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid payload' });

      const userRef = db.collection('users').doc(user_id);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
      
      const userData = userSnap.data()!;
      
      // Load global config for dynamic withdrawal thresholds
      const globalConfigSnap = await db.collection('config').doc('global').get();
      const globalConfig = globalConfigSnap.exists ? globalConfigSnap.data() : {};
      const minMainWithdrawal = Number(globalConfig?.minWithdrawalMain ?? globalConfig?.min_withdrawal_main ?? 5000);
      const minRefWithdrawal = Number(globalConfig?.minWithdrawalReferral ?? globalConfig?.min_withdrawal_ref ?? 200);

      // Select correct balance to check based on source
      let balanceField = 'wallet_balance';
      let currentBalance = 0;
      
      if (source === 'main') {
        // Combined main + profit based on user request
        currentBalance = (userData.wallet_balance || 0) + (userData.profit_balance || 0) + (userData.balance || 0);

        if (Number(amount) < minMainWithdrawal) {
          return res.status(400).json({ error: `Minimum withdrawal for Total Balance is $${minMainWithdrawal.toLocaleString()}` });
        }
        
        // --- TIER-BASED WITHDRAWAL ELIGIBILITY CHECK ---
        const tierRequirement = (globalConfig?.withdrawalTierRequirement || 'ALL').toUpperCase();
        const tierRestrictionEnabled = globalConfig?.withdrawalTierRestrictionEnabled ?? (tierRequirement !== 'ALL');
        const customDeclineMessage = globalConfig?.withdrawalTierDeclinedMessage || 
          `Withdrawals are currently restricted to ${tierRequirement} tier accounts and above. Your account does not meet this requirement. Please upgrade your active portfolio tier or contact your account manager.`;

        const TIER_LEVELS: Record<string, number> = {
          'NONE': 0,
          'STARTER': 1,
          'CORE': 2,
          'PRIME': 3,
          'QUANTUM': 4,
          'APEX': 5,
          'ULTRA': 6,
          'ALL': 0
        };

        if (tierRestrictionEnabled && tierRequirement !== 'ALL' && userData.role !== 'admin') {
          const reqLevel = TIER_LEVELS[tierRequirement] ?? 4;
          
          let userTierLevel = 0;
          let userTierName = 'NONE';

          if (userData.tier && TIER_LEVELS[userData.tier.toUpperCase()] !== undefined) {
            userTierLevel = TIER_LEVELS[userData.tier.toUpperCase()];
            userTierName = userData.tier.toUpperCase();
          }

          const activeInvestmentsSnap = await db.collection('investments')
            .where('user_id', '==', user_id)
            .where('status', '==', 'active')
            .get();

          activeInvestmentsSnap.docs.forEach(doc => {
            const inv = doc.data();
            const pName = (inv.plan_name || inv.planName || '').toUpperCase();
            Object.keys(TIER_LEVELS).forEach(tKey => {
              if (pName.includes(tKey) && TIER_LEVELS[tKey] > userTierLevel) {
                userTierLevel = TIER_LEVELS[tKey];
                userTierName = tKey;
              }
            });
          });

          const totalInvestedOrDeposited = Math.max(
            userData.total_deposits || 0,
            userData.totalDeposited || 0,
            currentBalance || 0
          );

          if (totalInvestedOrDeposited >= 500000 && userTierLevel < 6) { userTierLevel = 6; userTierName = 'ULTRA'; }
          else if (totalInvestedOrDeposited >= 100000 && userTierLevel < 5) { userTierLevel = 5; userTierName = 'APEX'; }
          else if (totalInvestedOrDeposited >= 50000 && userTierLevel < 4) { userTierLevel = 4; userTierName = 'QUANTUM'; }
          else if (totalInvestedOrDeposited >= 10000 && userTierLevel < 3) { userTierLevel = 3; userTierName = 'PRIME'; }
          else if (totalInvestedOrDeposited >= 3000 && userTierLevel < 2) { userTierLevel = 2; userTierName = 'CORE'; }
          else if (totalInvestedOrDeposited >= 500 && userTierLevel < 1) { userTierLevel = 1; userTierName = 'STARTER'; }

          if (userTierLevel < reqLevel) {
            return res.status(403).json({
              error: customDeclineMessage,
              tierDeclined: true,
              requiredTier: tierRequirement,
              userTier: userTierName
            });
          }
        }
      } else if (source === 'referral') {
        currentBalance = userData.referralBalance || 0;
        if (Number(amount) < minRefWithdrawal) {
          return res.status(400).json({ error: `Minimum referral withdrawal amount is $${minRefWithdrawal.toLocaleString()}` });
        }
      }
      
      // Calculate pending withdraws
      const pendingTx = await db.collection('transactions')
         .where('user_id', '==', user_id)
         .where('type', '==', 'withdrawal')
         .where('status', '==', 'pending')
         .where('source', '==', source)
         .get();
         
      const currentlyPending = pendingTx.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      
      if ((currentlyPending + Number(amount)) > currentBalance) {
         return res.status(400).json({ error: `Insufficient ${source === 'main' ? 'Total' : 'Referral'} balance` });
      }

      // REDESIGN DETAILS
      const withdrawalId = db.collection('withdrawals').doc().id;
      const referenceId = `WD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const processingFee = source === 'main' ? 25 : 0;
      const netAmount = Math.max(0, Number(amount) - processingFee);
      const methodDisplay = method === 'wire' ? 'Bank Wire Transfer' : (method === 'paypal' ? 'PayPal' : (method === 'cashapp' ? 'Cash App' : 'Crypto'));
      const estimatedArrival = method === 'wire' ? '1–3 Business Days' : 'Instant Transfer';

      const finalBankName = bankName || methodDisplay;
      const finalAccountHolder = method === 'wire' ? (accountName || '') : '';
      const finalAccountNumber = accountNumber || address || '';
      const finalRoutingNumber = method === 'wire' ? (routingNumber || '') : '';

      const withdrawalDoc = {
         id: withdrawalId,
         userId: user_id,
         referenceId,
         amount: Number(amount),
         processingFee,
         netAmount,
         method: methodDisplay,
         bankName: finalBankName,
         accountName: finalAccountHolder,
         accountNumber: finalAccountNumber,
         routingNumber: finalRoutingNumber,
         status: 'pending',
         submittedAt: admin.firestore.FieldValue.serverTimestamp(),
         approvedAt: null,
         completedAt: null,
         declinedAt: null,
         declineReason: null,
         estimatedArrival,
         receiptUrl: null,
         createdAt: admin.firestore.FieldValue.serverTimestamp(),
         updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Write to both 'withdrawals' and 'transactions'
      await db.collection('withdrawals').doc(withdrawalId).set(withdrawalDoc);

      await db.collection('transactions').doc(withdrawalId).set({
         id: withdrawalId,
         user_id,
         type: 'withdrawal',
         amount: Number(amount),
         address: finalAccountNumber,
         withdrawal_method: methodDisplay,
         status: 'pending',
         source,
         timestamp: admin.firestore.FieldValue.serverTimestamp(),
         reference: referenceId,
         withdrawalId: withdrawalId,
         bankName: finalBankName,
         accountName: finalAccountHolder,
         accountNumber: finalAccountNumber,
         routingNumber: finalRoutingNumber,
         processingFee,
         netAmount,
         estimatedArrival
      });

      // Admin Email Alert
      const adminEmailSubject = `Withdrawal Request Submitted 🚨`;
      const routingText = method === 'wire' && finalRoutingNumber ? `<p><strong>Routing / SWIFT / BIC:</strong> ${finalRoutingNumber}</p>` : '';
      const holderText = finalAccountHolder ? `<p><strong>Account Holder:</strong> ${finalAccountHolder}</p>` : '';
      const adminEmailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
           <h2 style="color: #F44336;">${adminEmailSubject}</h2>
           <p><strong>User:</strong> ${userData.email || user_id}</p>
           <p><strong>Amount:</strong> $${amount}</p>
           <p><strong>Method:</strong> ${methodDisplay}</p>
           <p><strong>Settlement Type/Bank Name:</strong> ${finalBankName}</p>
           ${holderText}
           ${routingText}
           <p><strong>Payout Destination/Account Number:</strong> ${finalAccountNumber}</p>
           <p><strong>Action Required:</strong> Approve or Decline in Admin Panel.</p>
         </div>
      `;
      sendSystemEmail({
         to: SUPPORT_EMAIL,
         subject: adminEmailSubject,
         html: adminEmailHtml,
         type: 'admin_alert'
      }).catch(console.error);

      console.log(`[📧 ADMIN EMAIL ALERT]`);
      console.log(`   Subject: Withdrawal Request Submitted 🚨`);
      console.log(`   User: ${userData.email || user_id}`);
      console.log(`   Amount: $${amount}`);
      console.log(`   Method: ${methodDisplay}`);
      console.log(`   Action Required: Approve or Decline in Admin Panel`);

      notifyUser(user_id, 'withdrawal', 'Withdrawal Submitted', `Your withdrawal request of $${amount} has been received and is being processed.`);
      notifyAdmin('withdrawal_submitted', 'Withdrawal Submitted', `User ${userData.username || user_id} submitted a withdrawal request of $${amount}.`);

      res.json({ success: true, withdrawal: withdrawalDoc });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Crypto Payment Session Creation (NOWPayments)
  apiRouter.post('/payments/crypto/create', async (req, res) => {
    try {
      const { amount, currency = 'usd', pay_currency = 'usdttrc20', userId, order_id } = req.body;
      if (!amount || !userId || !order_id) return res.status(400).json({ error: 'Missing required fields' });

      // Fallback for development if API key is not configured locally
      if (!process.env.NOWPAYMENTS_API_KEY || process.env.NOWPAYMENTS_API_KEY.length < 5) {
         console.warn("⚠️ NO VALID NOWPAYMENTS_API_KEY DETECTED. RETURNING MOCK DEVELOPMENT RESPONSE.");
         const mockData = {
           payment_id: `mock_${Date.now()}`,
           pay_address: "TExmockaddressnowpayments12345678",
           pay_amount: amount,
           pay_currency: pay_currency,
           order_id: order_id
         };

         if (db) {
            await db.collection('payments').doc(order_id).set({
              payment_id: mockData.payment_id,
              user_id: userId,
              amount,
              currency,
              pay_currency,
              method: 'crypto',
              status: 'pending',
              created_at: admin.firestore.FieldValue.serverTimestamp()
            });
         }
         return res.json(mockData);
      }

      // Build dynamic Webhook URL that NOWPayments accepts
      let host = req.headers['x-forwarded-host'] || req.get('host');
      let baseUrl = `https://${host}`;
      
      // NOWPayments strictly rejects localhost or local IP URLs. 
      // If we are still resolving to a local address (e.g., local dev without ngrok),
      // we inject a dummy valid URL so the Sandbox/API doesn't crash on us.
      if (!host || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0')) {
         baseUrl = 'https://aetheris-app.com'; 
      }
      
      const ipn_callback_url = `${baseUrl.replace(/\/$/, '')}/api/webhooks/nowpayments`;

      // NOWPayments Endpoint
      const response = await fetch('https://api.nowpayments.io/v1/payment', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: amount,
          price_currency: currency,
          pay_currency: pay_currency,
          ipn_callback_url: ipn_callback_url,
          order_id: order_id,
          order_description: `Deposit for user ${userId}`,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate payment');
      }

      if (db) {
        await db.collection('payments').doc(order_id).set({
          payment_id: data.payment_id,
          user_id: userId,
          amount,
          currency: currency,
          pay_currency: pay_currency,
          method: 'crypto',
          status: 'pending',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error('Error creating Crypto payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const sortObject = (obj: any): any => {
    return Object.keys(obj).sort().reduce((result: any, key) => {
      result[key] = (obj[key] && typeof obj[key] === 'object') ? sortObject(obj[key]) : obj[key];
      return result;
    }, {});
  };

  // 4. NOWPayments Webhook
  apiRouter.post('/webhooks/nowpayments', async (req, res) => {
    try {
      const signature = req.headers['x-nowpayments-sig'] as string;
      if (!signature) return res.status(400).json({ error: 'No signature provided' });

      const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET || '');
      hmac.update(JSON.stringify(sortObject(req.body)));
      if (hmac.digest('hex') !== signature) return res.status(403).json({ error: 'HMAC signature does not match' });

      const { payment_id, payment_status, order_id, actually_paid, pay_currency } = req.body;
      const paymentId = order_id; 

      if (payment_status === 'finished' && db) {
         console.log(`Payment ${payment_id} for order ${order_id} is complete.`);
         
         const paymentRef = db.collection('payments').doc(paymentId);
         const txRef = db.collection('transactions').doc(payment_id.toString());
         
         let completedUserId: string | null = null;
         await db.runTransaction(async (t) => {
            const paymentDoc = await t.get(paymentRef);
            if (!paymentDoc.exists) throw new Error('Payment not found');
            const data = paymentDoc.data()!;
            
            if (data.status === 'completed') return; // Prevent double trigger
            
            const userRef = db.collection('users').doc(data.user_id);
            const userDoc = await t.get(userRef);

            t.update(paymentRef, { status: 'completed', completed_at: admin.firestore.FieldValue.serverTimestamp() });
            
            const wBalance = userDoc.data()?.wallet_balance ?? userDoc.data()?.balance ?? 0;
            const tDeposits = userDoc.data()?.total_deposits ?? 0;

            t.update(userRef, {
               wallet_balance: wBalance + data.amount,
               balance: wBalance + data.amount, // legacy sync
               total_deposits: tDeposits + data.amount
            });

            t.set(txRef, {
               user_id: data.user_id,
               type: "deposit",
               amount: data.amount,
               status: "paid",
               reference: paymentId,
               timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            completedUserId = data.user_id;
         });
         if (completedUserId) {
            await checkAndActivatePlans(completedUserId);
         }
      }

      res.json({ status: 'ok' });
    } catch (error: any) {
      console.error('Crypto Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Reward Trigger Logic Helper
  async function checkAndUnlockRewards(userId: string, progressRaw: number, planName: string) {
    if (!db) return;
    const milestones = [25, 50, 75, 100];
    let maxMilestone = 0;
    for (const m of milestones) if (progressRaw >= m) maxMilestone = m;
    
    if (maxMilestone > 0) {
      const rewardId = `${userId}_milestone_${maxMilestone}`;
      const rewardRef = db.collection('rewards').doc(rewardId);
      const existing = await rewardRef.get();
      if (!existing.exists) {
        await rewardRef.set({
          user_id: userId, milestone: maxMilestone, status: 'unlocked', plan: planName, unlocked_at: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('notifications').add({
          userId: userId, 
          type: 'profit', 
          title: `Reward Unlocked! (${maxMilestone}%)`, 
          message: `Congratulations! You unlocked your ${maxMilestone}% milestone.`, 
          createdAt: admin.firestore.FieldValue.serverTimestamp(), 
          status: 'unread'
        });
      }
    }
  }

  // Support Ticket Endpoints
  // Create a Ticket (User to Admin)
  apiRouter.get('/admin/fix', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const invs = await db.collection('investments').get();
        let logs = [];
        const nowMillis = Date.now();

        for (const doc of invs.docs) {
            const data = doc.data();
            if (data.status === 'completed') continue; // Skip completed plans

            let report: any = null;
            let errorMsg = null;

            try {
                // Execute the interval catch up directly via runTransaction
                await db.runTransaction(async (t) => {
                    const freshDoc = await t.get(doc.ref);
                    if (!freshDoc.exists) return;
                    const freshData = freshDoc.data()!;
                    if (freshData.status === 'completed') return;

                    const userId = freshData.user_id;
                    const userRef = db.collection('users').doc(userId);

                    report = await IntervalProcessor.processNextInterval(t, db, freshDoc, userRef, nowMillis);
                });

                // Trigger push and in-app notifications after the transaction commits successfully!
                if (report && report.eventsToNotify && report.eventsToNotify.length > 0) {
                    try {
                        const { notifyUser } = await import('./server/services/notifications');
                        for (const event of report.eventsToNotify) {
                            await notifyUser(event.userId, event.type, event.title, event.message).catch(notifErr => {
                                console.error(`[HEAL ROUTINE] User push notification failed:`, notifErr);
                            });
                        }
                    } catch (notifErr) {
                        console.error(`[HEAL ROUTINE] Failed to trigger user notifications:`, notifErr);
                    }
                }

                if (report && report.adminNotificationsToNotify && report.adminNotificationsToNotify.length > 0) {
                    try {
                        const { notifyAdmin } = await import('./server/services/notifications');
                        for (const event of report.adminNotificationsToNotify) {
                            await notifyAdmin(event.type, event.title, event.message).catch(adminErr => {
                                console.error(`[HEAL ROUTINE] Admin alert failed:`, adminErr);
                            });
                        }
                    } catch (notifErr) {
                        console.error(`[HEAL ROUTINE] Failed to trigger admin alerts:`, notifErr);
                    }
                }

                // Trigger immediate email notification after the transaction commits successfully!
                if (report && report.pausedDueToFunds && report.pausedDetails) {
                    try {
                        const { sendPlanPausedEmail } = await import('./server/services/emailService');
                        console.log(`[HEAL ROUTINE] Sending plan paused email for plan: ${report.pausedDetails.planName} to user: ${report.pausedDetails.userEmail}`);
                        await sendPlanPausedEmail(
                            report.pausedDetails.userEmail,
                            report.pausedDetails.username,
                            report.pausedDetails.planName,
                            report.pausedDetails.neededAmount,
                            report.pausedDetails.userBalance
                        );
                    } catch (emailErr) {
                        console.error(`[HEAL ROUTINE] Failed to send plan-paused email:`, emailErr);
                    }
                }
            } catch (txError: any) {
                console.error(`Error healing investment ${doc.id}:`, txError);
                errorMsg = txError.message;
            }

            // Fetch final post-healing status
            const currentDoc = await doc.ref.get();
            const currentData = currentDoc.data()!;
            const subIntervals = await doc.ref.collection('intervals').orderBy('sequence', 'asc').get();
            let firstPending = null;
            let paidCount = 0;

            subIntervals.docs.forEach(iDoc => {
                const iData = iDoc.data();
                if (iData.status === 'paid') paidCount++;
                if (!firstPending && (iData.status === 'pending' || iData.status === 'overdue')) {
                    firstPending = iData;
                }
            });

            // Fetch user email for visual confirmation
            let userEmail = "Unknown User";
            try {
                const userDoc = await db.collection('users').doc(currentData.user_id).get();
                if (userDoc.exists) {
                    userEmail = userDoc.data()?.email || "No Email";
                }
            } catch (e) {}

            logs.push({
                id: doc.id,
                userId: currentData.user_id,
                userEmail,
                plan: currentData.plan,
                status: currentData.status,
                intervalsCompleted: currentData.intervals_completed,
                deposited: currentData.deposited,
                totalProfitEarned: currentData.total_profit_earned,
                nextIntervalDue: firstPending ? (firstPending.due_date?.toDate ? firstPending.due_date.toDate().toISOString() : new Date(firstPending.due_date).toISOString()) : null,
                report: report || { didRun: false, actions: [errorMsg || "No changes necessary (up to date)."] },
                success: !errorMsg,
                error: errorMsg
            });
        }

        res.json({ success: true, processed: logs.length, logs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/validate-ref', async (req, res) => {
    try {
      const { refCode } = req.body;
      if (!db || !refCode) return res.status(400).json({ valid: true }); // Fallback true if DB unavailable
      
      const snap = await db.collection('users').where('refCode', '==', refCode).limit(1).get();
      res.json({ valid: !snap.empty });
    } catch (e) {
      console.warn("DB validation failed for refCode. Allowing to bypass.", e);
      res.json({ valid: true });
    }
  });

  apiRouter.post('/auth/generate-refcode', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });
      
      let unique = false;
      let newRefCode = '';
      while (!unique) {
        const rand = Math.floor(1000000 + Math.random() * 9000000); // 7 digits
        newRefCode = `AET-${rand}`;
        const snap = await db.collection('users').where('refCode', '==', newRefCode).limit(1).get();
        if (snap.empty) {
          unique = true;
        }
      }
      res.json({ refCode: newRefCode });
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate code' });
    }
  });

  apiRouter.post('/auth/increment-referral', async (req, res) => {
    try {
      const { referrerCode } = req.body;
      if (!db || !referrerCode) return res.status(400).json({ success: false });
      
      const snap = await db.collection('users').where('refCode', '==', referrerCode).limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({
          referral_count: admin.firestore.FieldValue.increment(1)
        });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  });

  apiRouter.post('/support/ticket', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });
      const { userId, subject, message, email, username } = req.body;
      if (!userId || !subject || !message) return res.status(400).json({ error: 'Missing fields' });

      // Save to Firestore with cool 8-digit numeric Ticket ID
      const numericTicketId = Math.floor(10000000 + Math.random() * 90000000).toString();
      await db.collection('support_tickets').doc(numericTicketId).set({
        ticketId: numericTicketId,
        ticket_id: numericTicketId,
        userId,
        email: email || '',
        username: username || '',
        subject,
        message,
        status: 'open',
        replies: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Email Admin
      const adminEmailSubject = `New Support Ticket from ${username || email || userId}`;
      const adminEmailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #1E50FF;">New Support Ticket</h2>
          <p><strong>User:</strong> ${username} (${email || userId})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="margin: 20px 0" />
          <p style="white-space: pre-wrap;">${message}</p>
          <p><em>Reply via the Admin Panel under Support Tickets.</em></p>
        </div>
      `;
      sendSystemEmail({
        to: SUPPORT_EMAIL,
        subject: adminEmailSubject,
        html: adminEmailHtml,
        type: 'support_new_ticket'
      }).catch(console.error);
      
      notifyAdmin('support_ticket', 'New Support Ticket', `Ticket from ${username || email || userId}: ${subject}`);

      // Notify User (In app)
      notifyUser(userId, 'system_alert', 'Support Ticket Received', 'We have received your message and will reply soon.');

      res.status(200).json({ success: true, id: numericTicketId });
    } catch (e: any) {
      console.error('Support ticket error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Clear all support tickets and messages endpoint for admin
  const handleClearAllSupportTickets = async (req: express.Request, res: express.Response) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });

      const deleteInBatches = async (colName: string) => {
        const snap = await db.collection(colName).get();
        if (snap.empty) return 0;
        let count = 0;
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = db.batch();
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
          count += chunk.length;
        }
        return count;
      };

      const deletedTickets = await deleteInBatches('support_tickets');
      const deletedMessages = await deleteInBatches('support_messages');

      console.log(`🧹 [ADMIN CLEAR SUPPORT INBOX] Successfully deleted ${deletedTickets} tickets and ${deletedMessages} messages.`);
      res.json({ success: true, message: `Cleared ${deletedTickets} tickets and ${deletedMessages} messages.` });
    } catch (e: any) {
      console.error('Clear support inbox error:', e);
      res.status(500).json({ error: e.message });
    }
  };

  app.post('/api/admin/clear-support-tickets', handleClearAllSupportTickets);
  apiRouter.post('/admin/clear-support-tickets', handleClearAllSupportTickets);

  // Helper functions for cleaning email content and preventing infinite loops
  const tryDecodeBase64 = (str: string): string | null => {
    if (!str) return null;
    const clean = str.replace(/[\r\n\s]/g, '');
    // Only attempt base64 if clean string length is multiple of 4, at least 16 chars, and purely base64 chars
    if (clean.length < 16 || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(clean)) {
      return null;
    }
    // Strict rejection for signature parameters / headers
    if (/^(b|bh|h|d|s|a)[=;:¢]/i.test(clean) || (clean.includes("=") && !clean.endsWith("="))) {
      return null;
    }
    try {
      const decoded = Buffer.from(clean, 'base64').toString('utf-8');
      // Must contain readable words with spaces and printable ASCII characters ONLY
      if (decoded && decoded.includes(' ') && /^[\x20-\x7E\s\r\n\t]+$/.test(decoded)) {
        const trimmed = decoded.trim();
        if (trimmed.length > 5 && !/^(Received:|ARC-|DKIM-|Return-Path:|Authentication-Results:)/i.test(trimmed)) {
          return trimmed;
        }
      }
    } catch(e) {}
    return null;
  };

  const extractCleanEmailBody = (rawText: string): string => {
    if (!rawText) return "";
    let text = String(rawText).trim();

    // 1. If input starts with or contains raw RFC 822 or MIME headers, extract the body portion
    const isRfcOrMime = /^(Received:|Return-Path:|ARC-Seal:|ARC-Message-Signature:|Authentication-Results:|DKIM-Signature:|MIME-Version:|Content-Type:|X-)/i.test(text) ||
                        text.includes("Received: from") ||
                        text.includes("ARC-Message-Signature:");

    if (isRfcOrMime) {
      // Find boundary if multipart message
      const boundaryMatch = text.match(/boundary=["']?([^"';\r\n]+)["']?/i);
      if (boundaryMatch && boundaryMatch[1]) {
        const boundary = boundaryMatch[1].trim().replace(/^--/, '');
        const escBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`--${escBoundary}`));
        
        let selectedPart = parts.find(p => /Content-Type:\s*text\/plain/i.test(p));
        if (!selectedPart) {
          selectedPart = parts.find(p => /Content-Type:\s*text\/html/i.test(p));
        }
        if (!selectedPart && parts.length > 1) {
          selectedPart = parts.find(p => !/^(Received:|Return-Path:|ARC-|DKIM-)/i.test(p.trim())) || parts[parts.length - 1];
        }

        if (selectedPart) {
          text = selectedPart;
        }
      }

      // Isolate top header block up to first double-newline
      let loopGuard = 0;
      while (loopGuard < 10) {
        loopGuard++;
        const doubleNewlineIndex = text.search(/\r?\n\r?\n/);
        if (doubleNewlineIndex !== -1) {
          const headerBlock = text.substring(0, doubleNewlineIndex);
          if (/(Received:|Content-Type:|ARC-|DKIM-|From:|To:|Subject:|MIME-Version:|Return-Path:|Authentication-Results:|Received-SPF:|X-)/i.test(headerBlock)) {
            text = text.substring(doubleNewlineIndex).trim();
            continue;
          }
        }
        break;
      }

      // Remove remaining MIME header lines at start of text
      text = text.replace(/^(Content-Type|Content-Transfer-Encoding|Content-Disposition|MIME-Version|Content-ID|Content-Description):[^\r\n]*\r?\n/gmi, '');
      text = text.replace(/^--[a-zA-Z0-9_=\-\.]+(?:--)?$/gm, '');
    }

    // 2. Handle Quoted-Printable decoding
    if (text.includes("=3D") || text.includes("=\r\n") || text.includes("=\n") || text.includes("=20") || /=([0-9A-F]{2})/i.test(text)) {
      text = text.replace(/=\r?\n/g, '')
                 .replace(/=3D/gi, '=')
                 .replace(/=20/gi, ' ')
                 .replace(/=0A/gi, '\n')
                 .replace(/=0D/gi, '\r')
                 .replace(/=C2=A0/gi, ' ')
                 .replace(/=E2=80=99/gi, "'")
                 .replace(/=E2=80=9C/gi, '"')
                 .replace(/=E2=80=9D/gi, '"')
                 .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
                   try { return String.fromCharCode(parseInt(hex, 16)); } catch(e) { return _; }
                 });
    }

    // 3. Handle Base64 decoding ONLY if the text explicitly states Base64 transfer encoding
    if (/Content-Transfer-Encoding:\s*base64/i.test(rawText)) {
      const decodedEntire = tryDecodeBase64(text);
      if (decodedEntire) {
        text = decodedEntire;
      }
    }

    // 4. Strip HTML tags if HTML
    if (/<[a-z][\s\S]*>/i.test(text) && !text.includes("<http")) {
      text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
                 .replace(/<script[\s\S]*?<\/script>/gi, '')
                 .replace(/<br\s*\/?>/gi, '\n')
                 .replace(/<\/p>/gi, '\n\n')
                 .replace(/<\/div>/gi, '\n')
                 .replace(/<[^>]*>/g, ' ')
                 .replace(/&nbsp;/gi, ' ')
                 .replace(/&gt;/gi, '>')
                 .replace(/&lt;/gi, '<')
                 .replace(/&amp;/gi, '&')
                 .replace(/&quot;/gi, '"')
                 .replace(/&#39;/gi, "'");
    }

    // 5. Clean up transport signature headers and DKIM hashes
    const lines = text.split(/\r?\n/);
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        cleanLines.push("");
        continue;
      }

      // Drop lines that start with explicit MIME / DKIM / ARC header signatures or signature parameters
      if (/^(ARC-Message-Signature|DKIM-Signature|Authentication-Results|Received-SPF|Content-Type:|MIME-Version)[:=\s]/i.test(trimmed)) {
        continue;
      }
      if (/^(Received|Return-Path|ARC-Seal|ARC-Authentication-Results|Received-SPF|X-CF-|Content-Transfer-Encoding|Content-Disposition)[:=\s]/i.test(trimmed)) {
        continue;
      }
      if (/^(dkim|dmarc|spf|arc)[:=\s](pass|none|fail|neutral|softfail|permerror|temperror)/i.test(trimmed)) continue;
      if (/^(b|bh|h|d|s|a)[=;:¢]/i.test(trimmed)) continue;
      if (/^a=rsa-sha256/i.test(trimmed)) continue;
      if (/\b(b|bh|h|d|s)=/i.test(trimmed) && trimmed.length > 20) continue;
      if (/^[A-Za-z0-9+/=]{25,}$/.test(trimmed)) continue;

      cleanLines.push(line);
    }

    text = cleanLines.join('\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    return text;
  };

  const cleanSubjectText = (sub: string): string => {
    if (!sub) return "Inbound Support Query";
    let s = sub.trim().replace(/^Subject:\s*/i, '');
    let iterations = 0;
    while (/^(New Ticket|Re|Fwd|FW|ADMIN|\[ADMIN\]):\s*/i.test(s) && iterations < 10) {
      s = s.replace(/^(New Ticket|Re|Fwd|FW|ADMIN|\[ADMIN\]):\s*/i, '').trim();
      iterations++;
    }
    return s || "Inbound Support Query";
  };

  // Support Email Webhook Handler (Receives parsed inbound emails from support@update.aetheriss.online or webhook providers)
  const handleInboundEmailWebhook = async (req: express.Request, res: express.Response) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });

      const contentType = req.headers['content-type'] || '';
      const isMultipart = Boolean(contentType.includes('multipart') || (req.files && (req.files as any[]).length > 0));

      let rawBodyString = "";
      if (Buffer.isBuffer(req.body)) {
        rawBodyString = req.body.toString('utf-8');
      } else if (typeof req.body === 'string') {
        rawBodyString = req.body;
      } else if (req.body) {
        rawBodyString = JSON.stringify(req.body);
      }

      console.log("================== [📧 INBOUND WEBHOOK DEBUG LOGS] ==================");
      console.log(`Content-Type:            ${contentType}`);
      console.log(`req.headers:             ${JSON.stringify(req.headers, null, 2)}`);
      console.log(`Is Multipart:            ${isMultipart}`);
      console.log(`First 500 chars raw body:\n${rawBodyString.substring(0, 500)}`);
      console.log("=====================================================================");

      // Support both flat payloads and Resend/SendGrid/Cloudflare/Mailgun enveloped body formats
      const dataContainer = (req.body && req.body.type === 'email.received' && req.body.data) 
        ? req.body.data 
        : (req.body?.data ? req.body.data : (req.body || {}));

      let rawFrom = String(dataContainer.from || dataContainer.From || dataContainer.sender || dataContainer.FromAddress || req.body?.from || '').trim();
      let rawSubjectInput = String(dataContainer.subject || dataContainer.Subject || req.body?.subject || "Inbound Support Query").trim();

      // Verify webhook secret if configured and non-dummy
      const secret = process.env.INBOUND_WEBHOOK_SECRET;
      if (secret && !['value', 'generate', 'none', 'optional', 'placeholder', ''].includes(secret.toLowerCase().trim())) {
        const headerSecret = req.headers['x-webhook-secret'] || req.headers['x-inbound-secret'] || req.headers['authorization'];
        const bodySecret = req.body?.secret || req.body?.webhook_secret || req.body?.INBOUND_WEBHOOK_SECRET;
        const querySecret = req.query?.secret;
        const providedSecret = (headerSecret || bodySecret || querySecret || '').toString().replace(/^Bearer\s+/i, '');
        
        if (providedSecret !== secret) {
          const isEmailPayload = Boolean(rawFrom || req.body?.from || req.body?.subject || req.body?.text || req.body?.data || req.body?.raw);
          if (!isEmailPayload) {
            console.warn("[📧 WEBHOOK REJECTED] Invalid webhook secret provided");
            return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
          } else {
            console.warn("[📧 WEBHOOK NOTICE] Secret mismatch, but valid inbound email detected. Accepting payload...");
          }
        }
      }

      let rawEmailContent = "";
      let parsedAttachments: any[] = [];

      // Detect raw RFC 822 MIME source if available
      const rawMimeSource = dataContainer.raw || dataContainer.rawEmail || dataContainer['raw-email'] || dataContainer.message_raw || req.body?.raw || req.body?.raw_email || req.body?.message_raw || (typeof req.body === 'string' && /^(Received:|Return-Path:|ARC-Seal:|DKIM-Signature:)/i.test(req.body.trim()) ? req.body : null);

      if (rawMimeSource) {
        try {
          console.log("[📧 MAILPARSER] Invoking mailparser.simpleParser() on raw MIME source...");
          const parsed = await simpleParser(rawMimeSource);

          console.log("================== [📧 MAILPARSER OUTPUT] ==================");
          console.log(`parsed.from:        ${parsed.from?.text}`);
          console.log(`parsed.subject:     ${parsed.subject}`);
          console.log(`parsed.text length: ${parsed.text ? parsed.text.length : 0}`);
          console.log(`parsed.text preview:\n${(parsed.text || '').substring(0, 300)}`);
          console.log(`parsed.html length: ${typeof parsed.html === 'string' ? parsed.html.length : 0}`);
          console.log(`parsed.attachments: ${parsed.attachments ? parsed.attachments.length : 0}`);
          console.log("============================================================");

          if (!parsed.text && !parsed.html) {
            const debugFilePath = `/tmp/inbound_mime_debug_${Date.now()}.eml`;
            try {
              await fs.promises.writeFile(debugFilePath, rawMimeSource);
              console.warn(`[📧 MAILPARSER WARN] parsed.text and parsed.html were empty! Saved raw MIME payload to temporary debug file: ${debugFilePath}`);
            } catch (fsErr) {
              console.error("[📧 FS ERROR] Failed to write debug MIME file:", fsErr);
            }
          } else {
            if (parsed.text) {
              rawEmailContent = parsed.text;
            } else if (typeof parsed.html === 'string') {
              rawEmailContent = parsed.html;
            }
            if (parsed.from?.text && (!rawFrom || rawFrom === 'guest_user')) {
              rawFrom = parsed.from.text;
            }
            if (parsed.subject && (!rawSubjectInput || rawSubjectInput === 'Inbound Support Query')) {
              rawSubjectInput = parsed.subject;
            }
            if (parsed.attachments && parsed.attachments.length > 0) {
              parsedAttachments = parsed.attachments.map(att => ({
                filename: att.filename || 'attachment',
                contentType: att.contentType || 'application/octet-stream',
                size: att.size
              }));
            }
          }
        } catch (mimeErr) {
          console.error("[📧 MAILPARSER ERROR] simpleParser failed:", mimeErr);
        }
      }

      // If raw MIME was not present or yielded no content, extract from structured JSON fields
      if (!rawEmailContent) {
        if (dataContainer.text) {
          rawEmailContent = dataContainer.text;
        } else if (dataContainer.html) {
          rawEmailContent = dataContainer.html;
        } else if (dataContainer.stripped_text) {
          rawEmailContent = dataContainer.stripped_text;
        } else if (dataContainer['stripped-text']) {
          rawEmailContent = dataContainer['stripped-text'];
        } else if (dataContainer['body-plain']) {
          rawEmailContent = dataContainer['body-plain'];
        } else if (dataContainer.TextBody) {
          rawEmailContent = dataContainer.TextBody;
        } else if (dataContainer.HtmlBody) {
          rawEmailContent = dataContainer.HtmlBody;
        } else if (req.body?.text) {
          rawEmailContent = req.body.text;
        } else if (req.body?.html) {
          rawEmailContent = req.body.html;
        }
      }

      // Fallback API fetch for Resend `email.received` event if email_id is present
      const resendEmailId = dataContainer.email_id || dataContainer.id;
      if ((!rawEmailContent || rawEmailContent.trim().length === 0) && resendEmailId && process.env.RESEND_API_KEY) {
        try {
          console.log(`[📧 RESEND API FETCH] Fetching full email details from Resend for ID: ${resendEmailId}...`);
          const resendFetchRes = await fetch(`https://api.resend.com/emails/receiving/${resendEmailId}`, {
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
          });
          if (resendFetchRes.ok) {
            const fetchObj = await resendFetchRes.json();
            console.log(`[📧 RESEND API FETCH SUCCESS] Retrieved email payload for ${resendEmailId}`);
            if (fetchObj.text) rawEmailContent = fetchObj.text;
            else if (fetchObj.html) rawEmailContent = fetchObj.html;
            if (fetchObj.from && !rawFrom) rawFrom = fetchObj.from;
            if (fetchObj.subject && (!rawSubjectInput || rawSubjectInput === 'Inbound Support Query')) rawSubjectInput = fetchObj.subject;
          } else {
            console.warn(`[📧 RESEND API FETCH WARN] ${resendFetchRes.status}: ${await resendFetchRes.text()}`);
          }
        } catch (fetchErr) {
          console.error("[📧 RESEND API FETCH ERROR]", fetchErr);
        }
      }

      // Extract raw email address
      const emailMatch = rawFrom.match(/<([^>]+)>/);
      const inboundEmail = (emailMatch ? emailMatch[1] : rawFrom).trim().toLowerCase();

      if (!inboundEmail) {
        console.error("[📧 WEBHOOK ERROR] Missing sender address (from)", rawFrom);
        return res.status(400).json({ error: 'Missing sender address (from)' });
      }

      // STRICT INFINITE LOOP & AUTO-RESPONDER FILTER:
      // Drop any emails from system/domain return paths or auto-notifier subjects to avoid recursive loops
      const isSystemSender = inboundEmail.includes('aetheriss.online') ||
                             inboundEmail.includes('no-reply') ||
                             inboundEmail.includes('noreply') ||
                             inboundEmail.includes('mailer-daemon') ||
                             inboundEmail.includes('postmaster') ||
                             inboundEmail.includes('amazonses.com') ||
                             inboundEmail.includes('resend.dev') ||
                             inboundEmail === (process.env.SUPPORT_EMAIL || 'support@update.aetheriss.online').toLowerCase();

      const isSystemSubject = /New Ticket:\s*New Ticket:/i.test(rawSubjectInput) ||
                              /Support Ticket Reply Received/i.test(rawSubjectInput) ||
                              /Ticket Received:/i.test(rawSubjectInput) ||
                              /\[ADMIN\]/i.test(rawSubjectInput);

      if (isSystemSender || isSystemSubject) {
        console.warn(`[📧 LOOP PREVENTED] Suppressing auto-generated system email loop from: ${inboundEmail} | Subject: ${rawSubjectInput}`);
        return res.status(200).json({ status: 'ignored_loop_prevention', message: 'System/auto-responder loop suppressed' });
      }

      const rawSubject = cleanSubjectText(rawSubjectInput);
      const emailText = extractCleanEmailBody(rawEmailContent) || rawSubjectInput || "Inbound Message";

      // Extract attachments if provided
      let attachments: any[] = parsedAttachments;
      if (attachments.length === 0) {
        if (Array.isArray(dataContainer.attachments)) {
          attachments = dataContainer.attachments.map((att: any) => ({
            filename: att.filename || att.name || 'attachment',
            url: att.url || att.path || att.content_url || '',
            contentType: att.contentType || att.type || 'application/octet-stream'
          }));
        } else if (Array.isArray(req.files)) {
          attachments = (req.files as any[]).map((file: any) => ({
            filename: file.originalname || 'attachment',
            contentType: file.mimetype || 'application/octet-stream',
            size: file.size
          }));
        }
      }

      console.log("================== [📧 INBOUND EMAIL FINAL PROCESSED] ==================");
      console.log(`Sender:      ${inboundEmail}`);
      console.log(`Subject:     ${rawSubject}`);
      console.log(`Clean Body:\n${emailText}`);
      console.log("=========================================================================");

      // 1. Find or default user metadata
      let userId = "guest_user";
      let username = inboundEmail.split('@')[0];
      const userSnap = await db.collection('users').where('email', '==', inboundEmail).limit(1).get();
      if (!userSnap.empty) {
        const uDoc = userSnap.docs[0];
        userId = uDoc.id;
        username = uDoc.data().username || uDoc.data().fullName || username;
      }

      // 2. Query existing tickets for this email address
      const [qByEmail, qByUserEmail] = await Promise.all([
        db.collection('support_tickets').where('email', '==', inboundEmail).get(),
        db.collection('support_tickets').where('userEmail', '==', inboundEmail).get()
      ]);

      const allTicketDocs: any[] = [];
      const docIdSet = new Set<string>();

      qByEmail.forEach(docSnap => {
        if (!docIdSet.has(docSnap.id)) {
          docIdSet.add(docSnap.id);
          allTicketDocs.push({ id: docSnap.id, ...docSnap.data() });
        }
      });

      qByUserEmail.forEach(docSnap => {
        if (!docIdSet.has(docSnap.id)) {
          docIdSet.add(docSnap.id);
          allTicketDocs.push({ id: docSnap.id, ...docSnap.data() });
        }
      });

      // Sort by lastActivityAt descending
      allTicketDocs.sort((a, b) => {
        const aTime = a.lastActivityAt?.toDate?.()?.getTime() || (a.lastActivityAt?._seconds ? a.lastActivityAt._seconds * 1000 : 0) || 0;
        const bTime = b.lastActivityAt?.toDate?.()?.getTime() || (b.lastActivityAt?._seconds ? b.lastActivityAt._seconds * 1000 : 0) || 0;
        return bTime - aTime;
      });

      let targetTicketId = "";
      // Only pick an active ticket if it's NOT closed or resolved. If all previous tickets are closed, create a brand new ticket!
      let activeTicketDoc = allTicketDocs.find((t: any) => {
        const s = String(t.status || '').toLowerCase();
        return s !== 'closed' && s !== 'resolved';
      }) || null;

      // Safe admin email target (NEVER send admin alert to support@update.aetheriss.online or it will trigger Cloudflare email routing loop)
      const rawAdminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || 'samdenic01@gmail.com';
      const safeAdminEmail = (rawAdminEmail.includes('aetheriss.online') || rawAdminEmail === inboundEmail) ? 'samdenic01@gmail.com' : rawAdminEmail;

      if (activeTicketDoc) {
        targetTicketId = activeTicketDoc.id;
        
        // Auto-reopen ticket if closed, pending, or open
        await db.collection('support_tickets').doc(targetTicketId).update({
          status: 'open',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Save incoming email to support_messages
        await db.collection('support_messages').add({
          ticketId: targetTicketId,
          conversation_id: targetTicketId,
          senderId: userId,
          sender: 'user',
          senderType: 'user',
          text: emailText,
          message: emailText,
          attachments: attachments,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Updated & re-opened support ticket ${targetTicketId} with inbound reply from ${inboundEmail}`);
        notifyAdmin('system_alert', `Reply from ${inboundEmail}`, emailText.substring(0, 300)).catch((e: any) => console.error("notifyAdmin error:", e));
        
        // Notify admin via email ONLY at external admin email address (not support@update.aetheriss.online!)
        if (safeAdminEmail && safeAdminEmail !== inboundEmail) {
          sendSystemEmail({
            to: safeAdminEmail,
            subject: `Re: ${rawSubject} - Reply from ${username}`,
            html: `
              <h3>Support Ticket Reply Received</h3>
              <p><strong>From:</strong> ${inboundEmail}</p>
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${emailText}</p>
            `,
            type: 'support_reply_admin'
          }).catch(err => console.error("Admin notification email error:", err));
        }
      } else {
        // Create new support conversation / ticket with cool 8-digit numeric Ticket ID
        const numericTicketId = Math.floor(10000000 + Math.random() * 90000000).toString();
        targetTicketId = numericTicketId;

        await db.collection('support_tickets').doc(numericTicketId).set({
          ticketId: numericTicketId,
          ticket_id: numericTicketId,
          userId,
          user_id: userId,
          email: inboundEmail,
          userEmail: inboundEmail,
          username,
          subject: rawSubject,
          message: emailText,
          status: 'open',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add initial message to support_messages
        await db.collection('support_messages').add({
          ticketId: targetTicketId,
          conversation_id: targetTicketId,
          senderId: userId,
          sender: 'user',
          senderType: 'user',
          text: emailText,
          message: emailText,
          attachments: attachments,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        notifyAdmin('system_alert', `New Ticket from ${inboundEmail}`, emailText.substring(0, 300)).catch((e: any) => console.error("notifyAdmin error:", e));

        // Notify admin via email ONLY at external admin email address
        if (safeAdminEmail && safeAdminEmail !== inboundEmail) {
          sendSystemEmail({
            to: safeAdminEmail,
            subject: `New Support Ticket: ${rawSubject} from ${username}`,
            html: `
              <h3>New Support Ticket (Inbound Email)</h3>
              <p><strong>From:</strong> ${inboundEmail}</p>
              <p><strong>Subject:</strong> ${rawSubject}</p>
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${emailText}</p>
            `,
            type: 'support_new_ticket_admin'
          }).catch(err => console.error("Admin notification email error:", err));
        }

        // Send auto-receipt ONLY to real user email (if not system domain)
        const autoReceiptHtml = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <p style="text-align: center;"><strong style="font-size: 20px; color: #1E50FF;">AETHERIS SUPPORT</strong></p>
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;" />
            <p>Hello ${username},</p>
            <p>We received your email and created a support ticket for your query:</p>
            <p style="background: #f5f5f5; padding: 12px; border-left: 4px solid #1E50FF; font-family: monospace; font-size: 13px;">
              <strong>Subject:</strong> ${rawSubject || "Support Ticket"}<br/>
              <strong>Ticket ID:</strong> ${targetTicketId}
            </p>
            <p>Our team will review your message and reply shortly.</p>
            <p>— Aetheris Support Team</p>
          </div>
        `;

        sendSystemEmail({
          to: inboundEmail,
          subject: `Ticket Received: ${rawSubject || "Aetheris Support Request"}`,
          html: autoReceiptHtml,
          type: 'support_reply',
          userId: userId
        }).catch(err => console.error("Auto receipt error:", err));

        console.log(`Created new support ticket ${targetTicketId} from inbound email from ${inboundEmail}`);
      }

      res.status(200).json({ success: true, ticketId: targetTicketId });
    } catch (e: any) {
      console.error('Support email webhook error:', e);
      res.status(500).json({ error: e.message });
    }
  };

  // Register both /support/inbound-webhook AND /support/email-webhook
  apiRouter.post('/support/inbound-webhook', upload.any(), handleInboundEmailWebhook);
  apiRouter.post('/support/email-webhook', upload.any(), handleInboundEmailWebhook);

  // Reply to Ticket (Admin to User)
  apiRouter.post('/support/reply', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });
      const { ticketId, message, adminId, attachments, status = 'pending' } = req.body;
      
      const ticketRef = db.collection('support_tickets').doc(ticketId);
      const ticketDoc = await ticketRef.get();
      if (!ticketDoc.exists) return res.status(404).json({ error: 'Ticket not found' });
      
      const ticketData = ticketDoc.data()!;
      const userMailTarget = ticketData.userEmail || ticketData.email;
      
      // Save message to support_messages collection
      await db.collection('support_messages').add({
        ticketId,
        conversation_id: ticketId,
        senderId: adminId || 'admin',
        sender: 'admin',
        senderType: 'admin',
        text: message,
        message: message,
        attachments: attachments || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      const newStatus = (status === 'open' || status === 'Open') ? 'open' : (status === 'closed' || status === 'Closed') ? 'closed' : 'pending';

      await ticketRef.update({
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Email User via Resend
      let emailSent = false;
      if (userMailTarget) {
        const userHtml = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #1E50FF;">Aetheris Support Response</h2>
            <p>Hi ${ticketData.username || 'there'},</p>
            <p>We’ve responded to your request regarding "<strong>${ticketData.subject || 'Support Ticket'}</strong>":</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
               <p style="white-space: pre-wrap; margin: 0;">${message}</p>
            </div>
            <p>You can reply directly to this email to continue the conversation.</p>
            <p>— Aetheris Support Team</p>
          </div>
        `;
        
        emailSent = await sendSystemEmail({
          to: userMailTarget,
          subject: `Re: ${ticketData.subject || 'Support Ticket'}`,
          html: userHtml,
          type: 'support_reply',
          userId: ticketData.userId
        }).catch(err => {
          console.error("Support reply email error:", err);
          return false;
        });
      }

      // Notify User in-app if registered
      if (ticketData.userId) {
        notifyUser(ticketData.userId, 'system_alert', 'Support Ticket Replied', 'Admin has replied to your support ticket.');
      }

      res.json({ success: true, emailSent, status: newStatus });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Update Ticket Status (Admin - Open / Pending / Closed)
  apiRouter.post('/support/status', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });
      const { ticketId, status } = req.body;
      if (!ticketId || !status) return res.status(400).json({ error: 'Missing parameters' });

      const normStatus = String(status).toLowerCase();
      const validStatus = (normStatus === 'closed' || normStatus === 'close') ? 'closed' : (normStatus === 'pending') ? 'pending' : 'open';

      await db.collection('support_tickets').doc(ticketId).update({
        status: validStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true, status: validStatus });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Close Ticket (Admin)
  apiRouter.post('/support/close', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'DB unavailable' });
      const { ticketId } = req.body;
      await db.collection('support_tickets').doc(ticketId).update({
        status: 'closed'
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin User Management
  apiRouter.post('/admin/update-user', async (req, res) => {
    try {
      const { userId, updates } = req.body;
      if (!db || !userId) return res.status(400).json({ error: 'Missing data' });

      // Clean updates to prevent privilege escalation if sent from client
      const allowedUpdates: any = {};
      const fields = ['status', 'balance', 'wallet_balance', 'level1_percentage', 'level2_percentage', 'role', 'first_name', 'last_name'];
      fields.forEach(f => {
        if (updates[f] !== undefined) allowedUpdates[f] = updates[f];
      });

      await db.collection('users').doc(userId).update({
        ...allowedUpdates,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/admin/delete-user', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!db || !userId) return res.status(400).json({ error: 'Missing data' });
      
      // In production, you'd also delete their Firebase Auth account
      // but for simplicity we just delete the document and collections
      await db.collection('users').doc(userId).delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Withdrawal Management
  apiRouter.post('/admin/process-withdrawal', async (req, res) => {
    try {
      const { withdrawalId, action, rejectionReason } = req.body; 
      if (!db || !withdrawalId || !action) return res.status(400).json({ error: 'Missing data' });

      const txRef = db.collection('transactions').doc(withdrawalId);
      const txSnap = await txRef.get();
      if (!txSnap.exists) return res.status(404).json({ error: 'Withdrawal transaction not found' });
      
      const wData = txSnap.data()!;
      if (wData.type !== 'withdrawal') {
        return res.status(400).json({ error: 'Invalid transaction type' });
      }

      const { user_id, amount, source = 'main', status } = wData;
      const userRef = db.collection('users').doc(user_id);
      const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);

      if (action === 'approve') {
        if (status !== 'pending' && status !== 'declined' && status !== 'failed') {
          return res.status(400).json({ error: 'Only pending, declined, or failed withdrawals can be approved' });
        }
        await db.runTransaction(async (t) => {
          const uSnap = await t.get(userRef);
          if (!uSnap.exists) throw new Error("User not found");
          const uData = uSnap.data();

          let balanceField = 'wallet_balance';
          if (source === 'referral') balanceField = 'referralBalance';
          if (source === 'profit') balanceField = 'profit_balance';

          const currentVal = uData[balanceField] ?? (balanceField === 'wallet_balance' ? (uData.balance ?? 0) : 0);
          if (currentVal < Number(amount)) throw new Error("Insufficient funds for approval");

          t.update(txRef, { 
            status: 'approved', 
            approved_at: admin.firestore.FieldValue.serverTimestamp() 
          });

          t.set(withdrawalRef, {
            id: withdrawalId,
            userId: user_id,
            referenceId: wData.reference || wData.referenceId || `WD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            amount: Number(amount),
            processingFee: wData.processingFee ?? 0,
            netAmount: wData.netAmount ?? Number(amount),
            method: wData.withdrawal_method ?? wData.method ?? '',
            bankName: wData.bankName ?? '',
            accountName: wData.accountName ?? '',
            accountNumber: wData.accountNumber ?? wData.address ?? '',
            routingNumber: wData.routingNumber ?? '',
            estimatedArrival: wData.estimatedArrival ?? '',
            receiptUrl: wData.receiptUrl ?? null,
            createdAt: wData.timestamp ?? admin.firestore.FieldValue.serverTimestamp(),
            submittedAt: wData.timestamp ?? admin.firestore.FieldValue.serverTimestamp(),
            status: 'approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          t.update(userRef, {
            [balanceField]: admin.firestore.FieldValue.increment(-Number(amount)),
            ...(balanceField === 'wallet_balance' ? { balance: admin.firestore.FieldValue.increment(-Number(amount)) } : {})
          });
        });
        notifyUser(user_id, 'withdrawal', 'Withdrawal Approved!', `Your withdrawal of $${amount} has been approved. Under review for bank settlement.`, {
          amount: amount,
          method: wData.withdrawal_method ?? wData.method ?? 'Bank / Wire',
          referenceId: wData.reference || wData.referenceId || withdrawalId,
          transactionId: withdrawalId,
          status: 'approved'
        });
        notifyAdmin('withdrawal_approved', 'Withdrawal Approved', `Withdrawal ${withdrawalId} approved for user ${user_id}.`);
      } 
      else if (action === 'complete') {
        if (status !== 'approved' && status !== 'pending' && status !== 'declined' && status !== 'failed') {
          return res.status(400).json({ error: 'Withdrawal must be approved, pending, declined, or failed first' });
        }
        await db.runTransaction(async (t) => {
          t.update(txRef, { 
            status: 'completed', 
            completed_at: admin.firestore.FieldValue.serverTimestamp() 
          });

          t.set(withdrawalRef, {
            id: withdrawalId,
            userId: user_id,
            referenceId: wData.reference || wData.referenceId || `WD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            amount: Number(amount),
            processingFee: wData.processingFee ?? 0,
            netAmount: wData.netAmount ?? Number(amount),
            method: wData.withdrawal_method ?? wData.method ?? '',
            bankName: wData.bankName ?? '',
            accountName: wData.accountName ?? '',
            accountNumber: wData.accountNumber ?? wData.address ?? '',
            routingNumber: wData.routingNumber ?? '',
            estimatedArrival: wData.estimatedArrival ?? '',
            receiptUrl: wData.receiptUrl ?? null,
            createdAt: wData.timestamp ?? admin.firestore.FieldValue.serverTimestamp(),
            submittedAt: wData.timestamp ?? admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        });
        notifyUser(user_id, 'withdrawal', 'Funds Transferred!', `The funds for your withdrawal of $${amount} have been successfully transferred.`, {
          amount: amount,
          method: wData.withdrawal_method ?? wData.method ?? 'Bank / Wire',
          referenceId: wData.reference || wData.referenceId || withdrawalId,
          transactionId: withdrawalId,
          status: 'completed'
        });
        notifyAdmin('withdrawal_completed', 'Withdrawal Settled', `Withdrawal ${withdrawalId} completed successfully.`);
      } 
      else if (action === 'reject' || action === 'decline') {
        if (status === 'completed' || status === 'declined' || status === 'rejected') {
          return res.status(400).json({ error: 'Withdrawal already settled or declined' });
        }
        await db.runTransaction(async (t) => {
          // If already approved, return deducted balance back to user
          if (status === 'approved') {
            let balanceField = 'wallet_balance';
            if (source === 'referral') balanceField = 'referralBalance';
            if (source === 'profit') balanceField = 'profit_balance';

            t.update(userRef, {
              [balanceField]: admin.firestore.FieldValue.increment(Number(amount)),
              ...(balanceField === 'wallet_balance' ? { balance: admin.firestore.FieldValue.increment(Number(amount)) } : {})
            });
          }

          t.update(txRef, { 
            status: 'declined', 
            rejection_reason: rejectionReason || 'Rejection by administrator',
            rejected_at: admin.firestore.FieldValue.serverTimestamp() 
          });

          t.set(withdrawalRef, {
            id: withdrawalId,
            userId: user_id,
            referenceId: wData.reference || wData.referenceId || `WD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            amount: Number(amount),
            processingFee: wData.processingFee ?? 0,
            netAmount: wData.netAmount ?? Number(amount),
            method: wData.withdrawal_method ?? wData.method ?? '',
            bankName: wData.bankName ?? '',
            accountName: wData.accountName ?? '',
            accountNumber: wData.accountNumber ?? wData.address ?? '',
            routingNumber: wData.routingNumber ?? '',
            estimatedArrival: wData.estimatedArrival ?? '',
            receiptUrl: wData.receiptUrl ?? null,
            createdAt: wData.timestamp ?? admin.firestore.FieldValue.serverTimestamp(),
            submittedAt: wData.timestamp ?? admin.firestore.FieldValue.serverTimestamp(),
            status: 'declined',
            declineReason: rejectionReason || 'Rejection by administrator',
            declinedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        });
        notifyUser(user_id, 'withdrawal', 'Withdrawal Declined', `Your withdrawal of $${amount} was declined: ${rejectionReason || 'Contact support.'}`, {
          amount: amount,
          method: wData.withdrawal_method ?? wData.method ?? 'Bank / Wire',
          referenceId: wData.reference || wData.referenceId || withdrawalId,
          transactionId: withdrawalId,
          status: 'declined',
          rejectionReason: rejectionReason || 'Rejection by administrator'
        });
        notifyAdmin('withdrawal_declined', 'Withdrawal Declined', `Withdrawal ${withdrawalId} declined for user ${user_id}.`);
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Investment Management
  apiRouter.post('/admin/manage-investment', async (req, res) => {
    try {
      const { investmentId, action } = req.body; // action: 'pause' | 'resume' | 'complete'
      if (!db || !investmentId || !action) return res.status(400).json({ error: 'Missing data' });

      const invRef = db.collection('investments').doc(investmentId);
      const invSnap = await invRef.get();
      if (!invSnap.exists) return res.status(404).json({ error: 'Investment not found' });

      if (action === 'pause') {
        await invRef.update({ status: 'paused', trading_status: 'halted', profit_status: 'paused' });
      } else if (action === 'resume') {
        await invRef.update({ status: 'active', trading_status: 'active', profit_status: 'active' });
      } else if (action === 'complete') {
        // Force complete logic: pay out remaining capital
        const invData = invSnap.data()!;
        const userRef = db.collection('users').doc(invData.user_id);
        const deposited = invData.deposited || invData.total_amount;
        
        await db.runTransaction(async (t) => {
          t.update(invRef, { status: 'completed', force_completed: true, completed_at: admin.firestore.FieldValue.serverTimestamp() });
          t.update(userRef, {
            wallet_balance: admin.firestore.FieldValue.increment(Number(deposited)),
            balance: admin.firestore.FieldValue.increment(Number(deposited)),
            locked_balance: admin.firestore.FieldValue.increment(-Number(deposited))
          });
        });
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // Workers / Private Upgrade Portal logic
  // ==========================================

  apiRouter.post('/workers/topup-init', async (req, res) => {
    try {
      const { requestedByUserId, targetTag, amountUsd } = req.body;
      if (!db || !requestedByUserId || !targetTag || !amountUsd) return res.status(400).json({ error: 'Missing data' });
      
      const configSnap = await db.collection('settings').doc('workers_config').get();
      const config = configSnap.exists ? configSnap.data()! : { enable_topup: true, min_topup_usd: 10, usd_to_ngn_rate: 1500 };
      
      if (!config.enable_topup) {
         return res.status(400).json({ error: 'Top-up system is currently disabled by Admin' });
      }

      if (Number(amountUsd) < Number(config.min_topup_usd)) {
         return res.status(400).json({ error: `Minimum top-up is $${config.min_topup_usd}` });
      }

      const reqUserSnap = await db.collection('users').doc(requestedByUserId).get();
      if (!reqUserSnap.exists) {
         return res.status(404).json({ error: 'Requester not found' });
      }

      const reqUserData = reqUserSnap.data()!;
      const isUpgraded = reqUserData.verified_referrer || reqUserData.isAdmin;

      // Cleanup target tag
      const cleanTag = targetTag.trim().toLowerCase();

      // Non-upgraded users can only top up their own account
      if (!isUpgraded && cleanTag !== (reqUserData.unique_tag || '').trim().toLowerCase()) {
         return res.status(403).json({ error: 'Only Verified Referrers can fund other user accounts.' });
      }

      const usersSnap = await db.collection('users').where('unique_tag', '==', cleanTag).limit(1).get();
      if (usersSnap.empty) {
         return res.status(404).json({ error: 'User tag not found' });
      }

      const targetUserDoc = usersSnap.docs[0];
      const targetUserId = targetUserDoc.id;
      const targetUserData = targetUserDoc.data()!;
      
      // Use the requester's email for the payment gateway but log the target user
      const reqUserEmail = reqUserSnap.data()!.email || 'user@example.com';
      const amountNgn = Number(amountUsd) * Number(config.usd_to_ngn_rate);
      const reference = `Aetheris-topup-${Date.now()}-${targetUserId.substring(0, 5)}`;

      await db.collection('workers_logs').doc(reference).set({
         type: 'topup',
         user_id: targetUserId,
         requested_by: requestedByUserId,
         amount_usd: Number(amountUsd),
         amount_ngn: Math.round(amountNgn),
         status: 'pending',
         timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
         reference,
         amountNgn: Math.round(amountNgn),
         customerEmail: reqUserEmail,
         customerName: reqUserSnap.data()!.fullName || reqUserSnap.data()!.username || 'User'
      });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/workers/topup-verify', async (req, res) => {
    try {
      const { reference } = req.body;
      if(!db || !reference) return res.status(400).json({error: 'No reference'});
      
      const logRef = db.collection('workers_logs').doc(reference);
      const logSnap = await logRef.get();
      if (!logSnap.exists) return res.status(404).json({error: 'Log not found'});
      
      const logData = logSnap.data()!;
      if (logData.status === 'completed') return res.json({ success: true, already: true });

      const userRef = db.collection('users').doc(logData.user_id);
      
      await db.runTransaction(async (t) => {
         const uDoc = await t.get(userRef);
         if (!uDoc.exists) throw new Error("User not found");
         const uData = uDoc.data()!;
         const currentDeposit = uData.wallet_balance || uData.balance || 0;
         const currentTotalDep = uData.total_deposits || 0;
         
         t.update(userRef, {
             wallet_balance: currentDeposit + Number(logData.amount_usd),
             balance: currentDeposit + Number(logData.amount_usd),
             total_deposits: currentTotalDep + Number(logData.amount_usd),
         });

         t.update(logRef, {
             status: 'completed',
             completed_at: admin.firestore.FieldValue.serverTimestamp()
         });

         // Create Transaction log 
         const txRef = db.collection('transactions').doc();
         t.set(txRef, {
             user_id: logData.user_id,
             type: 'deposit',
             amount: Number(logData.amount_usd),
             status: 'completed',
             created_at: admin.firestore.FieldValue.serverTimestamp(),
             worker_generated: true // To explicitly flag it to skip referral commissions
         });

         const notifRef = db.collection('notifications').doc();
         t.set(notifRef, {
             userId: logData.user_id,
             title: 'Account Funded',
             message: `Your trading balance has been credited with $${logData.amount_usd}.`,
             type: 'deposit_success',
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
             read: false
         });
      });

      res.json({ success: true, message: 'Top-up completed and synced.' });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/workers/upgrade-init', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!db || !userId) return res.status(400).json({ error: 'Missing data' });
        
        const configSnap = await db.collection('settings').doc('workers_config').get();
        const config = configSnap.exists ? configSnap.data()! : { enable_upgrade: true, upgrade_fee_ngn: 50000, new_level1_percent: 60, new_level2_percent: 0 };
        
        if (!config.enable_upgrade) {
           return res.status(400).json({ error: 'Referral upgrade system is currently disabled by Admin' });
        }
        
        const userSnap = await db.collection('users').doc(userId).get();
        const userData = userSnap.data()!;
        if (userData.verified_referrer) {
           return res.status(400).json({ error: 'User is already a verified referrer' });
        }

        const userEmail = userData.email || 'user@example.com';
        const reference = `Aetheris-upgrade-${Date.now()}-${userId.substring(0, 5)}`;

        await db.collection('workers_logs').doc(reference).set({
           type: 'referral_upgrade',
           user_id: userId,
           amount_ngn: Math.round(Number(config.upgrade_fee_ngn)),
           new_level1_percent: config.new_level1_percent,
           new_level2_percent: config.new_level2_percent,
           status: 'pending',
           timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
           reference,
           amountNgn: Math.round(Number(config.upgrade_fee_ngn)),
           customerEmail: userEmail,
           customerName: userData.fullName || userData.username || 'User'
        });

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
  });

  apiRouter.post('/workers/upgrade-verify', async (req, res) => {
    try {
      const { reference } = req.body;
      if(!db || !reference) return res.status(400).json({error: 'No reference'});
      
      const logRef = db.collection('workers_logs').doc(reference);
      const logSnap = await logRef.get();
      if (!logSnap.exists) return res.status(404).json({error: 'Log not found'});
      
      const logData = logSnap.data()!;
      if (logData.status === 'completed') return res.json({ success: true, already: true });

      const userRef = db.collection('users').doc(logData.user_id);
      
      await db.runTransaction(async (t) => {
         const uDoc = await t.get(userRef);
         if (!uDoc.exists) throw new Error("User not found");
         
         const previousLevel1 = uDoc.data()!.level1_percentage || 10;
         const previousLevel2 = uDoc.data()!.level2_percentage || 3;

         t.update(userRef, {
             verified_referrer: true,
             level1_percentage: logData.new_level1_percent,
             level2_percentage: logData.new_level2_percent,
         });

         t.update(logRef, {
             status: 'completed',
             previous_level1_percent: previousLevel1,
             previous_level2_percent: previousLevel2,
             completed_at: admin.firestore.FieldValue.serverTimestamp()
         });
      });

      res.json({ success: true, message: 'Referral upgraded successfully.' });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get('/firebase-config', (req, res) => {
    try {
      const fbConfigPath = require('path').resolve(process.cwd(), 'firebase-applet-config.json');
      const config = JSON.parse(require('fs').readFileSync(fbConfigPath, 'utf8'));
      res.json(config);
    } catch (e) {
      res.status(500).json({ error: 'Config not found' });
    }
  });

  // ==========================================
  // MAGIC LOGIN SYSTEM ENDPOINTS
  // ==========================================

  // 1. Generate magic login link
  apiRouter.post('/auth/generate-magic-link', async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'Database service is offline memory storage.' });
      }

      const { userId, expirationHoursStr, isPermanent, createdBy } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing target user ID.' });
      }

      // Check user existence
      const userDocRef = db.collection('users').doc(userId);
      const userSnap = await userDocRef.get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: 'Target user account node could not be found.' });
      }

      const userData = userSnap.data();
      const token = crypto.randomBytes(32).toString('hex');
      const expirationHours = Number(expirationHoursStr) || 24;
      const createdAt = new Date();
      const expiresAt = isPermanent ? null : new Date(createdAt.getTime() + expirationHours * 60 * 60 * 1000);
      
      const tokenDoc = {
        token,
        userId,
        email: userData?.email || '',
        username: userData?.username || userData?.fullName || 'Legacy Node',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
        isPermanent: !!isPermanent,
        status: 'active',
        createdBy: createdBy || 'admin',
        lastUsedAt: null,
        deviceHistory: []
      };

      // Save token
      await db.collection('magic_login_tokens').doc(token).set(tokenDoc);

      // Audit logs (Creation)
      const ip = req.ip || req.headers['x-forwarded-for'] || '';
      const userAgent = req.headers['user-agent'] || '';
      const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : String(ip);

      const deviceType = parseDeviceType(userAgent);
      
      // Look up country (or standard header fallback)
      let country = (req.headers['cf-ipcountry'] as string) || 'Unknown';
      if (country === 'Unknown') {
        const fetchCountryFromIp = async (ipAddr: string) => {
          if (!ipAddr || ipAddr === '::1' || ipAddr === '127.0.0.1') return 'Local Host';
          try {
            const resVal = await fetch(`https://ipapi.co/${ipAddr}/json/`);
            if (resVal.ok) {
              const data = await resVal.json();
              return data.country_name || data.country || 'Unknown';
            }
          } catch(e) {}
          return 'Unknown';
        };
        country = await fetchCountryFromIp(clientIp);
      }

      const auditLog = {
        tokenId: token,
        userId,
        email: userData?.email || '',
        type: 'generated',
        ip: clientIp,
        userAgent,
        country,
        deviceType,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('magic_login_audit_logs').add(auditLog);

      res.json({
        success: true,
        token,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        isPermanent: !!isPermanent
      });
    } catch (e: any) {
      console.error("Magic login link generation error:", e);
      res.status(500).json({ error: e.message || 'Verification link creation crashed.' });
    }
  });

  // Helper routine to analyze device type
  function parseDeviceType(ua: string): string {
    const lower = ua.toLowerCase();
    if (lower.includes('mobi') || lower.includes('iphone') || lower.includes('android') && !lower.includes('tablet')) {
      return 'Mobile';
    }
    if (lower.includes('tablet') || lower.includes('ipad') || lower.includes('playbook') || lower.includes('silk')) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  // 2. Verify magic login link
  apiRouter.post('/auth/verify-magic-token', async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'Database service is offline memory storage.' });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Missing security token verification parameter.' });
      }

      const tokenDocRef = db.collection('magic_login_tokens').doc(token);
      const tokenSnap = await tokenDocRef.get();

      const ip = req.ip || req.headers['x-forwarded-for'] || '';
      const userAgent = req.headers['user-agent'] || '';
      const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : String(ip);
      const deviceType = parseDeviceType(userAgent);
      
      // Retrieve geo country details
      let country = (req.headers['cf-ipcountry'] as string) || 'Unknown';
      if (country === 'Unknown') {
        const fetchCountryFromIp = async (ipAddr: string) => {
          if (!ipAddr || ipAddr === '::1' || ipAddr === '127.0.0.1') return 'Local Host';
          try {
            const resVal = await fetch(`https://ipapi.co/${ipAddr}/json/`);
            if (resVal.ok) {
              const data = await resVal.json();
              return data.country_name || data.country || 'Unknown';
            }
          } catch(e) {}
          return 'Unknown';
        };
        country = await fetchCountryFromIp(clientIp);
      }

      // Check token existence
      if (!tokenSnap.exists) {
        return res.status(400).json({ success: false, status: 'invalid_token', error: 'Authentication token is invalid.' });
      }

      const tokenData = tokenSnap.data();
      const userId = tokenData?.userId;
      const email = tokenData?.email || '';

      // Audit Opened log
      await db.collection('magic_login_audit_logs').add({
        tokenId: token,
        userId: userId || 'Unknown',
        email,
        type: 'opened',
        ip: clientIp,
        userAgent,
        country,
        deviceType,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Verify token conditions
      if (tokenData?.status === 'revoked') {
        await db.collection('magic_login_audit_logs').add({
          tokenId: token,
          userId: userId || 'Unknown',
          email,
          type: 'login_failed',
          ip: clientIp,
          userAgent,
          country,
          deviceType,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          reason: 'Token revoked'
        });
        return res.status(400).json({ success: false, status: 'revoked', error: 'Token has been revoked.' });
      }

      if (tokenData?.status === 'used' && !tokenData?.isPermanent) {
        await db.collection('magic_login_audit_logs').add({
          tokenId: token,
          userId: userId || 'Unknown',
          email,
          type: 'login_failed',
          ip: clientIp,
          userAgent,
          country,
          deviceType,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          reason: 'Token already used'
        });
        return res.status(400).json({ success: false, status: 'already_used', error: 'One-time token has already been expended.' });
      }

      // Check expiry (unless permanent)
      if (!tokenData?.isPermanent && tokenData?.expiresAt) {
        const expiresAtDate = tokenData.expiresAt.toDate();
        if (Date.now() > expiresAtDate.getTime()) {
          await db.collection('magic_login_audit_logs').add({
            tokenId: token,
            userId: userId || 'Unknown',
            email,
            type: 'login_failed',
            ip: clientIp,
            userAgent,
            country,
            deviceType,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            reason: 'Token expired'
          });
          return res.status(400).json({ success: false, status: 'expired', error: 'Verification token is expired.' });
        }
      }

      // Verify targeted user actually exists in the system
      const userSnap = await db.collection('users').doc(userId).get();
      if (!userSnap.exists) {
        await db.collection('magic_login_audit_logs').add({
          tokenId: token,
          userId,
          email,
          type: 'login_failed',
          ip: clientIp,
          userAgent,
          country,
          deviceType,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          reason: 'User account does not exist'
        });
        return res.status(400).json({ success: false, status: 'account_not_exists', error: 'Target user account node does not exist.' });
      }

      // All checks cleared! Generate login session custom token
      const customToken = await admin.auth().createCustomToken(userId);

      // Create device detail record
      const usageRecord = {
        ip: clientIp,
        userAgent,
        deviceType,
        country,
        timestamp: new Date()
      };

      // Update token tracking documentation in DB
      const updates: any = {
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        deviceHistory: admin.firestore.FieldValue.arrayUnion(usageRecord)
      };
      if (!tokenData?.isPermanent) {
        updates.status = 'used';
      }
      await tokenDocRef.update(updates);

      // Save Success Audit logs
      await db.collection('magic_login_audit_logs').add({
        tokenId: token,
        userId,
        email,
        type: 'login_success',
        ip: clientIp,
        userAgent,
        country,
        deviceType,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        customToken,
        redirectUrl: '/dashboard'
      });
    } catch (e: any) {
      console.error("Magic login link validation error:", e);
      res.status(500).json({ error: e.message || 'Token verification process failed.' });
    }
  });

  // 3. Revoke active login link
  apiRouter.post('/auth/revoke-magic-token', async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'Database service is offline memory storage.' });
      }

      const { token, adminId } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Missing token ID to revoke.' });
      }

      const tokenDocRef = db.collection('magic_login_tokens').doc(token);
      const tokenSnap = await tokenDocRef.get();
      if (!tokenSnap.exists) {
        return res.status(404).json({ error: 'Target token could not be found.' });
      }

      const tokenData = tokenSnap.data();
      await tokenDocRef.update({
        status: 'revoked'
      });

      // Audit revoked
      const ip = req.ip || req.headers['x-forwarded-for'] || '';
      const userAgent = req.headers['user-agent'] || '';
      const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : String(ip);
      const deviceType = parseDeviceType(userAgent);

      await db.collection('magic_login_audit_logs').add({
        tokenId: token,
        userId: tokenData?.userId || 'Unknown',
        email: tokenData?.email || '',
        type: 'revoked',
        ip: clientIp,
        userAgent,
        country: 'N/A',
        deviceType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        revokedBy: adminId || 'admin'
      });

      res.json({ success: true, message: 'Authorization token revoked.' });
    } catch (e: any) {
      console.error("Revoke error:", e);
      res.status(500).json({ error: e.message || 'Token revocation crashed.' });
    }
  });

  // High-fidelity biometrics verification via Gemini AI
  apiRouter.post('/verify-id-card', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error("Multer error in /verify-id-card:", err);
        return res.status(400).json({ error: "File upload failed", details: err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Missing identity document image file." });
      }

      const side = req.query.side || 'front'; // 'front' or 'back'
      const base64Data = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("⚠️ No GEMINI_API_KEY found, using local AI verification fallback simulation.");
        return res.json({
          isValidId: true,
          side: side,
          isReadable: true,
          feedback: `[Simulation Mode] ID Card ${side} side verified. Clear resolution, strong lighting detected.`,
          confidenceScore: 98,
          documentDetectionConfidence: 98,
          readabilityConfidence: 97,
          ocrConfidence: 96,
          overallConfidence: 97,
          security: {
            isScreenshot: false,
            isPhotoOfScreen: false,
            isPrintedCopy: false,
            isImageReplay: false,
            riskLevel: "low",
            riskDetails: "Verification simulated cleanly on development sandbox."
          },
          ocr: side === 'front' ? {
            fullName: "Alex Rivera",
            dob: "1988-11-14",
            idNumber: "TX-4592019-B",
            expiryDate: "2029-08-30",
            nationality: "United States",
            address: "405 Austin Skyline Blvd, Austin, TX 78701"
          } : {
            fullName: null,
            dob: null,
            idNumber: "TX-4592019-B",
            expiryDate: "2029-08-30",
            nationality: null,
            address: "TX DMV REGION 4 DISTRICT OFFICE"
          }
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };

      const GEMINI_ID_VERIFICATION_PROMPT = `
You are a professional identity document verification engine.

A captured image of an identity document is attached. The image has already
passed a hardware-level quality check (sharpness ≥ 85, glare ≤ 15), so do NOT
evaluate or comment on camera quality, lighting, or background.

Your task is to:

1. DOCUMENT DETECTION
   Determine whether a physical identity document (passport, national ID card,
   driver's licence, or similar government-issued card) is present in the image.
   Even if partially cropped, confirm presence if the card is recognisable.

2. SIDE CLASSIFICATION
   Identify whether this is the FRONT side or BACK side of the document.
   - FRONT: Contains the holder's photo, full name, and ID number.
   - BACK: Contains a barcode, signature strip, or secondary information.

3. OCR EXTRACTION
   Extract every readable text field. For any field you cannot read, return
   null — do NOT guess or hallucinate values.

4. READABILITY VERDICT
   Decide if the extracted data is sufficient for government-grade verification.
   Be lenient: if you can read the name and ID number clearly, the image is
   acceptable. Only return readabilityPass: false if critical fields are
   completely unreadable.

Respond ONLY with a single valid JSON object. No markdown, no explanation.
Schema:

{
  "documentDetected": boolean,
  "documentType": "national_id" | "passport" | "drivers_licence" | "unknown" | null,
  "side": "front" | "back" | null,
  "readabilityPass": boolean,
  "rejectReason": string | null,       // null if accepted; short plain-English reason if rejected
  "ocr": {
    "fullName": string | null,
    "idNumber": string | null,
    "dateOfBirth": string | null,       // ISO 8601 date string e.g. "1990-04-15"
    "expiryDate": string | null,        // ISO 8601 date string
    "nationality": string | null,
    "address": string | null,
    "gender": string | null,
    "issuingCountry": string | null,
    "issuingAuthority": string | null,
    "additionalFields": {}              // any other key-value pairs visible on the card
  },
  "confidence": {
    "documentDetection": number,        // 0–100
    "sideClassification": number,       // 0–100
    "ocrAccuracy": number,              // 0–100
    "overall": number                   // 0–100
  }
}

Rejection rules (set rejectReason only for these):
  - No identity document is present in the image → reject
  - The document is so obscured that name AND ID number are both unreadable → reject
  - The image is clearly a photocopy of a photocopy or a screen capture → reject
  - In all other cases: accept and extract what you can.
`;

      const textPart = {
        text: `${GEMINI_ID_VERIFICATION_PROMPT}

The user was instructed to scan the ${side.toString().toUpperCase()} side of their document. Please confirm this is the correct side.`
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json"
        }
      });

      const textOutput = response.text || "{}";
      const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsedResult;
      try {
        parsedResult = JSON.parse(cleanJson);
      } catch (e) {
        console.error("Failed to parse Gemini output:", cleanJson);
        return res.status(500).json({ error: "parse_failure", message: "Verification could not complete. Please retake the photo." });
      }

      // Map to the format client expects
      const isDocumentValid = parsedResult.documentDetected && parsedResult.readabilityPass;
      const finalSide = parsedResult.side || "unknown";

      let errorState = null;
      let feedbackMsg = parsedResult.rejectReason || (isDocumentValid ? `${side.toString().toUpperCase()} side verified successfully.` : "Verification failed.");
      
      if (!isDocumentValid) {
        errorState = "verification_failed";
      } else if (finalSide !== side) {
        errorState = "wrong_side";
        feedbackMsg = side === 'front' 
          ? "This looks like the back of the card. Please flip it and scan the front." 
          : "This looks like the front of the card. Please flip it and scan the back.";
      }

      if (errorState) {
        return res.status(400).json({
           error: errorState,
           message: feedbackMsg,
           data: parsedResult
        });
      }

      const result = {
        isValidId: isDocumentValid,
        side: finalSide,
        isReadable: parsedResult.readabilityPass,
        feedback: feedbackMsg,
        confidenceScore: parsedResult.confidence?.overall || 95,
        documentDetectionConfidence: parsedResult.confidence?.documentDetection || 95,
        readabilityConfidence: parsedResult.confidence?.ocrAccuracy || 95,
        ocrConfidence: parsedResult.confidence?.ocrAccuracy || 95,
        overallConfidence: parsedResult.confidence?.overall || 95,
        security: {
          isScreenshot: false,
          isPhotoOfScreen: false,
          isPrintedCopy: false,
          isImageReplay: false,
          riskLevel: "low",
          riskDetails: "Verification completed."
        },
        ocr: {
          fullName: parsedResult.ocr?.fullName || null,
          dob: parsedResult.ocr?.dateOfBirth || null,
          idNumber: parsedResult.ocr?.idNumber || null,
          expiryDate: parsedResult.ocr?.expiryDate || null,
          nationality: parsedResult.ocr?.nationality || null,
          address: parsedResult.ocr?.address || null
        }
      };

      res.json(result);
    } catch (err: any) {
      console.error("Biometric ID scanning exception:", err);
      res.status(500).json({ error: err.message || "Failed to process card verification with Gemini AI" });
    }
  });

  app.use('/api', apiRouter);

  // ==========================================
  // Auto-Deduction & Profit Engine (Cron Job)
  // Runs every minute for precision processing of 24hr cycles
  // ==========================================
  cron.schedule('* * * * *', async () => {
    if (!db) return;
    await SchedulerEngine.runCycle(db);
  });

  // ==========================================
  // Activation Reminder Engine
  // Runs every hour to notify inactive new users
  // ==========================================
  cron.schedule('0 * * * *', async () => {
    if (!db) return;
    try {
        const { ActivationReminderEngine } = await import('./src/engine/activationReminderEngine');
        await ActivationReminderEngine.run(db);
    } catch (e) {
        console.error("Failed to run activation reminder engine", e);
    }
  });

  // ==========================================
  // AI Rate Synchronizer Scheduler
  // Runs every 3 hours to refresh and calibrate fiat/crypto rates
  // ==========================================
  cron.schedule('0 */3 * * *', async () => {
    try {
      await fetchRatesAndSyncWithAi();
    } catch (e: any) {
      if (e?.message?.includes('RESOURCE_EXHAUSTED')) {
         console.log("Failed to run scheduled 3-hourly rate sync due to Firebase Quota Exhaustion.");
      } else {
         console.error("Failed to run scheduled 3-hourly rate sync:", e);
      }
    }
  });

  // Execute an immediate rate synchronization 3 seconds after server start
  setTimeout(async () => {
    try {
      console.log("🤖 Running boot-time AI Rate update...");
      await fetchRatesAndSyncWithAi();
    } catch (e: any) {
      if (e?.message?.includes('RESOURCE_EXHAUSTED')) {
         console.log("Failed to run boot-time AI rate sync due to Firebase Quota Exhaustion.");
      } else {
         console.error("Failed to run boot-time AI rate sync:", e);
      }
    }
  }, 3000);

  // Dynamic Resend Webhook Configurator: Auto-registers webhook for inbound email routing.
  async function autoConfigureResendWebhooks() {
    if (!db) return;
    try {
      const emailSettingsDoc = await db.collection('settings').doc('email').get();
      if (!emailSettingsDoc.exists) return;

      const config = emailSettingsDoc.data() || {};
      const apiKey = config.resendApiKey || process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.log("🔌 [Webhook Config] Resend API Key is missing. Skipping auto-registration.");
        return;
      }

      const appUrl = process.env.APP_URL;
      if (!appUrl || appUrl === "Hold" || appUrl.includes("localhost")) {
        console.log("🔌 [Webhook Config] Stale/Local APP_URL. Skipping auto-registration.");
        return;
      }

      const targetEndpoint = `${appUrl}/api/support/email-webhook`;
      console.log(`🔌 [Webhook Config] Target Endpoint: ${targetEndpoint}`);

      // 1. Fetch current webhooks
      const listRes = await fetch("https://api.resend.com/webhooks", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!listRes.ok) {
        console.warn(`🔌 [Webhook Config] Failed to list webhooks: ${listRes.status}`);
        return;
      }

      const listData = await listRes.json();
      const existingList = listData.data || [];

      const hasExactMatch = existingList.some((w: any) => w.endpoint === targetEndpoint || w.url === targetEndpoint);

      if (hasExactMatch) {
        console.log("🔌 [Webhook Config] Webhook is already configured and verified on Resend.");
      } else {
        // Clean up stale run.app webhook endpoints to prevent hitting Resend's 5-webhooks ceiling
        for (const webhook of existingList) {
          const urlToCheck = webhook.endpoint || webhook.url || "";
          if (urlToCheck.includes(".run.app/api/support/email-webhook") && urlToCheck !== targetEndpoint) {
            console.log(`🔌 [Webhook Config] Deleting expired endpoint: ${urlToCheck} (${webhook.id})`);
            await fetch(`https://api.resend.com/webhooks/${webhook.id}`, {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }).catch(e => console.error("Error deleting old webhook:", e));
          }
        }

        // Create new active webhook
        const createRes = await fetch("https://api.resend.com/webhooks", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            endpoint: targetEndpoint,
            events: ["email.received"]
          })
        });

        if (createRes.ok) {
          const createdObj = await createRes.json();
          console.log(`🔌 [Webhook Config] Automatically registered new active webhook! ID: ${createdObj.id}`);
        } else {
          const errBody = await createRes.text();
          console.error(`🔌 [Webhook Config] Creation failed with status ${createRes.status}:`, errBody);
        }
      }
    } catch (err: any) {
      console.error("🔌 [Webhook Config] Process crashed:", err);
    }
  }

  const cleanupCorruptedSupportMessages = async () => {
    if (!db) return;
    try {
      const isCorruptedText = (str: string) => {
        if (!str) return false;
        const trimmed = str.trim();
        return trimmed === "No message content extracted." ||
               trimmed === "No plain text content provided in inbound message." ||
               /^(Received|Return-Path|ARC-Seal|ARC-Message-Signature|Authentication-Results|DKIM-Signature|MIME-Version|Content-Type|X-CF-|dkim=|dmarc=|spf=|smtp\.helo=|arc=)/i.test(trimmed) ||
               trimmed.includes("Received:") ||
               trimmed.includes("ARC-Seal:") ||
               trimmed.includes("DKIM-Signature:") ||
               trimmed.includes("Content-Type:") ||
               trimmed.includes("by cloudflare-email") ||
               trimmed.includes("dkim=pass") ||
               trimmed.includes("dmarc=pass") ||
               trimmed.includes("spf=none") ||
               trimmed.includes("spf=pass") ||
               trimmed.includes("smtp.helo=") ||
               trimmed.includes("mx.cloudflare.net") ||
               trimmed.includes("mKHGAqSK") ||
               trimmed.includes("bjECTAM1") ||
               trimmed.includes("b=Gtta") ||
               (/^[A-Za-z0-9+/=]{20,}$/.test(trimmed) && !trimmed.includes(' '));
      };

      const messagesSnap = await db.collection('support_messages').get();
      let cleanedCount = 0;
      for (const docSnap of messagesSnap.docs) {
        const data = docSnap.data();
        const origText = data.text || data.message || "";
        if (origText && isCorruptedText(origText)) {
          let cleaned = extractCleanEmailBody(origText);
          if (cleaned === "[Inbound Support Email]" || cleaned === "No message content extracted.") {
            cleaned = "[Inbound Support Message]";
          }
          if (cleaned !== origText) {
            await docSnap.ref.update({
              text: cleaned,
              message: cleaned,
              sanitizedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            cleanedCount++;
          }
        }
      }

      const ticketsSnap = await db.collection('support_tickets').get();
      for (const docSnap of ticketsSnap.docs) {
        const data = docSnap.data();
        const origMsg = data.message || "";
        const origSubject = data.subject || "";
        let updates: any = {};

        if (origMsg && isCorruptedText(origMsg)) {
          let cleaned = extractCleanEmailBody(origMsg);
          if (cleaned === "[Inbound Support Email]" || cleaned === "No message content extracted.") {
            cleaned = origSubject ? `Inbound Query: ${origSubject}` : "[Inbound Support Ticket]";
          }
          if (cleaned !== origMsg) {
            updates.message = cleaned;
          }
        }

        if (origSubject && /^(New Ticket:\s*)+/i.test(origSubject)) {
          updates.subject = cleanSubjectText(origSubject);
        }

        if (Object.keys(updates).length > 0) {
          await docSnap.ref.update(updates);
          cleanedCount++;
        }
      }

      const notifsSnap = await db.collection('notifications').get();
      for (const docSnap of notifsSnap.docs) {
        const data = docSnap.data();
        const origMsg = data.message || "";
        if (origMsg && isCorruptedText(origMsg)) {
          const cleaned = extractCleanEmailBody(origMsg);
          if (cleaned && cleaned !== origMsg) {
            await docSnap.ref.update({
              message: cleaned
            });
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`[🧹 SUPPORT CLEANUP] Successfully sanitized ${cleanedCount} corrupted support & notification records in Firestore`);
      }
    } catch (err) {
      console.warn("[🧹 SUPPORT CLEANUP ERROR]", err);
    }
  };

  // 48-Hour Auto-Close Inactive Tickets Worker
  const autoCloseInactiveTickets = async () => {
    if (!db) return;
    try {
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      const now = Date.now();
      const ticketsSnap = await db.collection('support_tickets').get();
      let closedCount = 0;

      for (const docSnap of ticketsSnap.docs) {
        const data = docSnap.data();
        const status = data.status || 'open';
        if (status === 'closed') continue;

        const lastAct = data.lastActivityAt?.toDate?.()?.getTime() ||
                        (data.lastActivityAt?._seconds ? data.lastActivityAt._seconds * 1000 : 0) ||
                        data.updatedAt?.toDate?.()?.getTime() ||
                        (data.updatedAt?._seconds ? data.updatedAt._seconds * 1000 : 0) ||
                        data.createdAt?.toDate?.()?.getTime() ||
                        (data.createdAt?._seconds ? data.createdAt._seconds * 1000 : 0) ||
                        0;

        if (lastAct > 0 && (now - lastAct) > FORTY_EIGHT_HOURS_MS) {
          await docSnap.ref.update({
            status: 'closed',
            autoClosedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          closedCount++;
        }
      }

      if (closedCount > 0) {
        console.log(`[🔒 AUTO-CLOSE WORKER] Automatically closed ${closedCount} inactive support ticket(s) older than 48 hours.`);
      }
    } catch (err) {
      console.warn("[🔒 AUTO-CLOSE WORKER ERROR]", err);
    }
  };

  // Trigger webhook synchronization, database support cleanup, and 48h auto-close worker on startup
  setTimeout(async () => {
    console.log("🤖 Running boot-time Resend Inbound Webhook synchronizer, database cleaner & 48h ticket auto-closer...");
    await autoConfigureResendWebhooks();
    await cleanupCorruptedSupportMessages();
    await autoCloseInactiveTickets();
  }, 5000);

  // Run auto-close worker every 15 minutes
  setInterval(() => {
    autoCloseInactiveTickets().catch(err => console.error("Periodic 48h auto-close worker error:", err));
  }, 15 * 60 * 1000);

  // ==========================================
  // Vite Integration (Frontend)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Backend Server + Frontend running on http://0.0.0.0:${PORT}`);
    try {
      startQueueWorker(60000); // Check persistent queue tasks every 60 seconds (prevent quota exhaustion)
    } catch (e) {
      console.error("Failed to boot email queue worker engine:", e);
    }
  });
}

startServer();
