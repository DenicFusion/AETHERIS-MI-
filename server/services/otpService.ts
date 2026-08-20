import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './dbService';

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOtp = async (email: string, type: string = 'verification'): Promise<string> => {
  const db = getDb();
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing pending OTPs for this email
  const existingRecords = await db.collection('otps')
    .where('email', '==', email.toLowerCase())
    .get();

  const batch = db.batch();
  existingRecords.forEach(doc => {
    const data = doc.data();
    if (data.type === type && data.verified === false && data.expired === false) {
      batch.update(doc.ref, { expired: true });
    }
  });
  
  const newOtpRef = db.collection('otps').doc();
  batch.set(newOtpRef, {
    email: email.toLowerCase(),
    code,
    type,
    expiresAt,
    verified: false,
    expired: false,
    createdAt: FieldValue.serverTimestamp()
  });

  await batch.commit();
  console.log(`[OTP GENERATED] Code ${code} for ${email}`);
  return code;
};

export const verifyOtp = async (email: string, code: string, type: string = 'verification'): Promise<boolean> => {
  const db = getDb();
  
  const snapshot = await db.collection('otps')
    .where('email', '==', email.toLowerCase())
    .get();

  if (snapshot.empty) return false;

  // Filter in memory to avoid needing a complex composite index
  const validDocs = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.code === code && 
           data.type === type && 
           data.verified === false && 
           data.expired === false;
  });

  if (validDocs.length === 0) return false;

  // Find the most recent one (handle cases where createdAt might not be set perfectly yet though it's serverTimestamp)
  validDocs.sort((a, b) => {
    const tA = a.data().createdAt?.toMillis?.() || 0;
    const tB = b.data().createdAt?.toMillis?.() || 0;
    return tB - tA; // descending
  });

  const otpDoc = validDocs[0];
  const otpData = otpDoc.data();

  // Check expiration
  if (otpData.expiresAt.toDate() < new Date()) {
    await otpDoc.ref.update({ expired: true });
    return false;
  }

  // Mark as verified
  await otpDoc.ref.update({ verified: true });
  return true;
};
