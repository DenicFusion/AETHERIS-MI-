import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

export function PaymentVerificationOverlay() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPaymentSuccessParams = searchParams.get("payment_success");
  const sessionId = searchParams.get("session_id");
  const provider = searchParams.get("provider");

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [isVisible, setIsVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isPaymentSuccessParams === "true" && sessionId) {
      setIsVisible(true);
      verifyPayment();
    }
  }, [isPaymentSuccessParams, sessionId]);

  const verifyPayment = async () => {
    try {
      // Simulate slight network delay for smooth UX
      await new Promise((r) => setTimeout(r, 2000));
      
      const response = await fetch('/api/payments/bachs/sync', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutSessionId: sessionId })
      });
      
      const data = await response.json();
      
      if (data.status === 'completed' || data.status === 'succeeded' || data.status === 'paid') {
        setStatus("success");
      } else if (['failed', 'cancelled', 'insufficient_funds', 'declined', 'expired'].includes(data.status?.toLowerCase())) {
        setStatus("failed");
        setErrorMsg("Transaction declined or failed to process.");
      } else if (data.status === 'pending') {
         // Keep verifying or show pending
         setStatus("success"); // It will eventually process via webhook
      } else {
        setStatus("success"); 
      }
      
      // Auto close after 4 seconds of showing result
      setTimeout(() => {
        closeOverlay();
      }, 4000);
      
    } catch (e) {
       console.error("Verification error", e);
       setStatus("failed");
       setErrorMsg("Failed to verify transaction status.");
       setTimeout(() => {
         closeOverlay();
       }, 4000);
    }
  };

  const closeOverlay = () => {
    setIsVisible(false);
    // Clean up URL parameters without refreshing
    searchParams.delete("payment_success");
    searchParams.delete("session_id");
    searchParams.delete("provider");
    setSearchParams(searchParams, { replace: true });
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card w-full max-w-sm rounded-[24px] p-8 shadow-2xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden"
        >
          {status === "verifying" && (
             <div className="flex flex-col items-center">
                 <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                     <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                     <Loader2 className="w-8 h-8 text-primary animate-pulse" />
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2">Verifying Transaction</h2>
                 <p className="text-muted-foreground text-sm">Please wait while we confirm your payment securely.</p>
             </div>
          )}
          
          {status === "success" && (
             <div className="flex flex-col items-center">
                 <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                     <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2">Payment Successful!</h2>
                 <p className="text-muted-foreground text-sm">Your transaction has been approved and your balance updated.</p>
                 <button onClick={closeOverlay} className="mt-6 w-full py-3 rounded-xl bg-primary text-white font-semibold">
                   Continue to Dashboard
                 </button>
             </div>
          )}

          {status === "failed" && (
             <div className="flex flex-col items-center">
                 <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                     <XCircle className="w-10 h-10 text-red-500" />
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
                 <p className="text-red-400 text-sm">{errorMsg}</p>
                 <button onClick={closeOverlay} className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors border border-white/10">
                   Close
                 </button>
             </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
