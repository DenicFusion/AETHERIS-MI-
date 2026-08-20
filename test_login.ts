import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testLogin() {
  try {
    const userCred = await signInWithEmailAndPassword(auth, 'admin@aetheris.com', 'MasterAdmin123!');
    console.log("Success! Logged in as:", userCred.user.uid);
  } catch (e: any) {
    console.error("Login failed:", e.code, e.message);
  }
  process.exit(0);
}

testLogin();
