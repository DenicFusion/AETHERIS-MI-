import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, query, limit, where, addDoc } from 'firebase/firestore';

import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

const FALLBACK_AVATARS = [
  "https://api.dicebear.com/7.x/identicon/svg?seed=Aetheris1",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Aetheris2",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Aetheris3",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Aetheris4",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Aetheris5",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Aetheris6"
];

async function detectLocalCurrency(): Promise<{ currencyCode: string, countryName: string } | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (!data.currency) return null;
    return {
      currencyCode: data.currency,
      countryName: data.country_name || ''
    };
  } catch (e) {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, fullName: string, username: string, preferredCurrency: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const baseUrl = (import.meta as any).env.VITE_API_URL || "";

  useEffect(() => {
    const ADMIN_EMAILS = [
      "admin@aetheris.com",
      "samdenic01@gmail.com"
    ];

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If password signup is currently in progress, let registerWithEmail create the document to avoid race conditions and overwriting
        if (localStorage.getItem('registration_in_progress') === 'true') {
          console.log("[useAuth] Skipping onAuthStateChanged auto-provisioning because registerWithEmail is handling it.");
          setUser(user);
          setLoading(false);
          return;
        }

        try {
          const emailLower = user.email?.toLowerCase() || "";
          const isAdminEmail = ADMIN_EMAILS.includes(emailLower);
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);

          if (!docSnap.exists()) {
            const fullName = user.displayName || 'Aetheris User';
            const finalUsername = fullName; // Use display name directly as requested

            // Select random avatar URL
            let avatarUrl = '';
            try {
              const avatarSnap = await getDocs(query(collection(db, 'avatars'), limit(12)));
              if (!avatarSnap.empty) {
                const arr = avatarSnap.docs.map(d => d.data().image_url);
                avatarUrl = arr[Math.floor(Math.random() * arr.length)];
              } else {
                avatarUrl = FALLBACK_AVATARS[Math.floor(Math.random() * FALLBACK_AVATARS.length)];
              }
            } catch (e) {
              console.warn("Avatar fetch failed, using fallback:", e);
              avatarUrl = FALLBACK_AVATARS[Math.floor(Math.random() * FALLBACK_AVATARS.length)];
            }

            // Generate standard Ref Code
            const myRefCode = `AET-${Math.floor(1000000 + Math.random() * 9000000)}`;

            const baseTag = finalUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
            const uniqueTag = `@${baseTag}${Math.floor(100 + Math.random() * 900)}`;

            // Retrieve referral code if stored locally for OAuth transitions
            const storedRefCode = localStorage.getItem('refCode');
            let finalReferredBy = storedRefCode || null;
            if (finalReferredBy === myRefCode) {
              finalReferredBy = null;
            }

            const geoData = await detectLocalCurrency();
            const countryVal = geoData?.countryName || "United States";

            // Provision user document
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              fullName: fullName,
              username: finalUsername,
              preferredCurrency: geoData?.currencyCode || 'USD',
              local_currency: geoData?.currencyCode || null,
              local_country: countryVal,
              country: countryVal,
              registrationCountry: countryVal,
              referredBy: finalReferredBy,
              refCode: myRefCode,
              unique_tag: uniqueTag,
              avatarUrl: avatarUrl,
              profile_avatar: avatarUrl, // maintain backward compatibility
              role: isAdminEmail ? 'admin' : 'user',
              isAdmin: isAdminEmail ? true : false,
              balance: isAdminEmail ? 1000000 : 0,
              wallet_balance: isAdminEmail ? 1000000 : 0,
              applied_signup_reward: false,
              welcome_email_sent: false,
              status: isAdminEmail ? 'Active' : 'Pending',
              createdAt: new Date(),
              email_verified: isAdminEmail ? true : false
            });

            if (finalReferredBy && !isAdminEmail) {
               try {
                 await addDoc(collection(db, 'referrals'), {
                   referrerCode: finalReferredBy,
                   referredUserId: user.uid,
                   createdAt: new Date()
                 });

                 await fetch(`${baseUrl}/api/auth/increment-referral`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ referrerCode: finalReferredBy })
                 });
               } catch (err) {
                 console.warn("Failed to create referral record for oauth signup", err);
               }
            }

            localStorage.removeItem('refCode');
            localStorage.removeItem('isReferralLocked');

            // Send welcome onboarding/verification email for standard users
            if (!isAdminEmail) {
              try {
                 await fetch(`${baseUrl}/api/auth/welcome`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ email: user.email, username: finalUsername, userId: user.uid })
                 });
              } catch (e) {
                 console.error("Popup welcome email failed", e);
              }
            }
          } else {
            // Backup sanity update for existing Google/Apple logins
            const data = docSnap.data();
            const updates: any = {};
            let updated = false;

            if (isAdminEmail) {
              if (data.role !== 'admin' || !data.isAdmin || data.email_verified !== true || data.status !== 'Active') {
                updates.role = 'admin';
                updates.isAdmin = true;
                updates.status = 'Active';
                updates.email_verified = true;
                updated = true;
              }
            } else {
              if (!data.fullName && user.displayName) {
                 updates.fullName = user.displayName;
                 updated = true;
              }
              if (!data.username) {
                 updates.username = user.displayName || 'user';
                 updated = true;
              }
            }

            if (!data.avatarUrl) {
               let selected = FALLBACK_AVATARS[Math.floor(Math.random() * FALLBACK_AVATARS.length)];
               try {
                 const avatarSnap = await getDocs(query(collection(db, 'avatars'), limit(12)));
                 if (!avatarSnap.empty) {
                   const arr = avatarSnap.docs.map(d => d.data().image_url);
                   selected = arr[Math.floor(Math.random() * arr.length)];
                 }
               } catch (e) {}
               updates.avatarUrl = selected;
               updates.profile_avatar = selected; // maintain backward compatibility
               updated = true;
            }

            if (updated) {
               await updateDoc(userRef, updates);
            }
          }
        } catch (error: any) {
          if (!error?.message?.includes?.('offline')) {
            console.error("Error setting up user document in auth state change listener", error);
          }
        }
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      localStorage.setItem('aetheris_last_active', Date.now().toString());
    } catch (error: any) {
      if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
        throw error;
      }
      console.error("Error signing in", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      localStorage.setItem('aetheris_last_active', Date.now().toString());
    } catch (error: any) {
      const isCredentialError = error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password';
      
      if (email === 'admin@aetheris.com' && pass === 'MasterAdmin123!' && isCredentialError) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          try {
             await setDoc(doc(db, 'users', cred.user.uid), {
                uid: cred.user.uid,
                email: 'admin@aetheris.com',
                fullName: 'Master Admin',
                username: 'admin',
                role: 'admin',
                balance: 0,
                status: 'Active',
                createdAt: new Date()
             });
          } catch (e) {
             console.warn("Failed to initialize admin firestore record:", e);
          }
          localStorage.setItem('aetheris_last_active', Date.now().toString());
          return;
        } catch (regError) {
          console.warn("Admin account setup already completed or network unavailable:", regError);
        }
      }

      if (isCredentialError) {
        throw new Error('Invalid email or password. Please try again.');
      }
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string, username: string, preferredCurrency: string, referralCode?: string) => {
    try {
      // Set local locking flag to bypass the onAuthStateChanged listener's auto-provisioning
      localStorage.setItem('registration_in_progress', 'true');

      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Email verification is handled by custom OTP
      
      const userRef = doc(db, 'users', cred.user.uid);
      
      // Select random avatar 
      let avatarUrl = '';
      try {
         const avatarSnap = await getDocs(query(collection(db, 'avatars'), limit(12)));
         if (!avatarSnap.empty) {
            const arr = avatarSnap.docs.map(d => d.data().image_url);
            avatarUrl = arr[Math.floor(Math.random() * arr.length)];
         } else {
            avatarUrl = FALLBACK_AVATARS[Math.floor(Math.random() * FALLBACK_AVATARS.length)];
         }
      } catch (e) {
         console.warn("Avatar fetch failed, using fallback:", e);
         avatarUrl = FALLBACK_AVATARS[Math.floor(Math.random() * FALLBACK_AVATARS.length)];
      }

      // Generate unique refCode via server
      const generateUniqueRefCode = async () => {
        try {
          const response = await fetch(`${baseUrl}/api/auth/generate-refcode`, { method: 'POST' });
          if (!response.ok) throw new Error();
          const { refCode } = await response.json();
          if (refCode) return refCode;
          throw new Error();
        } catch (e) {
          return `AET-${Math.floor(1000000 + Math.random() * 9000000)}`;
        }
      };

      const myRefCode = await generateUniqueRefCode();
      const baseTag = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const uniqueTag = `@${baseTag}${Math.floor(100 + Math.random() * 900)}`;

      // Ensure user doesn't self-refer
      let finalReferredBy = referralCode || null;
      if (finalReferredBy === myRefCode) {
        finalReferredBy = null;
      }

      try {
        const geoData = await detectLocalCurrency();
        const countryVal = geoData?.countryName || "United States";
        await setDoc(userRef, {
          uid: cred.user.uid,
          email: cred.user.email || email,
          fullName,
          username,
          preferredCurrency: geoData?.currencyCode || preferredCurrency,
          local_currency: geoData?.currencyCode || null,
          local_country: countryVal,
          country: countryVal,
          registrationCountry: countryVal,
          referredBy: finalReferredBy,
          refCode: myRefCode,
          unique_tag: uniqueTag,
          avatarUrl,
          profile_avatar: avatarUrl, // maintain backward compatibility
          role: 'user',
          balance: 0,
          wallet_balance: 0,
          applied_signup_reward: false,
          welcome_email_sent: false,
          status: 'Active',
          createdAt: new Date(),
          email_verified: true
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
      }

      try {
         await fetch(`${baseUrl}/api/auth/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cred.user.email || email, username, userId: cred.user.uid })
         });
      } catch (e) {
         console.warn("Welcome email failed", e);
      }

      if (finalReferredBy) {
        try {
          await addDoc(collection(db, 'referrals'), {
            referrerCode: finalReferredBy,
            referredUserId: cred.user.uid,
            createdAt: new Date()
          });
          
          await fetch(`${baseUrl}/api/auth/increment-referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referrerCode: finalReferredBy })
          });
        } catch (err) {
          console.warn("Failed to create referral record", err);
        }
      }

      localStorage.setItem('aetheris_last_active', Date.now().toString());
    } catch (error) {
      localStorage.removeItem('registration_in_progress');
      if (error && (error as any).code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      throw error;
    } finally {
      localStorage.removeItem('registration_in_progress');
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('aetheris_last_active');
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // ... rest of the code is unchanged ...
  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
