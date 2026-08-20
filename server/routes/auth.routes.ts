import express from 'express';
import { Timestamp, FieldValue, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { getDb } from '../services/dbService';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { sendWelcomeEmail, sendWelcomeVerificationEmail, sendOtpEmail, sendSecurityAlertEmail } from '../services/emailService';
import { notifyAdmin } from '../services/notifications';
import { createOtp, verifyOtp } from '../services/otpService';
import { checkEmailAbuseAndLog, clearAbuseLock } from '../mail/mail.service';

const authRoutes = express.Router();

// Trigger welcome email manually (used for Google / Apple signups or standard post-verification)
authRoutes.post('/welcome', async (req, res) => {
  try {
    const { email, username, userId } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const db = getDb();
    let userRef: DocumentReference | null = null;
    let attempts = 0;

    // Retry finding user document in case of minor Firestore creation lag
    while (attempts < 4) {
      if (userId) {
        const docRef = db.collection('users').doc(userId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          userRef = docRef;
          break;
        }
      } else {
        const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!userSnap.empty) {
          userRef = userSnap.docs[0].ref;
          break;
        }
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    let appliedState = false;
    let finalUsername = username;
    let isUnverifiedSocial = false;
    let verificationLink = '';
    let shouldSendWelcome = false;

    const configSnap = await db.collection('config').doc('global').get();
    const configData = configSnap.data() || {};
    const bonusEnabled = configData.signupBonusEnabled !== false;
    const bonusAmount = typeof configData.signupBonusAmount === 'number' ? configData.signupBonusAmount : 100;

    if (userRef) {
      await db.runTransaction(async (t) => {
        const uSnap = await t.get(userRef!);
        if (uSnap.exists) {
          const uData = uSnap.data() || {};
          finalUsername = uData.username || uData.full_name?.split(' ')[0] || finalUsername;

          // Check if user is a social signup and has email_verified false (unverified)
          if (uData.email_verified === false) {
            isUnverifiedSocial = true;
            
            // Generate verification token
            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            
            t.update(userRef!, {
              verification_token: token,
              verification_token_expires: Timestamp.fromDate(expiry)
            });

            const origin = req.headers.origin || 'https://aetheriss.online';
            verificationLink = `${origin}/verify-email?token=${token}&userId=${uSnap.id}`;
          }

          if (bonusEnabled && !uData.applied_signup_reward && uData.email_verified === true) {
            // Apply reward securely to total wallet balance
            t.update(userRef!, {
              balance: FieldValue.increment(bonusAmount),
              wallet_balance: FieldValue.increment(bonusAmount),
              applied_signup_reward: true,
              signup_reward_amount: bonusAmount,
              signup_reward_time: FieldValue.serverTimestamp()
            });

            // Create Transaction history entry
            const txRef = db.collection('transactions').doc();
            t.set(txRef, {
              user_id: uSnap.id,
              type: "Signup Reward",
              status: "SUCCESS",
              amount: bonusAmount,
              message: "Signup Reward Bonus",
              reference: `AET-REWARD-${uSnap.id.substring(0, 6).toUpperCase()}`,
              timestamp: FieldValue.serverTimestamp()
            });

            // Create notification for in-app badge and alert
            const notifyRef = db.collection('notifications').doc();
            t.set(notifyRef, {
              userId: uSnap.id,
              type: 'deposit',
              title: "Signup Reward Unlocked! 🎉",
              message: `Welcome to Aetheris! A $${bonusAmount} promotional Signup Reward has been credited to your wallet balance.`,
              status: 'unread',
              createdAt: FieldValue.serverTimestamp()
            });

            appliedState = true;
          }

          if (uData.email_verified === true && !uData.welcome_email_sent) {
            t.update(userRef!, {
              welcome_email_sent: true
            });
            shouldSendWelcome = true;
          }
        }
      });
    }

    if (isUnverifiedSocial && verificationLink) {
      await sendWelcomeVerificationEmail(email, finalUsername, verificationLink);
    } else if (shouldSendWelcome) {
      await sendWelcomeEmail(email, finalUsername);
    }

    notifyAdmin('user_signup', 'New User Registration', `User ${finalUsername || username || email} (${email}) has registered on the platform.`).catch(e => console.error("Admin notification error on signup:", e));

    res.json({ 
      success: true, 
      message: 'Welcome flow processed', 
      appliedSignupReward: appliedState,
      isSocialVerificationSent: isUnverifiedSocial
    });
  } catch (error: any) {
    console.error("Welcome email error:", error);
    res.status(500).json({ error: error.message });
  }
});

authRoutes.post('/send-otp', async (req, res) => {
  try {
    const { email, username, type = 'verification' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Anti-spam request throttling protection
    const spamCheck = await checkEmailAbuseAndLog(email, `otp:${type}`);
    if (!spamCheck.allowed) {
      return res.status(429).json({ error: spamCheck.reason, cooldownRemaining: spamCheck.cooldownRemaining });
    }
    
    const code = await createOtp(email, type);
    const actionText = type === 'verification' ? 'Verify your account' : type === 'password_reset' ? 'Reset your password' : 'Confirm your action';
    await sendOtpEmail(email, username || 'user', code, actionText);
    
    res.json({ success: true, message: 'OTP sent' });
  } catch (error: any) {
    console.error("OTP send error:", error);
    res.status(500).json({ error: error.message });
  }
});

authRoutes.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, type = 'verification' } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    
    const isValid = await verifyOtp(email, code, type);
    
    if (!isValid) {
       return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    // Reset email locking metrics on successful confirmation
    await clearAbuseLock(email, `otp:${type}`);

    // If it's a verification OTP, we might want to manually update the Firebase Auth user emailVerified status
    if (type === 'verification') {
      try {
        const userRecord = await getAuth().getUserByEmail(email);
        if (!userRecord.emailVerified) {
           await getAuth().updateUser(userRecord.uid, { emailVerified: true });
        }
      } catch(e) {
         console.warn("Could not set emailVerified true for", email, e);
      }
    }
    
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    console.error("OTP verify error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resend verification link professionally if they try to sign in or hit the resend button
authRoutes.post('/resend-verification', async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or User ID required' });
    }

    const db = getDb();
    let userSnap: DocumentSnapshot | null = null;
    let userRef: DocumentReference | null = null;

    if (userId) {
      const ref = db.collection('users').doc(userId);
      const snap = await ref.get();
      if (snap.exists) {
        userRef = ref;
        userSnap = snap;
      }
    } else if (email) {
      const qSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!qSnap.empty) {
        userRef = qSnap.docs[0].ref;
        userSnap = qSnap.docs[0];
      }
    }

    if (!userRef || !userSnap || !userSnap.exists) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const uData = userSnap.data() || {};
    if (uData.email_verified === true) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await userRef.update({
      verification_token: token,
      verification_token_expires: Timestamp.fromDate(expiry)
    });

    const origin = req.headers.origin || 'https://aetheriss.online';
    const verificationLink = `${origin}/verify-email?token=${token}&userId=${userSnap.id}`;

    await sendWelcomeVerificationEmail(uData.email || email, uData.username || 'user', verificationLink);

    res.json({ success: true, message: 'Verification link has been resent successfully' });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm verification token endpoint
authRoutes.post('/confirm-verification', async (req, res) => {
  let emailToSendTo: string | null = null;
  let usernameToSendTo: string | null = null;
  try {
    const { token, userId } = req.body;
    if (!token || !userId) {
      return res.status(400).json({ error: 'Token and User ID required' });
    }

    const db = getDb();
    const userRef = db.collection('users').doc(userId);
    
    let expired = false;
    let success = false;
    let wasAlreadyVerified = false;
    let shouldSendWelcome = false;

    // Fetch config for signup bonus
    const configSnap = await db.collection('config').doc('global').get();
    const configData = configSnap.data() || {};
    const bonusEnabled = configData.signupBonusEnabled !== false;
    const bonusAmount = typeof configData.signupBonusAmount === 'number' ? configData.signupBonusAmount : 100;

    await db.runTransaction(async (t) => {
      const uSnap = await t.get(userRef);
      if (!uSnap.exists) {
        throw new Error('User account not found');
      }

      const uData = uSnap.data() || {};
      emailToSendTo = uData.email || null;
      usernameToSendTo = uData.username || 'user';

      if (uData.email_verified === true) {
        success = true; // already verified, treat as success
        wasAlreadyVerified = true;
        return;
      }

      if (uData.verification_token !== token) {
        throw new Error('Invalid verification token');
      }

      const expiryDate = uData.verification_token_expires?.toDate();
      if (!expiryDate || Date.now() > expiryDate.getTime()) {
        expired = true;
        // Explicitly mark in-db that the token has expired
        t.update(userRef, {
          verification_token_status: 'expired',
          verification_token_expired_at: FieldValue.serverTimestamp()
        });
        throw new Error('Verification link has expired');
      }

      // Mark verified and update status to Active (or keep their status)
      const updateData: any = {
        email_verified: true,
        status: 'Active',
        verification_token: FieldValue.delete(),
        verification_token_expires: FieldValue.delete()
      };

      if (!uData.welcome_email_sent) {
        updateData.welcome_email_sent = true;
        shouldSendWelcome = true;
      }

      if (bonusEnabled && !uData.applied_signup_reward) {
        updateData.balance = FieldValue.increment(bonusAmount);
        updateData.wallet_balance = FieldValue.increment(bonusAmount);
        updateData.applied_signup_reward = true;
        updateData.signup_reward_amount = bonusAmount;
        updateData.signup_reward_time = FieldValue.serverTimestamp();

        // Create Transaction history entry
        const txRef = db.collection('transactions').doc();
        t.set(txRef, {
          user_id: userId,
          type: "Signup Reward",
          status: "SUCCESS",
          amount: bonusAmount,
          message: "Signup Reward Bonus",
          reference: `AET-REWARD-${userId.substring(0, 6).toUpperCase()}`,
          timestamp: FieldValue.serverTimestamp()
        });

        // Create notification for in-app badge and alert
        const notifyRef = db.collection('notifications').doc();
        t.set(notifyRef, {
          userId: userId,
          type: 'deposit',
          title: "Signup Reward Unlocked! 🎉",
          message: `Welcome to Aetheris! A $${bonusAmount} promotional Signup Reward has been credited to your wallet balance.`,
          status: 'unread',
          createdAt: FieldValue.serverTimestamp()
        });
      } else {
        // Create notification for dashboard badge and alert
        const notifyRef = db.collection('notifications').doc();
        t.set(notifyRef, {
          userId: userId,
          type: 'deposit',
          title: "Account Verified! 🛡️",
          message: "Your Aetheris account authentication has been verified successfully.",
          status: 'unread',
          createdAt: FieldValue.serverTimestamp()
        });
      }

      t.update(userRef, updateData);

      success = true;
    });

    if (success && !wasAlreadyVerified && shouldSendWelcome && emailToSendTo) {
      try {
        await sendWelcomeEmail(emailToSendTo, usernameToSendTo || 'user');
      } catch (welcomeErr) {
        console.error("Welcome onboarding email failed after verify:", welcomeErr);
      }
    }

    res.json({ success: true, message: 'Account verified successfully', email: emailToSendTo });
  } catch (error: any) {
    console.error("Confirm verification error:", error);
    const isExpired = error.message === 'Verification link has expired';
    res.status(400).json({ 
      success: false, 
      error: error.message, 
      expired: isExpired,
      email: emailToSendTo
    });
  }
});

// Reset password endpoint using OTP validation
authRoutes.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code and new password are required' });
    }

    const db = getDb();
    
    // 1. Verify that matching verified OTP exists
    const otpsSnapshot = await db.collection('otps')
      .where('email', '==', email.toLowerCase())
      .where('code', '==', code)
      .where('type', '==', 'password_reset')
      .where('verified', '==', true)
      .get();

    if (otpsSnapshot.empty) {
      return res.status(400).json({ error: 'Security validation failed. Please verify your OTP first.' });
    }

    const otpDoc = otpsSnapshot.docs[0];
    const otpData = otpDoc.data();
    
    const expiresAt = otpData.expiresAt.toDate();
    if (expiresAt < new Date() || otpData.expired === true) {
      return res.status(400).json({ error: 'Security code session has expired. Please try again.' });
    }

    // 2. Fetch Firebase user
    let userRecord;
    try {
      userRecord = await getAuth().getUserByEmail(email.toLowerCase());
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'Account not found with this email' });
      }
      throw authErr;
    }

    // 3. Update password
    await getAuth().updateUser(userRecord.uid, {
      password: newPassword
    });

    // 4. Invalidate/expire the OTP
    await otpDoc.ref.update({ expired: true });

    // 5. Create a professional notification record
    const notifyRef = db.collection('notifications').doc();
    let finalUsername = "Valued User";
    await db.runTransaction(async (t) => {
      const userSnap = await t.get(db.collection('users').doc(userRecord.uid));
      if (userSnap.exists) {
        finalUsername = userSnap.data()?.username || userSnap.data()?.full_name?.split(' ')[0] || "Valued User";
      }
      t.set(notifyRef, {
        userId: userRecord.uid,
        type: 'deposit',
        title: "Security Password Reset 🔒",
        message: "Your account password credentials have been reset and updated successfully.",
        status: 'unread',
        createdAt: FieldValue.serverTimestamp()
      });
    });

    // 6. Send security alert email
    try {
      const uAgent = req.headers['user-agent'] || 'Unknown Device';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
      await sendSecurityAlertEmail({
        to: email.toLowerCase(),
        username: finalUsername,
        actionText: 'Your password was successfully reset.',
        deviceInfo: uAgent,
        ipLocation: ip
      });
    } catch (err) {
      console.error("Failed to send password reset security alert:", err);
    }

    res.json({ success: true, message: 'Your password has been reset successfully.' });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default authRoutes;
