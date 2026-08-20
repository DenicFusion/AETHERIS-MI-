import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function setupAdmin() {
  const adminEmail = 'admin@aetheris.com';
  const adminPassword = 'MasterAdmin123!';
  let uid = '';

  try {
    const userRecord = await auth.getUserByEmail(adminEmail);
    uid = userRecord.uid;
    console.log(`Admin user already exists in Auth with UID: ${uid}. Updating password just in case...`);
    await auth.updateUser(uid, { password: adminPassword });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`Creating new admin user in Auth...`);
      const userRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: true
      });
      uid = userRecord.uid;
    } else {
      throw error;
    }
  }

  console.log(`Updating Firestore document for UID: ${uid}...`);
  const adminDocRef = db.collection('users').doc(uid);
  
  await adminDocRef.set({
    uid: uid,
    email: adminEmail,
    role: 'admin',
    balance: 0,
    wallet_balance: 0,
    locked_balance: 0,
    total_deposits: 0,
    total_profits: 0,
    status: 'Active',
    createdAt: new Date(),
    fullName: 'System Administrator',
    preferredCurrency: 'USD'
  }, { merge: true });

  console.log('Successfully set up admin@aetheris.com as a super admin.');
  process.exit(0);
}

setupAdmin().catch(console.error);
