import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Eye, EyeOff, Check, AlertCircle, Loader2, ArrowRight, Lock, Mail, User, Fingerprint, Download } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { usePwa } from '@/contexts/PwaContext';
import { auth, db } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { sanitizeErrorMessage } from '@/lib/firestore-errors';

export function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInstalled, promptInstall } = usePwa();
  const isSignupRoute = location.pathname.includes('/signup');

  const [isLogin, setIsLogin] = useState(!isSignupRoute);

  // Dynamic Biometric States
  const [isPwaMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneElement = window.matchMedia('(display-mode: standalone)').matches;
    const navStandalone = (navigator as any).standalone;
    const hasPwaQuery = window.location.search.includes('source=pwa') || window.location.search.includes('utm_source=pwa');
    return !!(isStandaloneElement || navStandalone || hasPwaQuery);
  });

  const [biometricName, setBiometricName] = useState('Biometrics');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    if (isIos) {
      const hasNotch = window.screen.height >= 812;
      setBiometricName(hasNotch ? "Face ID" : "Touch ID");
    } else {
      setBiometricName("Android Fingerprint");
    }
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Magic Login Link States
  const [magicLoginLoading, setMagicLoginLoading] = useState(false);
  const [magicLoginError, setMagicLoginError] = useState<string | null>(null);
  const isMagicLoginRoute = location.pathname.includes('/magic-login');
  
  // Real-time Referral Verification Status
  const [referralStatus, setReferralStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // Referral code locking
  const [isReferralLocked, setIsReferralLocked] = useState(false);

  // Forgot password flow wizard states
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'new_password' | 'success' | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetOtpCountDown, setResetOtpCountDown] = useState(600);
  const [isResetVerifying, setIsResetVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetUpdating, setIsResetUpdating] = useState(false);

  // OTP flow details
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingSignupArgs, setPendingSignupArgs] = useState<any>(null);
  const [otpCountDown, setOtpCountDown] = useState(600);
  
  const [showStrength, setShowStrength] = useState(false);
  const [showResetStrength, setShowResetStrength] = useState(false);
  
  const { registerWithEmail, loginWithEmail, login } = useAuth();

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-transparent', criteria: { length: false, upper: false, lower: false, number: false, special: false } };
    
    const lengthMatch = pwd.length >= 8 && pwd.length <= 15;
    const uppercaseMatch = /[A-Z]/.test(pwd);
    const lowercaseMatch = /[a-z]/.test(pwd);
    const numberMatch = /[0-9]/.test(pwd);
    const specialMatch = /[!@#$%^&*]/.test(pwd);

    const criteria = {
      length: lengthMatch,
      upper: uppercaseMatch,
      lower: lowercaseMatch,
      number: numberMatch,
      special: specialMatch
    };

    const allSatisfied = lengthMatch && uppercaseMatch && lowercaseMatch && numberMatch && specialMatch;

    if (!allSatisfied) {
      return { score: 1, label: 'Weak', color: 'bg-rose-500', criteria };
    }

    // All are satisfied, now length determines Medium, Strong, Very Strong
    if (pwd.length === 8) {
      return { score: 2, label: 'Medium', color: 'bg-amber-500', criteria };
    } else if (pwd.length <= 11) {
      return { score: 3, label: 'Strong', color: 'bg-emerald-500', criteria };
    } else {
      return { score: 4, label: 'Very Strong', color: 'bg-blue-500', criteria };
    }
  };

  const handleSuggestPassword = () => {
    const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowers = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*';
    
    let generated = '';
    generated += uppers[Math.floor(Math.random() * uppers.length)];
    generated += lowers[Math.floor(Math.random() * lowers.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += specials[Math.floor(Math.random() * specials.length)];
    
    const all = uppers + lowers + numbers + specials;
    for (let i = 0; i < 8; i++) {
      generated += all[Math.floor(Math.random() * all.length)];
    }
    
    const arr = generated.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const finalPassword = arr.join('');
    
    setPassword(finalPassword);
    setConfirmPassword(finalPassword);
    
    try {
      navigator.clipboard.writeText(finalPassword);
      toast.success("Robust password generated and applied successfully! Copied to clipboard.", { duration: 5000 });
    } catch (e) {
      toast.success("Robust password generated and applied successfully!", { duration: 4050 });
    }
  };

  const validatePasswordRequirements = (pwd: string): string | null => {
    if (pwd.length < 8 || pwd.length > 15) {
      return 'Password must be between 8 and 15 characters long.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number (0-9).';
    }
    if (!/[!@#$%^&*]/.test(pwd)) {
      return 'Password must contain at least one special character (!@#$%^&*).';
    }
    return null;
  };

  // Magic Login Verification Process
  useEffect(() => {
    if (isMagicLoginRoute) {
      const searchParams = new URLSearchParams(location.search);
      const token = searchParams.get('token');
      if (!token) {
        setMagicLoginError("No security verification token was found inside link parameters. Handshake denied.");
        return;
      }
      
      const processMagicLogin = async () => {
        setMagicLoginLoading(true);
        setMagicLoginError(null);
        try {
          const baseUrl = (import.meta as any).env.VITE_API_URL || "";
          
          const response = await fetch(`${baseUrl}/api/auth/verify-magic-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
          
          const result = await response.json();
          if (!response.ok || !result.success) {
            let msg = "Handshake verification rejected.";
            if (result.status === 'expired') {
              msg = "This magic login link has expired. Secure login tokens are only valid for the specified duration (up to 24 hours).";
            } else if (result.status === 'already_used') {
              msg = "This magic login link has already been used and is invalidated for future access.";
            } else if (result.status === 'revoked') {
              msg = "This authority link has been revoked by administration control.";
            } else if (result.status === 'invalid_token') {
              msg = "The security token provided is mathematically invalid or forged.";
            } else if (result.status === 'account_not_exists') {
              msg = "The corresponding target user account matches zero active nodes.";
            } else if (result.error) {
              msg = result.error;
            }
            setMagicLoginError(msg);
            setMagicLoginLoading(false);
            return;
          }
          
          // Token matches! Establish direct credentials session
          const { customToken } = result;
          const { signInWithCustomToken } = await import('firebase/auth');
          await signInWithCustomToken(auth, customToken);
          
          // Let the app context automatic sync redirect to /dashboard
          setMagicLoginLoading(false);
          const searchParams = new URLSearchParams(location.search);
          const redirectPath = searchParams.get('redirect') || '/dashboard';
          navigate(redirectPath, { replace: true });
        } catch (e: any) {
          console.error("Magic login handshake failed:", e);
          setMagicLoginError(e.message || "Establishing safe link channel failed due to connection anomalies.");
          setMagicLoginLoading(false);
        }
      };
      
      processMagicLogin();
    }
  }, [isMagicLoginRoute, location.search, auth, navigate]);

  // Route syncing with isLogin state
  useEffect(() => {
    setIsLogin(!isSignupRoute);
  }, [isSignupRoute]);

  // Real-time Referral Validation logic
  useEffect(() => {
    if (!referralCode.trim()) {
      setReferralStatus('idle');
      return;
    }

    setReferralStatus('validating');
    const delayDebounce = setTimeout(async () => {
      try {
        const baseUrl = (import.meta as any).env.VITE_API_URL || "";
        const response = await fetch(`${baseUrl}/api/auth/validate-ref`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refCode: referralCode.trim() })
        });
        const data = await response.json();
        if (data.valid) {
          setReferralStatus('valid');
        } else {
          setReferralStatus('invalid');
        }
      } catch (e) {
        // Fallback to idle if backend fails so they are never stuck
        setReferralStatus('idle');
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [referralCode]);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (otpModalOpen && otpCountDown > 0) {
      interval = setInterval(() => {
        setOtpCountDown(prev => prev - 1);
      }, 1000);
    } else if (otpCountDown === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpModalOpen, otpCountDown]);

  // Read ref from URL query on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refParam = searchParams.get('ref') || searchParams.get('invite');
    
    if (refParam) {
      localStorage.setItem('refCode', refParam);
      localStorage.setItem('isReferralLocked', 'true');
      setReferralCode(refParam);
      setIsReferralLocked(true);
      setReferralStatus('valid');
      if (isLogin) {
        navigate('/auth/signup?ref=' + refParam, { replace: true });
      }
    } else {
      const storedRef = localStorage.getItem('refCode');
      const lockedState = localStorage.getItem('isReferralLocked') === 'true';
      if (storedRef) {
        setReferralCode(storedRef);
        setIsReferralLocked(lockedState);
        if (lockedState) {
          setReferralStatus('valid');
        }
      }
    }
  }, [location, navigate, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowStrength(false);
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!isLogin) {
      const pErr = validatePasswordRequirements(password);
      if (pErr) {
        setError(pErr);
        setIsLoading(false);
        return;
      }
    }

    if (!isLogin && referralCode.trim() && referralStatus === 'invalid') {
      setError('The provided referral code is invalid. Please check the code or clear the input to continue.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        localStorage.setItem('aetheris_last_email', email);
        localStorage.setItem('aetheris_last_active', Date.now().toString());
        
        // Strict pre-verification check to avoid dashboard flashing
        const currentUser = auth.currentUser;
        if (currentUser) {
          const ADMIN_EMAILS = [
            "admin@aetheris.com",
            "samdenic01@gmail.com"
          ];
          const isAdminEmail = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');

          if (!isAdminEmail) {
            const { doc, getDoc } = await import('firebase/firestore');
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              // Bypass verification check if user is an admin
              if (uData && uData.email_verified === false && uData.role !== 'admin' && !uData.isAdmin) {
                // Check token expiration and auto-resend if expired on login
                let isTokenExpired = false;
                if (uData.verification_token_expires) {
                  const expires = uData.verification_token_expires.toDate();
                  if (Date.now() > expires.getTime()) isTokenExpired = true;
                } else if (uData.verification_token_status === 'expired') {
                  isTokenExpired = true;
                }
                
                if (isTokenExpired) {
                  try {
                    const baseUrl = (import.meta as any).env.VITE_API_URL || "";
                    await fetch(`${baseUrl}/api/auth/resend-verification`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: uData.email || email, userId: currentUser.uid })
                    });
                    toast.success("A fresh verification link has been sent to your email.");
                  } catch (e) {
                    console.error("Auto resend failed", e);
                  }
                }
                
                navigate('/verify-email');
                return;
              }
            }
          }
        }

        const searchParams = new URLSearchParams(location.search);
        const redirectPath = searchParams.get('redirect') || '/dashboard';
        navigate(redirectPath);
      } else {
        const ADMIN_EMAILS = [
          "admin@aetheris.com",
          "samdenic01@gmail.com"
        ];
        const emailLower = email.toLowerCase();
        
        if (ADMIN_EMAILS.includes(emailLower)) {
          // Bypass OTP completely for admins! Register directly.
          await registerWithEmail(email, password, fullName, username || 'admin', 'USD', referralCode);
          toast.success("Admin authorized and registered successfully!");
          
          const searchParams = new URLSearchParams(location.search);
          const redirectPath = searchParams.get('redirect') || '/dashboard';
          navigate(redirectPath);
          return;
        }

        // Send verification OTP first on registration
        const baseUrl = (import.meta as any).env.VITE_API_URL || "";
        const otpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, type: 'verification' })
        });
        
        if (!otpRes.ok) {
           const errData = await otpRes.json();
           throw new Error(errData.error || "Failed to send OTP verification email");
        }
        
        setPendingSignupArgs({ email, password, fullName, username, referralCode });
        setOtpCountDown(600);
        setOtpModalOpen(true);
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || !pendingSignupArgs) return;
    setIsVerifyingOtp(true);
    try {
       const baseUrl = (import.meta as any).env.VITE_API_URL || "";
       const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingSignupArgs.email, code: otpCode, type: 'verification' })
       });
       const verifyData = await verifyRes.json();
       if (!verifyData.success) {
          throw new Error(verifyData.error || "Invalid OTP code");
       }
       
       // Complete standard Email/Password sign up in Firebase and Firestore
       localStorage.setItem('recent_successful_signup', 'true');
       await registerWithEmail(
         pendingSignupArgs.email, 
         pendingSignupArgs.password, 
         pendingSignupArgs.fullName, 
         pendingSignupArgs.username, 
         'USD', 
         pendingSignupArgs.referralCode
       );
       localStorage.removeItem('refCode');
       toast.success("Account created successfully!");
       
       const searchParams = new URLSearchParams(location.search);
       const redirectPath = searchParams.get('redirect') || '/dashboard';
       navigate(redirectPath);
       setOtpModalOpen(false);
    } catch (err: any) {
       toast.error(err.message || 'Failed to verify OTP');
    } finally {
       setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpCountDown(600);
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const otpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingSignupArgs?.email, username: pendingSignupArgs?.username, type: 'verification' })
      });
      if (!otpRes.ok) {
        throw new Error("Failed to send new OTP");
      }
      toast.success("A new verification code has been sent!");
    } catch (e: any) {
      toast.error(e.message || "Failed to resend OTP");
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email);
    setResetError('');
    setForgotPasswordStep('email');
  };

  // Reset OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (forgotPasswordStep === 'otp' && resetOtpCountDown > 0) {
      interval = setInterval(() => {
        setResetOtpCountDown(prev => prev - 1);
      }, 1000);
    } else if (resetOtpCountDown === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [forgotPasswordStep, resetOtpCountDown]);

  // Forgot Password Wizard Handlers
  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your email address.');
      return;
    }
    setIsResetUpdating(true);
    setResetError('');
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, type: 'password_reset' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }
      toast.success('Security password reset OTP code sent successfully!');
      setResetOtpCountDown(600);
      setForgotPasswordStep('otp');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send OTP code.');
    } finally {
      setIsResetUpdating(false);
    }
  };

  const handleVerifyResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (resetOtpCode.length !== 6) {
      setResetError('Please enter a valid 6-digit code.');
      return;
    }
    setIsResetVerifying(true);
    setResetError('');
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetOtpCode, type: 'password_reset' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }
      toast.success('Security code verified. Please set your new password.');
      setForgotPasswordStep('new_password');
    } catch (err: any) {
      setResetError(err.message || 'Verification failed.');
    } finally {
      setIsResetVerifying(false);
    }
  };

  const handleCommitPasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowResetStrength(false);
    if (!newPassword || !confirmNewPassword) {
      setResetError('Please fill in both passwords.');
      return;
    }
    const pErr = validatePasswordRequirements(newPassword);
    if (pErr) {
      setResetError(pErr);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setIsResetUpdating(true);
    setResetError('');
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetOtpCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password update failed.');
      }
      toast.success('Password credentials updated successfully!');
      setForgotPasswordStep('success');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsResetUpdating(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError('');
    try {
      await login();
      
      // Strict pre-verification check to avoid dashboard flashing for social sign-ins
      const currentUser = auth.currentUser;
      if (currentUser) {
        const ADMIN_EMAILS = [
          "admin@aetheris.com",
          "samdenic01@gmail.com"
        ];
        const isAdminEmail = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');

        if (!isAdminEmail) {
          const { doc, getDoc } = await import('firebase/firestore');
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            // Bypass verification check if user is an admin
            if (uData && uData.email_verified === false && uData.role !== 'admin' && !uData.isAdmin) {
               // Check token expiration and auto-resend if expired on login
               let isTokenExpired = false;
               if (uData.verification_token_expires) {
                 const expires = uData.verification_token_expires.toDate();
                 if (Date.now() > expires.getTime()) isTokenExpired = true;
               } else if (uData.verification_token_status === 'expired') {
                 isTokenExpired = true;
               }
               
               if (isTokenExpired) {
                 try {
                   const baseUrl = (import.meta as any).env.VITE_API_URL || "";
                   await fetch(`${baseUrl}/api/auth/resend-verification`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ email: uData.email || currentUser.email, userId: currentUser.uid })
                   });
                   toast.success("A fresh verification link has been sent to your email.");
                 } catch (e) {
                   console.error("Auto resend failed", e);
                 }
               }
              navigate('/verify-email');
              return;
            }
          } else {
            // New social signup always starts as unverified and matches requirements
            navigate('/verify-email');
            return;
          }
        }
      }

      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect') || '/dashboard';
      navigate(redirectPath);
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        return;
      }
      setError(sanitizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setError('');
    if (isLogin) {
      navigate('/auth/signup');
    } else {
      navigate('/auth');
    }
  };

  const handleBiometricLogin = async () => {
    const savedEmail = localStorage.getItem('aetheris_last_email');
    if (!savedEmail || localStorage.getItem(`aetheris_bio_${savedEmail}`) !== 'enabled') {
      setError("Biometrics not configured for any account on this device. Please log in with password first.");
      return;
    }
    
    try {
      if (!window.PublicKeyCredential) throw new Error("Not supported");
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error("Device biometric authentication is not active or available.");
        return;
      }

      const challengeInfo = new Uint8Array(32);
      window.crypto.getRandomValues(challengeInfo);
      const options: CredentialRequestOptions = {
        publicKey: {
          challenge: challengeInfo,
          timeout: 60000,
          userVerification: "required"
        }
      };
      const assertion = await navigator.credentials.get(options);
      if (assertion) {
         const bioCreds = localStorage.getItem(`aetheris_bio_cred_${savedEmail}`);
         if (bioCreds) {
           setError("");
           const { email, password } = JSON.parse(atob(bioCreds));
           toast.loading("Verifying biometrics, logging in...", { id: "pwa-bio-login" });
           try {
             await loginWithEmail(email, password);
             toast.success("Identity recognized. Welcome back!", { id: "pwa-bio-login" });
             
             // Wait briefly to ensure auth state syncs
             setTimeout(() => {
               const searchParams = new URLSearchParams(window.location.search);
               const redirectPath = searchParams.get('redirect') || '/dashboard';
               navigate(redirectPath);
             }, 300);
           } catch {
             toast.error("Verification cache invalid. Please re-enter password.", { id: "pwa-bio-login" });
           }
         } else {
           toast.error("Credentials cache is empty. Please enter your account password to verify profile.");
         }
      }
    } catch(e) {
      toast.error("Biometric login cancelled or timed out.");
    }
  };

  if (isMagicLoginRoute) {
    return (
      <div className="min-h-screen bg-[#030611] text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
        {/* Radiant Glow Accents */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-md w-full space-y-8 z-10 text-center relative">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 border border-white/10 flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
              <Shield className="w-8 h-8 text-white animate-pulse" />
            </div>
            <Logo />
            <span className="text-[10px] uppercase font-black text-primary tracking-widest mt-2 font-mono">Authentication Cluster</span>
          </div>
          
          <Card className="bg-black/40 border-white/5 backdrop-blur-2xl p-8 rounded-3xl border text-center">
            <CardContent className="p-0 flex flex-col items-center">
              {magicLoginLoading && (
                <div className="space-y-6 py-6 flex flex-col items-center w-full">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Loading</h3>
                    <p className="text-xs text-muted-foreground font-mono">PLEASE WAIT...</p>
                  </div>
                </div>
              )}
              
              {magicLoginError && (
                <div className="space-y-6 py-4 flex flex-col items-center w-full">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase tracking-wider text-rose-500">Access Channel Denied</h3>
                    <p className="text-xs text-rose-400 max-w-xs leading-relaxed bg-red-500/5 border border-red-500/10 p-3 rounded-xl font-mono text-left w-full break-words">
                      {magicLoginError}
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/auth/login', { replace: true })}
                    className="w-full bg-primary hover:bg-primary/95 text-white h-12 uppercase tracking-widest font-semibold rounded-2xl"
                  >
                    Return to Login <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030611] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* Radiant Glow Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-gradient-to-tr from-primary/15 to-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Logo className="h-14 transition-transform hover:scale-105 duration-300" />
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {forgotPasswordStep !== null ? 'Reset Credentials' : isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400 font-medium">
          {forgotPasswordStep !== null ? 'Secure authentication credential recovery wizard' : isLogin ? "Sign in to access secure asset management" : "Register and unlock intelligent wealth algorithms"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="backdrop-blur-xl bg-slate-950/40 border border-white/[0.06] shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 sm:p-10">
            
            {forgotPasswordStep === 'email' && (
              <form className="space-y-4" onSubmit={handleSendResetOtp}>
                <div className="space-y-1.5">
                  <Label htmlFor="resetEmail" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Email Address</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Mail className="w-4.5 h-4.5" />
                    </span>
                    <Input 
                      id="resetEmail" 
                      type="email" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required 
                      className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                      placeholder="johndoe@email.com" 
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="text-rose-400 text-xs text-center p-3 bg-rose-500/15 border border-rose-500/20 rounded-xl leading-relaxed font-medium">
                    {resetError}
                  </div>
                )}

                <Button 
                  disabled={isResetUpdating} 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-widest font-extrabold text-xs shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 flex items-center justify-center gap-2"
                >
                  {isResetUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setForgotPasswordStep(null)}
                  className="w-full h-10 hover:bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                >
                  Cancel & Back to login
                </button>
              </form>
            )}

            {forgotPasswordStep === 'otp' && (
              <form className="space-y-6" onSubmit={handleVerifyResetOtp}>
                <div className="text-center space-y-2">
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    We sent a 6-digit verification code to:<br />
                    <span className="text-white font-semibold block mt-1 break-all">{resetEmail}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="000000"
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value)}
                    maxLength={6}
                    className="bg-black/40 border-white/10 text-white rounded-xl text-center text-2xl tracking-[0.5em] h-13 focus-visible:ring-primary font-bold"
                  />

                  {resetError && (
                    <div className="text-rose-400 text-xs text-center p-3 bg-rose-500/15 border border-rose-500/20 rounded-xl leading-relaxed font-medium">
                      {resetError}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={isResetVerifying || resetOtpCode.length !== 6 || resetOtpCountDown === 0}
                    className="w-full h-11 bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-widest font-extrabold text-xs shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 flex items-center justify-center gap-2"
                  >
                    {isResetVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        Verify OTP Code
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                  
                  <div className="flex justify-between items-center px-1">
                    <span className={`text-[10px] ${resetOtpCountDown === 0 ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                      {resetOtpCountDown === 0 ? "Code expired" : `Expires in ${Math.floor(resetOtpCountDown / 60)}:${(resetOtpCountDown % 60).toString().padStart(2, '0')}`}
                    </span>
                    <button
                      type="button"
                      disabled={resetOtpCountDown > 0}
                      onClick={handleSendResetOtp}
                      className={`text-[10px] font-bold uppercase ${resetOtpCountDown > 0 ? "text-slate-600 cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                    >
                      Resend Code
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setForgotPasswordStep('email')}
                    className="w-full h-10 hover:bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                  >
                    Change Email / Back
                  </button>
                </div>
              </form>
            )}

            {forgotPasswordStep === 'new_password' && (
              <form className="space-y-4" onSubmit={handleCommitPasswordReset}>
                 <div className="space-y-1.5">
                   <div className="flex justify-between items-center">
                     <Label htmlFor="newPassword" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">New Password</Label>
                   </div>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                       <Lock className="w-4.5 h-4.5" />
                     </span>
                     <Input 
                       id="newPassword" 
                       type={showPassword ? "text" : "password"}
                       autoComplete="new-password"
                       passwordrules="minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; required: [!@#$%^&*];"
                       value={newPassword}
                       onChange={(e) => {
                         const val = e.target.value;
                         setNewPassword(val);
                         if (val.length - newPassword.length > 1) {
                           setConfirmNewPassword(val);
                         }
                       }}
                       onFocus={() => setShowResetStrength(true)}
                       required 
                       className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 pr-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                       placeholder="Enter new strong password" 
                     />
                     <button 
                       type="button" 
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                     >
                       {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>

                   {showResetStrength && newPassword && (() => {
                     const strength = getPasswordStrength(newPassword);
                     return (
                       <div className="mt-2 space-y-2 p-3 rounded-xl bg-black/40 border border-white/[0.04] animate-in fade-in duration-300">
                         <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                           <span className="text-slate-500">Strength Parameter:</span>
                           <span className={
                             strength.score === 1 ? 'text-rose-400' :
                             strength.score === 2 ? 'text-amber-400' :
                             strength.score === 3 ? 'text-emerald-400' :
                             'text-blue-400'
                           }>
                             {strength.label}
                           </span>
                         </div>
                         
                         <div className="grid grid-cols-4 gap-1.5 h-1">
                           {[1, 2, 3, 4].map((step) => (
                             <div 
                               key={step} 
                               className={`h-full rounded-full transition-all duration-300 ${
                                 step <= strength.score ? strength.color : 'bg-white/5'
                               }`}
                             />
                           ))}
                         </div>
                         
                         <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                           <div className="flex items-center gap-1.5">
                             <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.length ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                             8-15 Characters
                           </div>
                           <div className="flex items-center gap-1.5">
                             <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.upper ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                             Uppercase (A-Z)
                           </div>
                           <div className="flex items-center gap-1.5">
                             <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.lower ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                             Lowercase (a-z)
                           </div>
                           <div className="flex items-center gap-1.5">
                             <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.number ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                             Numbers (0-9)
                           </div>
                           <div className="flex items-center gap-1.5 col-span-2">
                             <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.special ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                             Symbols (!@#$%^&*)
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                 </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmNewPassword" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Confirm New Password</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <Input 
                      id="confirmNewPassword" 
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      onFocus={() => setShowResetStrength(false)}
                      required 
                      className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                      placeholder="Verify check password" 
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="text-rose-400 text-xs text-center p-3 bg-rose-500/15 border border-rose-500/20 rounded-xl leading-relaxed font-medium">
                    {resetError}
                  </div>
                )}

                <Button 
                  disabled={isResetUpdating} 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-widest font-extrabold text-xs shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 flex items-center justify-center gap-2"
                >
                  {isResetUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating credentials...
                    </>
                  ) : (
                    <>
                      Update Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {forgotPasswordStep === 'success' && (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-3 tracking-tight text-white uppercase">Password Reset Successful</h2>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  Your account password credentials have been reset and saved successfully. You can now use your new password credentials to access your secure terminal.
                </p>
                <button
                  id="reset-success-btn"
                  onClick={() => setForgotPasswordStep(null)}
                  className="w-full h-12 bg-primary hover:bg-primary/95 shadow-[0_0_20px_rgba(30,80,255,0.4)] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  Back To Login
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {forgotPasswordStep === null && (
              <>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {!isLogin && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="fullName" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Full Name</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              <User className="w-4.5 h-4.5" />
                            </span>
                            <Input 
                              id="fullName" 
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              required 
                              className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                              placeholder="John Doe" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="username" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Username</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              <User className="w-4.5 h-4.5" />
                            </span>
                            <Input 
                              id="username" 
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              required 
                              className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                              placeholder="johndoe123" 
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Email Address</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <Mail className="w-4.5 h-4.5" />
                      </span>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                        placeholder="johndoe@email.com" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Password</Label>
                      {isLogin && (
                        <button 
                          type="button" 
                          onClick={handleForgotPassword} 
                          className="text-[10px] sm:text-xs text-primary hover:text-primary/80 transition-colors bg-transparent border-none p-0 cursor-pointer font-medium"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <Lock className="w-4.5 h-4.5" />
                      </span>
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        passwordrules={!isLogin ? "minlength: 8; maxlength: 15; required: lower; required: upper; required: digit; required: [!@#$%^&*];" : undefined}
                        value={password}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPassword(val);
                          if (!isLogin && val.length - password.length > 1) {
                            setConfirmPassword(val);
                          }
                        }}
                        onFocus={() => setShowStrength(true)}
                        required 
                        className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 pr-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                        placeholder={isLogin ? "Enter your password" : "Create a strong password (min 8 chars)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {showStrength && !isLogin && password && (() => {
                      const strength = getPasswordStrength(password);
                      return (
                        <div className="mt-2 space-y-2 p-3 rounded-xl bg-black/40 border border-white/[0.04] animate-in fade-in duration-300">
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                            <span className="text-slate-500">Strength Parameter:</span>
                            <span className={
                              strength.score === 1 ? 'text-rose-400' :
                              strength.score === 2 ? 'text-amber-400' :
                              strength.score === 3 ? 'text-emerald-400' :
                              'text-blue-400'
                            }>
                              {strength.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-1.5 h-1">
                            {[1, 2, 3, 4].map((step) => (
                              <div 
                                key={step} 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  step <= strength.score ? strength.color : 'bg-white/5'
                                }`}
                              />
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.length ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                              8-15 Characters
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.upper ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                              Uppercase (A-Z)
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.lower ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                              Lowercase (a-z)
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.number ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                              Numbers (0-9)
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${strength.criteria.special ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                              Symbols (!@#$%^&*)
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <AnimatePresence mode="wait">
                    {!isLogin && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div className="space-y-1.5 pt-0.5">
                          <Label htmlFor="confirmPassword" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Confirm Password</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                              <Lock className="w-4.5 h-4.5" />
                            </span>
                            <Input 
                              id="confirmPassword" 
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              onFocus={() => setShowStrength(false)}
                              required 
                              className="bg-black/30 border-white/10 text-white rounded-xl focus-visible:ring-primary pl-10 h-11 text-sm placeholder:text-slate-600 transition-all border border-white/[0.08]" 
                              placeholder="Re-enter your password" 
                            />
                          </div>
                        </div>

                        {/* Referral Code with Real-Time Validation Indicators */}
                        <div className="space-y-1.5">
                          <Label htmlFor="referral" className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Referral Code (Optional)</Label>
                          <div className="relative">
                            <Input 
                              id="referral" 
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value)}
                              disabled={isReferralLocked}
                              className={`bg-black/30 text-white rounded-xl focus-visible:ring-primary h-11 text-sm placeholder:text-slate-600 transition-all border pr-10 ${
                                isReferralLocked || referralStatus === 'valid' ? 'border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-500/5' : 
                                referralStatus === 'invalid' ? 'border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5' : 
                                'border-white/[0.08]'
                              }`} 
                              placeholder="Enter referral code" 
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                              {referralStatus === 'validating' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                              {(isReferralLocked || referralStatus === 'valid') && <Check className="w-4 h-4 text-emerald-400" />}
                              {!isReferralLocked && referralStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                            </div>
                          </div>
                          {isReferralLocked ? (
                            <p className="text-[10px] text-emerald-400 font-semibold tracking-wide flex items-center gap-1">
                              <Check className="w-3 h-3" /> Referral verified
                            </p>
                          ) : referralStatus === 'valid' ? (
                            <p className="text-[10px] text-emerald-400 font-semibold tracking-wide flex items-center gap-1">
                              <Check className="w-3 h-3" /> Partner bonus verification passed. $100 reward active.
                            </p>
                          ) : referralStatus === 'invalid' ? (
                            <p className="text-[10px] text-rose-400 font-semibold tracking-wide flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Token verification failed. Please delete or verify syntax.
                            </p>
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <div className="text-rose-400 text-xs text-center p-3 bg-rose-500/15 border border-rose-500/20 rounded-xl leading-relaxed font-medium">
                      {error}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Button 
                      disabled={isLoading} 
                      type="submit" 
                      className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-widest font-extrabold text-xs shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing Secure Payload...
                        </>
                      ) : (
                        <>
                          {isLogin ? 'Sign In Securely' : 'Sign Up'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/[0.08]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#0b0f19] px-3.5 text-slate-400 font-bold uppercase tracking-wider text-[9px] border border-white/[0.06] rounded-full">Or Continue with</span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={isLoading}
                      className="rounded-xl border border-white/10 hover:bg-white/5 h-11 text-xs font-semibold text-white transition-all bg-black/25 flex items-center justify-center gap-2" 
                      onClick={() => handleOAuthLogin('google')}
                    >
                      <svg className="h-4.5 w-4.5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                        <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                        <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                        <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                      </svg>
                      Google
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={isLoading}
                      className="rounded-xl border border-white/10 hover:bg-white/5 h-11 text-xs font-semibold text-white transition-all bg-black/25 flex items-center justify-center gap-2" 
                      onClick={() => handleOAuthLogin('apple')}
                    >
                      <svg className="h-4.5 w-4.5 text-white" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.68.727-1.35 2.158-1.165 3.52 1.353.104 2.61-.741 3.452-1.508z" />
                      </svg>
                      Apple
                    </Button>
                  </div>
                </div>

                <div className="mt-8 text-center border-t border-white/[0.05] pt-6">
                  <button 
                    type="button" 
                    onClick={toggleAuthMode}
                    className="text-xs text-slate-400 hover:text-primary transition-colors font-semibold cursor-pointer select-none"
                  >
                    {isLogin ? "New to Aetheris? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {!isInstalled && (
          <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md text-center">
            <button
              onClick={promptInstall}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-emerald-500/20 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4 animate-bounce" />
              Install Aetheris App
            </button>
          </div>
        )}
      </div>
      
      {/* Verification OTP Modal */}
      <AnimatePresence>
        {otpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm"
            >
              <Card className="backdrop-blur-xl bg-slate-950/80 border border-white/10 p-6 space-y-6 rounded-2xl shadow-2xl">
                <div className="text-center space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">MFA Code Sent</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Enter the 6-digit verification code sent to:<br />
                    <span className="text-white font-semibold block mt-1 break-all">{pendingSignupArgs?.email}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="bg-black/40 border-white/10 text-white rounded-xl text-center text-2xl tracking-[0.5em] h-13 focus-visible:ring-primary font-bold"
                  />
                  <Button 
                    onClick={handleVerifyOtp} 
                    className="w-full h-11 bg-primary text-white hover:bg-primary/90 font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-primary/20"
                    disabled={isVerifyingOtp || otpCode.length !== 6 || otpCountDown === 0}
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify & Register"}
                  </Button>
                  
                  <div className="flex justify-between items-center px-1">
                    <span className={`text-[10px] ${otpCountDown === 0 ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                      {otpCountDown === 0 ? "Code expired" : `Expires in ${Math.floor(otpCountDown / 60)}:${(otpCountDown % 60).toString().padStart(2, '0')}`}
                    </span>
                    <button
                      type="button"
                      disabled={otpCountDown > 0}
                      onClick={handleResendOtp}
                      className={`text-[10px] font-bold uppercase ${otpCountDown > 0 ? "text-slate-600 cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                    >
                      Resend Code
                    </button>
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={() => setOtpModalOpen(false)} 
                    className="w-full text-slate-400 hover:text-white hover:bg-white/5 h-10 text-[10px] uppercase font-bold"
                  >
                    Cancel Registration
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
