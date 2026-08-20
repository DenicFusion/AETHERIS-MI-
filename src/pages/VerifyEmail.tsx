import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, AlertTriangle, Loader2, LogOut, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  const [verifying, setVerifying] = useState(!!(token && userId));
  const [status, setStatus] = useState<'idle' | 'success' | 'expired' | 'error'>( 'idle' );
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resentSuccess, setResentSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // Fetch unverified user's email if they are logged in or verify mode is running
  useEffect(() => {
    async function loadUserEmail() {
      const targetId = userId || user?.uid;
      // Security Guard: Since standard users have NO permission to read other users' documents
      // in Firestore, we should NOT call getDoc if we do not own the document (targetId !== user?.uid)
      // or if there is no logged-in user at all.
      if (targetId && user && user.uid === targetId) {
        try {
          const uSnap = await getDoc(doc(db, 'users', targetId));
          if (uSnap.exists()) {
            const data = uSnap.data();
            setUserEmail(data.email || null);
            
            // Check if the verification token has already expired
            if (data.verification_token_expires) {
              const expires = data.verification_token_expires.toDate();
              if (Date.now() > expires.getTime()) {
                setIsTokenExpired(true);
              } else {
                setIsTokenExpired(false);
              }
            } else if (data.verification_token_status === 'expired') {
              setIsTokenExpired(true);
            }
          }
        } catch (e) {
          console.error("Error loading email:", e);
        }
      } else {
        // If not logged in as the target user, we can retrieve/display the email from active auth (if applicable)
        if (user && !userId) {
          setUserEmail(user.email || null);
        }
      }
    }
    loadUserEmail();
  }, [user, userId]);

  // Handle URL token verification on mount
  useEffect(() => {
    if (token && userId) {
      confirmVerification(token, userId);
    }
  }, [token, userId]);

  const confirmVerification = async (verifyToken: string, targetUserId: string) => {
    setVerifying(true);
    setStatus('idle');
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/auth/confirm-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken, userId: targetUserId })
      });
      const data = await res.json();
      if (data.email) {
        setUserEmail(data.email);
      }
      if (res.ok && data.success) {
        setStatus('success');
        toast.success("Account verified successfully!");
      } else {
        if (data.expired) {
          setStatus('expired');
          setErrorMessage(data.error || "The verification link has expired.");
          setIsTokenExpired(true);
        } else {
          setStatus('error');
          setErrorMessage(data.error || "Invalid or invalid verification link.");
        }
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e?.message || "Something went wrong verifying your account.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = userEmail || user?.email;
    const targetId = userId || user?.uid;

    if (!targetEmail && !targetId) {
      toast.error("Unable to identify email. Please sign in again.");
      return;
    }

    setResending(true);
    setResentSuccess(false);

    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, userId: targetId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResentSuccess(true);
        toast.success("Verification link resent to your email.");
      } else {
        toast.error(data.error || "Failed to resend verification link.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to resend verification link.");
    } finally {
      setResending(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10 flex flex-col items-center">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-2"
        >
          <img src="https://aetheriss.online/AEfavicon.png" alt="Aetheris" className="h-10 w-auto object-contain" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-slate-900/40 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center"
        >
          <AnimatePresence mode="wait">
            {verifying && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center py-8"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-semibold mb-2">Verifying Account</h2>
                <p className="text-slate-400 text-sm">Please wait while we authenticate your account with the secure token...</p>
              </motion.div>
            )}

            {!verifying && status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-4"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Verified Successfully!</h2>
                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                  Your account has been verified successfully. Welcome to Aetheris!
                </p>
                <button
                  id="dashboard-continue-btn"
                  onClick={handleGoToDashboard}
                  className="w-full h-12 bg-primary hover:bg-primary/95 shadow-[0_0_20px_rgba(30,80,255,0.4)] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  View Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {!verifying && status === 'expired' && (
              <motion.div
                key="expired"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-4"
              >
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-rose-400">Verification Expired</h2>
                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                  {errorMessage || "That authentication link is expired or invalid. Please request a fresh link."}
                </p>
                <button
                  id="resend-expired-btn"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full h-12 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Resend Verification Link
                </button>
                {resentSuccess && (
                  <p className="text-emerald-400 text-xs mt-3 font-medium">
                    New link sent! Please check your inbox.
                  </p>
                )}
                <button
                  onClick={() => navigate('/auth')}
                  className="mt-6 text-sm text-slate-400 hover:text-white flex items-center gap-2"
                >
                  Back to Log In
                </button>
              </motion.div>
            )}

            {!verifying && status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-4"
              >
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-rose-400">Verification Failed</h2>
                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                  {errorMessage || "The authentication token is invalid or has already been used."}
                </p>
                <button
                  id="resend-error-btn"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full h-12 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Resend Verification Link
                </button>
                {resentSuccess && (
                  <p className="text-emerald-400 text-xs mt-3 font-medium">
                    New link sent! Please check your inbox.
                  </p>
                )}
                <button
                  onClick={() => navigate('/auth')}
                  className="mt-6 text-sm text-slate-400 hover:text-white flex items-center gap-2"
                >
                  Back to Log In
                </button>
              </motion.div>
            )}

            {!verifying && status === 'idle' && (
              <motion.div 
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-2"
              >
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(30,80,255,0.15)] animate-pulse">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Verify Your Email</h2>
                
                {isTokenExpired ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs mb-6 font-medium text-left flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Link Expired</p>
                      <p className="text-rose-300">Your verification link has expired because it was not used within 30 minutes. Please click the button below to generate a new valid verification link.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      Please verify your email to continue using Aetheris. Check your inbox to confirm your account. We sent a secure verification link to:
                    </p>
                    <p className="text-rose-400 font-medium text-xs mb-6">
                      Your verification link expires in 30 minutes.
                    </p>
                  </>
                )}
                
                <p className="text-slate-400 text-xs mb-8 italic">
                  <span className="block text-slate-200 text-sm font-semibold mt-1 not-italic">
                    {userEmail || user?.email || "your registered email"}
                  </span>
                </p>

                <div className="w-full space-y-3">
                  {!isTokenExpired && (
                    <button
                      id="goto-mail-btn"
                      onClick={() => { window.location.href = 'mailto:'; }}
                      className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(30,80,255,0.3)]"
                    >
                      <Mail className="w-4 h-4" />
                      Go To Mail
                    </button>
                  )}
                  {isTokenExpired && (
                    <button
                      id="resend-unverified-btn"
                      onClick={handleResend}
                      disabled={resending}
                      className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 shadow-[0_0_20px_rgba(30,80,255,0.3)]"
                    >
                      {resending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Resend Verification Link
                    </button>
                  )}
                  
                  {resentSuccess && isTokenExpired && (
                    <p className="text-emerald-400 text-xs font-medium pb-2">
                       A brand-new verification link has been sent!
                    </p>
                  )}

                  <button
                    id="logout-verify-btn"
                    onClick={logout}
                    className="w-full h-10 hover:bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout & Use Another Account
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
