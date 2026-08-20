import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { 
  Clock, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Share2, 
  Copy, 
  X, 
  Loader2, 
  ArrowLeft,
  Camera,
  UploadCloud,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  Check,
  Zap,
  Lock,
  Scan,
  RefreshCcw,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toPng, toBlob } from 'html-to-image';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface WithdrawalReceiptProps {
  withdrawal: {
    id: string;
    userId: string;
    referenceId: string;
    amount: number;
    processingFee?: number;
    netAmount?: number;
    method: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber?: string;
    status: 'pending' | 'approved' | 'completed' | 'declined';
    submittedAt?: any;
    approvedAt?: any;
    completedAt?: any;
    declinedAt?: any;
    declineReason?: string | null;
    estimatedArrival?: string;
    verificationSteps?: any[];
  };
  onClose?: () => void;
  onRetry?: () => void;
}

export function WithdrawalReceipt({ withdrawal: initialWithdrawal, onClose, onRetry }: WithdrawalReceiptProps) {
  const [withdrawal, setWithdrawal] = useState(initialWithdrawal);

  // Sync with initial props
  useEffect(() => {
    setWithdrawal(initialWithdrawal);
  }, [initialWithdrawal]);

  // Real-time Firestore subscription to this transaction
  useEffect(() => {
    if (!withdrawal?.id) return;

    const docRef = doc(db, 'transactions', withdrawal.id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setWithdrawal(prev => ({
          ...prev,
          ...data,
          id: snapshot.id,
        }) as any);
      }
    }, (error) => {
      console.error("Error listening to transaction changes:", error);
    });

    return () => unsubscribe();
  }, [withdrawal?.id]);

  const { formatCurrency } = useCurrency();
  const [isDownloadingPNG, setIsDownloadingPNG] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Verification document states
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(!!withdrawal.declineReason?.includes("SUBMITTED") || withdrawal.declineReason === "verification_submitted");

  if (!withdrawal) return null;

  const {
    id,
    referenceId,
    amount,
    processingFee = 25,
    netAmount = Math.max(0, amount - 25),
    method,
    bankName,
    accountName,
    accountNumber,
    routingNumber,
    status,
    submittedAt,
    approvedAt,
    completedAt,
    declinedAt,
    declineReason,
    estimatedArrival = '1–5 Business Days',
    verificationSteps = []
  } = withdrawal;

  const handleUploadVerificationDocs = async () => {
    if (!frontFile || !backFile) {
      toast.error("Please select both the front and back photos of your identity document.");
      return;
    }

    setIsUploadingDocs(true);
    try {
      toast.loading("Uploading front verification snap...");
      const frontRes = await uploadToCloudinary(frontFile);
      
      toast.loading("Uploading back verification snap...");
      const backRes = await uploadToCloudinary(backFile);

      toast.loading("Securing database connection...");
      const txRef = doc(db, 'transactions', id);
      await updateDoc(txRef, {
        document_front_url: frontRes.url,
        document_back_url: backRes.url,
        document_uploaded_at: new Date(),
        document_verification_status: 'submitted',
        rejection_reason: 'Verification Documents Received. Admin review in progress.'
      });

      setVerificationSubmitted(true);
      toast.dismiss();
      toast.success("Identity documents submitted successfully for administrative review!");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to submit verification images.");
    } finally {
      setIsUploadingDocs(false);
    }
  };

  const renderMethodDetails = () => {
    const isWire = method === 'Bank Wire Transfer' || method === 'wire';
    const isPaypal = method === 'PayPal' || method === 'paypal';
    const isCashApp = method === 'Cash App' || method === 'cashapp';
    const isCrypto = !isWire && !isPaypal && !isCashApp;

    return (
      <>
        {isWire && (
          <>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Account Holder</span>
              <span className="font-bold text-white">{accountName || 'N/A'}</span>
            </div>
            <div className="w-full h-px bg-white/5" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Bank Name</span>
              <span className="font-bold text-white">{bankName || 'N/A'}</span>
            </div>
            {routingNumber && (
              <>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Routing / SWIFT / BIC</span>
                  <span className="font-bold text-white font-mono">{routingNumber}</span>
                </div>
              </>
            )}
            <div className="w-full h-px bg-white/5" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Account Number / IBAN</span>
              <span className="font-bold text-white font-mono">
                {accountNumber ? (accountNumber.length > 8 && !accountNumber.includes('@') ? `••••${accountNumber.slice(-4)}` : accountNumber) : 'N/A'}
              </span>
            </div>
          </>
        )}
        
        {isPaypal && (
          <>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">PayPal Email</span>
              <span className="font-bold text-white font-mono">{accountNumber || 'N/A'}</span>
            </div>
          </>
        )}

        {isCashApp && (
          <>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Cash App Tag</span>
              <span className="font-bold text-white font-mono">{accountNumber || 'N/A'}</span>
            </div>
          </>
        )}

        {isCrypto && (
          <>
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Network</span>
              <span className="font-bold text-white">{bankName || 'USDT Network'}</span>
            </div>
            <div className="w-full h-px bg-white/5" />
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Wallet Address</span>
              <span className="font-bold text-white font-mono text-[11px] max-w-[200px] truncate" title={accountNumber}>
                {accountNumber || 'N/A'}
              </span>
            </div>
          </>
        )}
      </>
    );
  };

  // Format Dates
  const formatDate = (timestampObj: any) => {
    if (!timestampObj) return 'N/A';
    try {
      const date = timestampObj.toDate ? timestampObj.toDate() : new Date(timestampObj);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timestampObj: any) => {
    if (!timestampObj) return 'N/A';
    try {
      const date = timestampObj.toDate ? timestampObj.toDate() : new Date(timestampObj);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return 'N/A';
    }
  };

  const copyReference = () => {
    navigator.clipboard.writeText(referenceId);
    toast.success('Reference number copied to clipboard');
  };

  const generateReceiptBlob = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    const element = document.getElementById('printable-withdrawal-receipt');
    if (!element) {
      toast.error('Receipt content not found');
      return null;
    }

    try {
      // 1. Generate high-resolution PNG using html-to-image with skipFonts: true to prevent remote stylesheet / CORS access errors
      const options = {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#0b1022',
        cacheBust: true,
        skipFonts: true,
        filter: (node: HTMLElement) => {
          // Exclude hidden translation iframes or scripts
          const tagName = node.tagName?.toLowerCase();
          if (tagName === 'script' || tagName === 'iframe' || tagName === 'noscript') return false;
          if (node.classList?.contains('goog-te-banner-frame') || node.classList?.contains('skiptranslate')) return false;
          return true;
        },
        style: {
          margin: '0',
          borderRadius: '24px',
        }
      };

      const dataUrl = await toPng(element, options);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return { blob, dataUrl };
    } catch (error: any) {
      console.warn('html-to-image toPng fallback to toBlob:', error);
      try {
        const blob = await toBlob(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#0b1022',
          skipFonts: true,
        });
        if (blob) {
          const dataUrl = URL.createObjectURL(blob);
          return { blob, dataUrl };
        }
      } catch (fallbackErr) {
        console.error('Fallback image generation failed:', fallbackErr);
      }
      toast.error(`Receipt generation error: ${error.message || error}`);
      return null;
    }
  };

  const handleDownloadReceipt = async () => {
    if (isDownloadingPNG) return;
    setIsDownloadingPNG(true);
    const toastId = toast.loading('Generating receipt PNG image...');

    try {
      const result = await generateReceiptBlob();
      if (!result) {
        toast.dismiss(toastId);
        return;
      }

      const { blob, dataUrl } = result;
      const filename = `Aetheris-Withdrawal-${referenceId || 'Receipt'}.png`;

      // Trigger actual download via blob URL
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 2500);

      toast.dismiss(toastId);
      toast.success('Withdrawal receipt downloaded as PNG!');
    } catch (err: any) {
      console.error('Download error:', err);
      toast.dismiss(toastId);
      toast.error('Direct download failed. Opening image preview...');
      
      try {
        const result = await generateReceiptBlob();
        if (result?.dataUrl) {
          const win = window.open();
          if (win) {
            win.document.write(`<title>Receipt - ${referenceId}</title><body style="margin:0;background:#050816;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${result.dataUrl}" style="max-width:95%;border-radius:16px;box-shadow:0 0 30px rgba(0,0,0,0.8);" /></body>`);
          }
        }
      } catch (e) {}
    } finally {
      setIsDownloadingPNG(false);
    }
  };

  const handleShareReceipt = async () => {
    if (isSharing) return;
    setIsSharing(true);
    const toastId = toast.loading('Preparing receipt to share...');

    try {
      const filename = `Aetheris-Withdrawal-${referenceId || 'Receipt'}.png`;
      const shareTitle = `Aetheris Withdrawal Receipt - ${referenceId}`;
      const shareText = `Aetheris Withdrawal of ${formatCurrency(amount)} (${status.toUpperCase()}) - Reference: ${referenceId}`;

      const result = await generateReceiptBlob();

      if (result) {
        const { blob, dataUrl } = result;
        const file = new File([blob], filename, { type: 'image/png' });

        // Check if device supports sharing files via native Web Share API (Android, iOS, etc.)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          toast.dismiss(toastId);
          await navigator.share({
            files: [file],
            title: shareTitle,
            text: shareText,
          });
          toast.success('Receipt shared successfully!');
          return;
        }
      }

      // Fallback 1: Web Share text/url if file sharing not supported
      if (navigator.share) {
        toast.dismiss(toastId);
        await navigator.share({
          title: shareTitle,
          text: `${shareText}\nView receipt on Aetheris.`,
          url: window.location.href,
        });
        toast.success('Receipt shared!');
        return;
      }

      // Fallback 2: Copy link to clipboard and trigger PNG download
      toast.dismiss(toastId);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        toast.success('Share text copied! Downloading receipt image...');
      }

      if (result) {
        const blobUrl = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        toast.dismiss(toastId);
        toast.error('Share action could not be completed.');
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Timeline Step styling helper
  const getStepStatus = (stepIndex: number) => {
    if (status === 'completed') {
      if (stepIndex <= 2) return 'completed';
      return 'active_completed';
    }
    if (status === 'approved') {
      if (stepIndex <= 1) return 'completed';
      if (stepIndex === 2) return 'active';
      return 'disabled';
    }
    if (status === 'declined') {
      if (stepIndex === 0) return 'completed';
      if (stepIndex === 1) return 'declined';
      return 'disabled';
    }
    // pending
    if (stepIndex === 0) return 'completed';
    if (stepIndex === 1) return 'active';
    return 'disabled';
  };

  // Status configuration definitions
  const statusConfig = {
    pending: {
      color: '#FFC107',
      bg: 'bg-[#FFC107]/10',
      border: 'border-[#FFC107]/30',
      ringBorder: 'border-amber-400',
      glow: 'shadow-[0_0_20px_rgba(255,193,7,0.2)]',
      textColor: 'text-amber-400',
      icon: <Clock className="w-9 h-9 text-amber-400 stroke-[2]" />,
      title: 'Withdrawal Request Submitted',
      message: 'Your withdrawal request has been received and is currently under review.',
      badgeText: 'PENDING REVIEW'
    },
    approved: {
      color: '#3B82F6',
      bg: 'bg-[#3B82F6]/10',
      border: 'border-[#3B82F6]/30',
      ringBorder: 'border-blue-500',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
      textColor: 'text-blue-400',
      icon: <Shield className="w-9 h-9 text-blue-400 stroke-[2]" />,
      title: 'Withdrawal Approved',
      message: 'Your withdrawal has been approved. Your withdrawal will be disbursed in or within 24 hours.',
      badgeText: 'APPROVED'
    },
    completed: {
      color: '#10B981',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      ringBorder: 'border-emerald-500',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]',
      textColor: 'text-emerald-400',
      icon: <Check className="w-10 h-10 text-emerald-400 stroke-[2.8]" />,
      title: 'Funds Successfully Sent',
      message: 'Your funds have been released to the destination account.',
      badgeText: 'COMPLETED'
    },
    declined: {
      color: '#EF4444',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      ringBorder: 'border-rose-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
      textColor: 'text-rose-400',
      icon: <X className="w-10 h-10 text-rose-400 stroke-[2.8]" />,
      title: 'Withdrawal Declined',
      message: declineReason || 'Unfortunately this withdrawal could not be processed.',
      badgeText: 'DECLINED'
    }
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;

  return (
    <div className="text-white w-full max-w-[580px] mx-auto bg-[#070b18] p-4 sm:p-6 md:p-8 pb-14 sm:pb-16 relative">
      
      {/* Top action bar - Single unified clean close button */}
      {onClose && (
        <div className="flex justify-end items-center mb-4">
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all border border-white/10 cursor-pointer shadow-sm active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Printable Section */}
      <div id="printable-withdrawal-receipt" className="space-y-6">
        
        {/* Header Icon, Badge and Message */}
        <div className="flex flex-col items-center text-center space-y-3.5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${currentStatus.bg} ${currentStatus.glow} border-2 ${currentStatus.ringBorder}`}>
            {currentStatus.icon}
          </div>
          
          <div className="space-y-1.5">
            <span className={`inline-block text-[11px] font-black tracking-widest px-3.5 py-1 rounded-full border ${currentStatus.bg} ${currentStatus.textColor} ${currentStatus.border}`}>
              {currentStatus.badgeText}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">{currentStatus.title}</h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
              {currentStatus.message}
            </p>
          </div>
        </div>

        {/* Display specific fields according to status definitions */}
        <div className="bg-[#0b1022]/90 rounded-2xl border border-white/5 p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
          
          {/* Subtle decoration */}
          <div className="absolute right-0 top-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Amount Box */}
          <div className="bg-[#0f1730]/80 rounded-xl border border-white/5 p-4 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">WITHDRAWAL AMOUNT</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1.5 tracking-tight">
              {formatCurrency(amount)}
            </div>
          </div>

          {/* Table Details */}
          <div className="space-y-3 pt-1 text-xs sm:text-sm">
            {/* Reference ID (shown in all) */}
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Reference Number</span>
              <div className="flex items-center gap-1.5 font-bold text-white font-mono">
                <span>{referenceId}</span>
                <button onClick={copyReference} className="hover:text-blue-400 transition-colors cursor-pointer">
                  <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-blue-400" />
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-white/5" />

            {/* PENDING SPECIFIC */}
            {status === 'pending' && (
              <>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Estimated Processing</span>
                  <span className="font-bold text-white">{estimatedArrival}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Withdrawal Method</span>
                  <span className="font-bold text-white">{method || 'Bank Wire Transfer'}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                {renderMethodDetails()}
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Date Submitted</span>
                  <span className="font-bold text-white">{formatDate(submittedAt)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Time Submitted</span>
                  <span className="font-bold text-white">{formatTime(submittedAt)}</span>
                </div>
              </>
            )}

            {/* APPROVED SPECIFIC */}
            {status === 'approved' && (
              <>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Approval Date</span>
                  <span className="font-bold text-white">{formatDate(approvedAt || submittedAt)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Estimated Arrival</span>
                  <span className="font-bold text-white">{estimatedArrival}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Withdrawal Method</span>
                  <span className="font-bold text-white">{method || 'Bank Wire Transfer'}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                {renderMethodDetails()}
              </>
            )}

            {/* COMPLETED SPECIFIC */}
            {status === 'completed' && (
              <>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Transfer Amount</span>
                  <span className="font-bold text-white">{formatCurrency(amount)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Processing Fee</span>
                  <span className="font-bold text-amber-400">{formatCurrency(processingFee)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-200">Net Amount Sent</span>
                  <span className="text-[#10B981] font-bold">{formatCurrency(netAmount)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Settlement Date</span>
                  <span className="font-bold text-white">{formatDate(completedAt || submittedAt)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Payout Method</span>
                  <span className="font-bold text-white">{method || 'Bank Wire Transfer'}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                {renderMethodDetails()}
              </>
            )}

            {/* DECLINED SPECIFIC */}
            {status === 'declined' && (
              <>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Decline Date</span>
                  <span className="font-bold text-white">{formatDate(declinedAt || submittedAt)}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex flex-col gap-1.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <span className="font-bold text-red-400 uppercase text-[10px] tracking-wide">Decline Reason</span>
                  <span className="text-white text-xs leading-relaxed font-medium">
                    {verificationSteps && verificationSteps.length > 0 
                      ? 'Administrative security hold. Proceed to the steps required below to resume settlement.'
                      : (declineReason || 'Account mismatch or routing invalidation error.')}
                  </span>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Support Contact</span>
                  <a href="mailto:support@update.aetheriss.online" className="font-bold text-[#3B82F6] hover:underline cursor-pointer">support@update.aetheriss.online</a>
                </div>
                <div className="w-full h-px bg-white/5" />
              </>
            )}

            {/* DYNAMIC VERIFICATION FLOW (ONLY FOR TARGETED USERS WITH ASSIGNED STEPS) */}
            {verificationSteps && verificationSteps.length > 0 && (
              <div className="pt-2 space-y-4">
                <p className="text-[10px] text-muted-foreground uppercase font-black text-center tracking-widest">
                  Identity Verification Protocol
                </p>
                <div className="space-y-4">
                  {/* Step Progress Checklist */}
                  <div className="bg-[#0b0f19] border border-blue-500/20 rounded-2xl p-4.5 space-y-4 shadow-[0_4px_25px_rgba(30,58,138,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 animate-pulse text-amber-400" /> Compliance Progress Roadmap
                      </p>
                      <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider px-2 py-0.5 bg-white/5 rounded-full">
                        {verificationSteps.filter((s:any) => s.status === 'approved').length} / {verificationSteps.length} CLEARED
                      </span>
                    </div>

                    <div className="space-y-3">
                      {verificationSteps.map((step: any, idx: number) => {
                        const isApproved = step.status === 'approved';
                        const isReviewing = step.status === 'pending_admin';
                        const isRejected = step.status === 'rejected';
                        const isActive = verificationSteps.findIndex((s: any) => s.status !== 'approved') === idx;

                        let badgeStyle = "text-slate-400 bg-white/5";
                        let statusText = "Upcoming";
                        let rowStyle = "opacity-50 grayscale-[40%]";

                        if (isApproved) {
                          badgeStyle = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
                          statusText = "CLEARED";
                          rowStyle = "border-emerald-500/20 bg-emerald-500/[0.01]";
                        } else if (isReviewing) {
                          badgeStyle = "text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse";
                          statusText = "REVIEWING";
                          rowStyle = "border-amber-500/10 bg-amber-500/[0.01]";
                        } else if (isRejected) {
                          badgeStyle = "text-red-400 bg-red-500/10 border border-red-500/20";
                          statusText = "UNRESOLVED";
                          rowStyle = "border-red-500/10 bg-red-500/[0.01]";
                        } else if (isActive) {
                          badgeStyle = "text-blue-400 bg-blue-500/15 border border-blue-500/30 font-black animate-pulse";
                          statusText = "ACTIVE TARGET";
                          rowStyle = "border-blue-500/30 bg-blue-500/[0.02] ring-1 ring-blue-500/10";
                        }

                        return (
                          <div 
                            key={step.id || idx} 
                            className={`flex flex-col gap-2 p-3.5 border rounded-xl transition-all ${rowStyle}`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                  isApproved 
                                    ? 'bg-emerald-500 text-slate-950 font-black' 
                                    : isActive 
                                      ? 'bg-blue-500 text-slate-950 font-black shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                                      : 'bg-white/5 text-slate-300'
                                }`}>
                                  {isApproved ? '✓' : idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className={`text-xs font-bold leading-tight ${isActive ? 'text-white text-[13px]' : 'text-slate-300'}`}>
                                    {step.instruction}
                                  </p>
                                  <p className="text-[10px] text-slate-500 leading-normal mt-1 font-medium">
                                    Format: {step.inputType === 'both' ? 'Biometric + Text Statement' : step.inputType === 'image' ? 'Biometric Document Scanner' : 'Text Input Details'}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${badgeStyle}`}>
                                {statusText}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Display the active step input form */}
                  {(() => {
                    let activeIdx = verificationSteps.findIndex((s: any) => s.status !== 'approved' && s.status !== 'pending_admin');
                    
                    if (activeIdx === -1) {
                      activeIdx = verificationSteps.findIndex((s: any) => s.status === 'pending_admin');
                    }

                    if (activeIdx === -1) {
                      return (
                        <div className="p-6 bg-gradient-to-b from-emerald-500/15 to-emerald-950/20 border border-emerald-500/35 rounded-[24px] text-center space-y-4 shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
                          <div className="inline-flex p-3 bg-emerald-500/20 rounded-full text-emerald-400 border border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
                            <CheckCircle className="w-8 h-8" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">All Clearpoints Passed</h4>
                            <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto font-medium">
                              Your compliance documents have been fully approved by the administration desk. Your withdrawal will be disbursed in or within 24 hours.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const activeStep = verificationSteps[activeIdx];

                    return (
                      <ActiveStepForm 
                        step={activeStep} 
                        stepIndex={activeIdx} 
                        transactionId={id} 
                        allSteps={verificationSteps}
                        onClose={onClose}
                      />
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visual Timeline Tracker */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">WITHDRAWAL TIMELINE</h3>
          
          <div className="bg-[#0b1022]/90 rounded-2xl border border-white/5 p-5 space-y-5 shadow-sm">
            {/* Steps Nodes */}
            {[
              { title: 'Submitted', desc: status === 'declined' ? 'Request Rejected' : 'Withdrawal successfully initiated', date: formatDate(submittedAt) },
              { title: 'Under Review', desc: 'System risk & metric validation audits', date: status === 'pending' ? 'Active now' : 'Diligence passed' },
              { title: 'Approved', desc: 'Settlement pipeline clearance granted', date: status === 'approved' ? 'Settling now' : formatDate(approvedAt || submittedAt) },
              { title: 'Funds Sent', desc: 'Secure assets released downstream', date: formatDate(completedAt || submittedAt) }
            ].map((step, idx) => {
              const state = getStepStatus(idx);
              const isActive = state === 'active';
              const isCompleted = state === 'completed';
              const isActiveCompleted = state === 'active_completed';
              const isStepDeclined = state === 'declined';
              
              let circleColor = 'border-slate-800 bg-slate-900/50 text-slate-600';
              let textColor = 'text-slate-400';
              let lineStyle = 'border-slate-800';

              if (isCompleted) {
                circleColor = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
                textColor = 'text-white font-bold';
                lineStyle = 'border-emerald-500';
              } else if (isActiveCompleted) {
                circleColor = 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]';
                textColor = 'text-white font-bold';
                lineStyle = 'border-emerald-500';
              } else if (isActive) {
                circleColor = 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)] animate-pulse';
                textColor = 'text-white font-bold';
                lineStyle = 'border-slate-800';
              } else if (isStepDeclined) {
                circleColor = 'border-rose-500 bg-rose-500/20 text-rose-400';
                textColor = 'text-rose-400 font-bold';
                lineStyle = 'border-slate-800';
              }

              return (
                <div key={idx} className="flex gap-3.5 relative">
                  {/* Line connection */}
                  {idx < 3 && (
                    <div className={`absolute left-[13px] top-[26px] h-[calc(100%+14px)] w-0.5 border-l-2 ${isCompleted || isActiveCompleted ? 'border-emerald-500' : 'border-slate-800'}`} />
                  )}

                  {/* Dot */}
                  <div className={`w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center text-[11px] font-bold z-10 shrink-0 ${circleColor}`}>
                    {isStepDeclined ? (
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : isActiveCompleted ? (
                      <Zap className="w-3.5 h-3.5 fill-current text-blue-400" />
                    ) : isActive ? (
                      <Zap className="w-3.5 h-3.5 fill-current text-blue-400" />
                    ) : (
                      <span className="text-slate-600 font-medium">{idx + 1}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex justify-between items-start w-full min-w-0 pt-0.5">
                    <div className="min-w-0 pr-2">
                      <p className={`text-sm ${textColor}`}>{step.title}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{step.desc}</p>
                    </div>
                    {step.date !== 'N/A' && (
                      <span className="text-xs text-slate-500 shrink-0 font-medium">{step.date}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Downloader & Shared Action Buttons */}
      <div className="mt-8 space-y-3.5">
        <button
          id="btn-download-receipt"
          onClick={handleDownloadReceipt}
          disabled={isDownloadingPNG}
          className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-[0_4px_25px_rgba(79,70,229,0.35)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        >
          {isDownloadingPNG ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating PNG Receipt...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </>
          )}
        </button>

        <button
          id="btn-share-receipt"
          onClick={handleShareReceipt}
          disabled={isSharing}
          className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-[#0b1022] hover:bg-[#131a35] text-white border border-white/10 font-bold text-sm shadow-sm active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        >
          {isSharing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Opening Share Sheet...</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Receipt</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
  }

  function ActiveStepForm(props: { step: any; stepIndex: number; transactionId: string; allSteps: any[]; onClose?: () => void }) {
      const { step, stepIndex, transactionId, allSteps, onClose } = props;
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // High-Tech Biometric Dual Camera States
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  
  const [frontSnapshot, setFrontSnapshot] = useState<string | null>(null);
  const [backSnapshot, setBackSnapshot] = useState<string | null>(null);
  const [frontFeedback, setFrontFeedback] = useState<string>('');
  const [backFeedback, setBackFeedback] = useState<string>('');
  const [frontConfidence, setFrontConfidence] = useState<number>(0);
  const [backConfidence, setBackConfidence] = useState<number>(0);

  // Advanced OCR & Security states
  const [frontOcr, setFrontOcr] = useState<any>(null);
  const [backOcr, setBackOcr] = useState<any>(null);
  const [frontSecurity, setFrontSecurity] = useState<any>(null);
  const [backSecurity, setBackSecurity] = useState<any>(null);

  // Real-time dynamic confidence scores
  const [docDetectConfidence, setDocDetectConfidence] = useState<number>(0);
  const [readabilityConfidence, setReadabilityConfidence] = useState<number>(0);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [overallCaptureConfidence, setOverallCaptureConfidence] = useState<number>(0);

  // Robust references for fast automatic submission
  const frontSnapshotRef = useRef<string | null>(null);
  const frontFeedbackRef = useRef<string>('');
  const frontConfidenceRef = useRef<number>(0);
  const frontOcrRef = useRef<any>(null);
  const frontSecurityRef = useRef<any>(null);
  
  const [apiFeedback, setApiFeedback] = useState<string>('Initiate verification by tapping UPLOAD ID.');
  
  // Real-time quality verification scores (calculated dynamically on live feed pixels)
  const [alignmentScore, setAlignmentScore] = useState(35);
  const [sharpnessScore, setSharpnessScore] = useState(40);
  const [glareScore, setGlareScore] = useState(60);
  const [brightnessScore, setBrightnessScore] = useState(50);
  const [tiltScore, setTiltScore] = useState(15);
  const [readabilityScore, setReadabilityScore] = useState(40);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode] = useState<'environment'>('environment'); // Rear camera only
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const hasUploadedImages = Boolean(step.submittedImage && step.submittedImageBack) && step.status !== 'rejected' && step.status !== 'pending';
  const needsImage = (step.inputType === 'image' || step.inputType === 'both') && !hasUploadedImages;
  const needsText = step.inputType === 'text' || step.inputType === 'both';

  // Automated capture verification states
  const [compliancePassed, setCompliancePassed] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState("Position document inside the green guidance bracket.");
  
  const [verificationState, setVerificationState] = useState<'idle' | 'prompt' | 'scanning'>('idle');
  const [isVerifyingBackground, setIsVerifyingBackground] = useState(false);
  const [lastVerifyTime, setLastVerifyTime] = useState<number>(0);
  const [tempVerifiedData, setTempVerifiedData] = useState<any | null>(null);

  // Bind video element srcObject as soon as stream or ref is available (fully fixes black screen race condition)
  useEffect(() => {
    if (videoRef.current && stream) {
      try {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch(e => {
          console.warn("Video play interrupted or blocked:", e);
        });
      } catch (err) {
        console.error("Error setting video stream:", err);
      }
    }
  }, [stream, verificationState]);

  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const isScanning = verificationState === 'scanning' && cameraActive && !isVerifyingBackground && !compliancePassed && !capturedSnapshot;
  
  const { metrics, isAnalyzing, countdownSeconds, captureReady } = useDocumentAnalysis(
    videoRef, 
    isScanning && !scanError, 
    () => {
      // 1. Capture snapshot instantly from video stream
      if (videoRef.current) {
        try {
          const videoWidth = videoRef.current.videoWidth || 1280;
          const videoHeight = videoRef.current.videoHeight || 720;
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
            const snapshot = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedSnapshot(snapshot);
            playBeep(2200, 0.45);
            
            // Stop the camera feed to freeze the image in the UI!
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            
            setCompliancePassed(false);
            setIsVerifyingBackground(true);
            
            // 2. Trigger background Gemini Deep Scan verification!
            verifySnapshotWithGemini(snapshot);
          }
        } catch (e) {
          console.error("Failed to capture snapshot from video element", e);
          toast.error("Capture device failed. Please retry.");
          startCamera();
        }
      }
    }
  );

  useEffect(() => {
    if (isScanning && !scanError) {
      setAlignmentScore(metrics.alignment);
      setSharpnessScore(metrics.sharpness);
      setGlareScore(metrics.glare);
      setBrightnessScore(metrics.brightness);
      setTiltScore(metrics.tilt);
      setReadabilityScore(metrics.overallConfidence); // Fallback for readability UI
      
      if (countdownSeconds !== null) {
        setCurrentInstruction(`Auto-capturing in ${countdownSeconds}... Hold still!`);
      } else {
        setCurrentInstruction(metrics.feedbackHint);
      }
    }
  }, [metrics, isScanning, scanError, countdownSeconds]);

  // Handle countdown beeps and speech
  useEffect(() => {
    if (countdownSeconds !== null && countdownSeconds > 0) {
      playBeep(1200 + countdownSeconds * 200, 0.12);
      speakInstruction(`${countdownSeconds}`);
    }
  }, [countdownSeconds]);

  // Clean play track on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const finalizeCapture = async (snapshotUrl: string, result: any, overallConf: number) => {
    if (result.isValidId) {
      playBeep(1800, 0.25);
      toast.success(`${activeSide === 'front' ? 'Front' : 'Back'} side verified successfully!`);
      
      if (activeSide === 'front') {
        // Store both in react state and mutable references to prevent state lag in subsequent submissions
        frontSnapshotRef.current = snapshotUrl;
        frontFeedbackRef.current = result.feedback || "Front side verified!";
        frontConfidenceRef.current = overallConf;
        frontOcrRef.current = result.ocr;
        frontSecurityRef.current = result.security;

        setFrontSnapshot(snapshotUrl);
        setFrontFeedback(result.feedback || "Front side verified!");
        setFrontConfidence(overallConf);
        setFrontOcr(result.ocr);
        setFrontSecurity(result.security);
        
        setApiFeedback("Front side successfully verified!");
        speakInstruction("Front identity card confirmed. Now, spin your card over and scan the back side.");
        
        // Clear neural confidence estimators for the upcoming back scan calibration
        setDocDetectConfidence(0);
        setReadabilityConfidence(0);
        setOcrConfidence(0);
        setOverallCaptureConfidence(0);

        // Clear captured snapshot to allow the back side camera to start!
        setCapturedSnapshot(null);
        setTempVerifiedData(null);

        // Switch side automatically
        setActiveSide('back');
        setCompliancePassed(false);
        setIsVerifyingBackground(false);

        // Reset scores
        setAlignmentScore(35);
        setSharpnessScore(40);
        setBrightnessScore(50);
        setGlareScore(60);
        setTiltScore(15);
        setReadabilityScore(40);

        // Restart camera for the back side!
        await startCamera();
      } else {
        setBackSnapshot(snapshotUrl);
        setBackFeedback(result.feedback || "Back side verified!");
        setBackConfidence(overallConf);
        setBackOcr(result.ocr);
        setBackSecurity(result.security);
        
        setApiFeedback("Reverse side successfully verified!");
        speakInstruction("Both side credentials verified successfully. Submitting verification package.");
        
        setCapturedSnapshot(null);
        setTempVerifiedData(null);
        stopCamera();
        setVerificationState('idle');

        // Instantly submit biometric verification package to Firestore
        submitBiometricVerification(
          frontSnapshotRef.current || frontSnapshot || snapshotUrl,
          snapshotUrl,
          frontFeedbackRef.current || frontFeedback,
          result.feedback || "Back side verified!",
          frontConfidenceRef.current || frontConfidence,
          overallConf,
          frontOcrRef.current || frontOcr,
          result.ocr,
          frontSecurityRef.current || frontSecurity,
          result.security
        );
      }
    } else {
      setCapturedSnapshot(null);
      setCompliancePassed(false);
      setIsVerifyingBackground(false);
      
      let fb = result.feedback || "Wrong side or unreadable card. Adjust document.";
      if (overallConf < 95) {
        fb = `Capture confidence below threshold (${overallConf}% / 95%). Improve light/focus.`;
      }
      const errMsg = "Unable to Verify ID";
      setScanError(errMsg);
      setApiFeedback(fb);
      setCurrentInstruction(fb);
      toast.error(fb);
      
      // Resume camera immediately
      await startCamera();
    }
  };

  // Deep AI verification on high-definition captured snapshot
  const verifySnapshotWithGemini = async (snapshotUrl: string) => {
    if (tempVerifiedData && tempVerifiedData.confidence >= 95) {
      // Bypass redundant second API call if background scan was highly confident
      finalizeCapture(snapshotUrl, tempVerifiedData, tempVerifiedData.confidence);
      return;
    }

    setIsVerifyingBackground(true);
    setApiFeedback(`Deep OCR Analysis & Authentication...`);
    setCurrentInstruction(`Running Gemini 2.5 Integrity Deep Scan...`);
    speakInstruction("Document captured. Initializing high-resolution integrity analysis.");

    try {
      // Downscale image to fit within ~1MB for Nginx upload limits while retaining OCR clarity
      const img = new Image();
      img.src = snapshotUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const MAX_DIM = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      const downscaledSnapUrl = canvas.toDataURL('image/jpeg', 0.80);
      const resBlob = await fetch(downscaledSnapUrl);
      const blob = await resBlob.blob();
      const formData = new FormData();
      formData.append('image', blob, `${activeSide}_document.jpg`);

      const response = await fetch(`/api/verify-id-card?side=${activeSide}`, {
        method: 'POST',
        body: formData
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error(`Invalid server response format. This could be due to a file size limit.`);
      }

      if (!response.ok) {
        // Handle Gemini/server errors
        setIsVerifyingBackground(false);
        const errType = result.error;
        const msg = result.message || "Document analysis failed. Please try again.";

        if (errType === "parse_failure") {
          const fb = "Something went wrong reading your document. Please take a new photo.";
          setScanError(fb);
          setApiFeedback(fb);
          setCurrentInstruction(fb);
          toast.error(fb);
          // Do not restart camera
          return;
        }

        if (errType === "verification_failed") {
          setScanError(msg);
          setApiFeedback(msg);
          setCurrentInstruction(msg);
          toast.error(msg);
          // Do not restart camera
          return;
        }

        if (errType === "wrong_side") {
          setScanError(msg);
          setApiFeedback(msg);
          setCurrentInstruction(msg);
          toast.error(msg);
          // Restart camera for the SAME side
          await startCamera();
          return;
        }

        // Generic fallback error
        throw new Error(msg);
      }

      // Retrieve high-tech neural confidence levels from Gemini response and normalize them to whole percentages
      let docDetConf = result.documentDetectionConfidence || result.confidenceScore || 98;
      if (docDetConf <= 1.0) docDetConf = Math.round(docDetConf * 100);

      let readConf = result.readabilityConfidence || result.confidenceScore || 97;
      if (readConf <= 1.0) readConf = Math.round(readConf * 100);

      let ocrConf = result.ocrConfidence || result.confidenceScore || 96;
      if (ocrConf <= 1.0) ocrConf = Math.round(ocrConf * 100);

      let overallConf = result.overallConfidence || result.confidenceScore || 97;
      if (overallConf <= 1.0) overallConf = Math.round(overallConf * 100);

      setDocDetectConfidence(docDetConf);
      setReadabilityConfidence(readConf);
      setOcrConfidence(ocrConf);
      setOverallCaptureConfidence(overallConf);

      await finalizeCapture(snapshotUrl, result, overallConf);
    } catch (err: any) {
      console.error("Gemini check error:", err);
      setIsVerifyingBackground(false);
      
      const errMsg = err.message || "Upload failed. Check your connection and try again.";
      setScanError(errMsg);
      setApiFeedback(errMsg);
      setCurrentInstruction(errMsg);
      toast.error(errMsg);
      // Stop and do NOT restart the scanner automatically. Wait for user to tap Retake.
    }
  };

  // Play synthetic tone beeps
  const playBeep = (freq = 800, duration = 0.15) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      console.warn("Speech synthesis audio blocked", err);
    }
  };

  // Speaks instructions clearly to guide users matching their current scanner progress
  const speakInstruction = (text: string) => {
    if (!voiceEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("SpeechSynthesis blocked", e);
    }
  };

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setCameraActive(true);
      
      let mediaStream: MediaStream;
      const constraintsList = [
        // Constraint 1: Exact environment (rear) camera with high resolution
        {
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        },
        // Constraint 2: Ideal environment camera
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // Constraint 3: Generic environment camera
        {
          video: {
            facingMode: 'environment'
          }
        },
        // Constraint 4: Fallback to any camera
        {
          video: true
        }
      ];

      let lastError: any = null;
      for (const constraints of constraintsList) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          setStream(mediaStream);
          
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            await videoRef.current.play();
          }
          
          setCompliancePassed(false);
          setIsVerifyingBackground(false);
          
          // Reset initial scanning scores
          setAlignmentScore(35);
          setSharpnessScore(40);
          setGlareScore(60);
          setBrightnessScore(50);
          setTiltScore(15);
          setReadabilityScore(40);
          
          const label = `Scanning ${activeSide.toUpperCase()} side. Position your document flat inside the guides.`;
          setApiFeedback(label);
          setCurrentInstruction(`Align the ${activeSide} side of your document in the frame.`);
          speakInstruction(`Please position the ${activeSide} side of your identification card flat within the four guiding corners.`);
          return;
        } catch (err) {
          lastError = err;
        }
      }
      
      throw lastError || new Error("Unable to establish camera stream with available video configurations.");
    } catch (err: any) {
      console.error("Camera system initialization exception:", err);
      setCameraActive(false);
      setVerificationState('idle');
      setApiFeedback("Camera system not available. Please authorize lens permission.");
      toast.error("Camera access failed. Ensure camera permissions are granted.");
      speakInstruction("Camera system could not be initialized. Please check camera access permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setCompliancePassed(false);
    setIsVerifyingBackground(false);
  };

  const submitBiometricVerification = async (
    customFrontSnapshot?: any,
    customBackSnapshot?: any,
    customFrontFeedback?: any,
    customBackFeedback?: any,
    customFrontConfidence?: any,
    customBackConfidence?: any,
    customFrontOcr?: any,
    customBackOcr?: any,
    customFrontSecurity?: any,
    customBackSecurity?: any
  ) => {
    let fSnapshot = frontSnapshot;
    let bSnapshot = backSnapshot;
    let fFeedback = frontFeedback;
    let bFeedback = backFeedback;
    let fConfidence = frontConfidence;
    let bConfidence = backConfidence;
    let fOcr = frontOcr;
    let bOcr = backOcr;
    let fSecurity = frontSecurity;
    let bSecurity = backSecurity;

    if (typeof customFrontSnapshot === 'string') {
      fSnapshot = customFrontSnapshot;
      bSnapshot = customBackSnapshot;
      fFeedback = customFrontFeedback;
      bFeedback = customBackFeedback;
      fConfidence = customFrontConfidence;
      bConfidence = customBackConfidence;
      fOcr = customFrontOcr;
      bOcr = customBackOcr;
      fSecurity = customFrontSecurity;
      bSecurity = customBackSecurity;
    }

    if (!fSnapshot || !bSnapshot) {
      toast.error("Please supply scans of both the front and back of your ID card.");
      return;
    }
    
    setIsSubmitting(true);
    toast.loading("Uploading identity credentials to database servers...");
    
    try {
      // Upload images/videos to Cloudinary
      const fileFront = dataURLtoFile(fSnapshot, `${transactionId}_front_id`);
      const responseFront = await uploadToCloudinary(fileFront);
      const urlFront = responseFront.url;
      
      const fileBack = dataURLtoFile(bSnapshot, `${transactionId}_back_id`);
      const responseBack = await uploadToCloudinary(fileBack);
      const urlBack = responseBack.url;
      
      const updatedSteps = [...allSteps];
      updatedSteps[stepIndex] = {
        ...step,
        status: 'pending_admin',
        submittedText: inputText || `Biometric driver's license / identity passport authenticated. Ready for admin authorization.`,
        submittedImage: urlFront,
        submittedImageBack: urlBack,
        geminiFeedbackFront: fFeedback,
        geminiFeedbackBack: bFeedback,
        geminiConfidenceFront: fConfidence,
        geminiConfidenceBack: bConfidence,
        geminiOcrFront: fOcr,
        geminiOcrBack: bOcr,
        geminiSecurityFront: fSecurity,
        geminiSecurityBack: bSecurity,
        submittedAt: new Date().toISOString()
      };
      
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        verificationSteps: updatedSteps,
        document_verification_status: 'submitted',
        rejection_reason: `Completed Dual-Side Live ID Verification: Front + Back checked and logged successfully.`
      });
      
      toast.dismiss();
      toast.success("Credential verification packages submitted to administration desk.");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed posting credential packages to the distributed state ledger.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'ID_SCAN_DONE') {
        const result = e.data.data;
        if (result) {
          setFrontSnapshot(result.frontB64);
          setBackSnapshot(result.backB64);
          setFrontOcr(result.ocrData);
          setBackOcr(result.ocrData);
          setFrontSecurity(result.security);
          setBackSecurity(result.security);
          setFrontConfidence(result.confidence);
          setBackConfidence(result.confidence);
          
          setVerificationState('idle');

          setIsSubmitting(true);
          toast.loading("Uploading identity credentials to database servers...");

          try {
            const fileFront = dataURLtoFile(result.frontB64, `${transactionId}_front_id`);
            const responseFront = await uploadToCloudinary(fileFront);
            const urlFront = responseFront.url;
            
            const fileBack = dataURLtoFile(result.backB64, `${transactionId}_back_id`);
            const responseBack = await uploadToCloudinary(fileBack);
            const urlBack = responseBack.url;

            const updatedSteps = [...allSteps];
            updatedSteps[stepIndex] = {
              ...step,
              submittedImage: urlFront,
              submittedImageBack: urlBack,
              geminiFeedbackFront: "Verification Complete",
              geminiFeedbackBack: "Verification Complete",
              geminiConfidenceFront: result.confidence,
              geminiConfidenceBack: result.confidence,
              geminiOcrFront: result.ocrData,
              geminiOcrBack: result.ocrData,
              geminiSecurityFront: result.security,
              geminiSecurityBack: result.security,
              status: needsText ? 'pending_user' : 'pending_admin',
              submittedAt: new Date().toISOString()
            };
            
            if (!needsText) {
                updatedSteps[stepIndex].submittedText = "Biometric driver's license / identity passport authenticated. Ready for admin authorization.";
            }

            const txRef = doc(db, 'transactions', transactionId);
            const txUpdate: any = { verificationSteps: updatedSteps };
            
            if (step.inputType === 'both' || step.inputType === 'image') {
              txUpdate.document_verification_status = 'submitted';
              if (needsText) {
                txUpdate.rejection_reason = 'Images uploaded successfully. Waiting for written statement.';
              } else {
                txUpdate.rejection_reason = 'Completed Dual-Side Live ID Verification: Front + Back checked and logged successfully.';
              }
            }
            
            await updateDoc(txRef, txUpdate);
            
            toast.dismiss();
            toast.success("Credential verification packages submitted to administration desk.");
          } catch (err: any) {
             toast.dismiss();
             toast.error(err.message || "Failed posting credential packages.");
          } finally {
             setIsSubmitting(false);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [needsText, step, stepIndex, allSteps, transactionId]);

  const handleManualFormSubmitOnlyText = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter a response for this step.");
      return;
    }

    setIsSubmitting(true);
    toast.loading("Submitting verification answer...");

    try {
      const updatedSteps = [...allSteps];
      updatedSteps[stepIndex] = {
        ...step,
        status: 'pending_admin',
        submittedText: inputText.trim(),
        submittedAt: new Date().toISOString()
      };

      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        verificationSteps: updatedSteps,
        document_verification_status: 'submitted',
        rejection_reason: `Completed manual step: "${inputText.trim().substring(0, 50)}..."`
      });

      toast.dismiss();
      toast.success("Verification step successfully submitted.");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to submit verification text.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dataURLtoFile = (dataurl: string, baseFilename: string) => {
    if (typeof dataurl !== 'string') return new File([], `${baseFilename}.jpg`);
    if (!dataurl.startsWith('data:')) {
      dataurl = `data:image/jpeg;base64,${dataurl}`;
    }
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    // Determine correct extension
    let ext = 'jpg';
    if (mime.startsWith('video/')) {
      ext = mime.split('/')[1] || 'webm';
    } else if (mime === 'image/png') {
      ext = 'png';
    } else if (mime === 'image/webp') {
      ext = 'webp';
    }
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], `${baseFilename}.${ext}`, { type: mime });
  };

  const hasUpcomingSteps = allSteps.slice(stepIndex + 1).some((s: any) => s.status !== 'approved' && s.status !== 'pending_admin');

  if (step.status === 'pending_admin') {
    if (!hasUpcomingSteps) {
      return (
        <div id="didit-verified-card" className="bg-[#FFFFFF] border border-slate-200/80 rounded-[32px] p-6 text-center space-y-6 shadow-xl relative overflow-hidden select-none min-h-[400px] flex flex-col justify-between">
          {/* Top spacer / branding */}
          <div className="flex justify-center pt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#000] rounded-full animate-ping" />
              <span className="font-sans font-black text-xs text-slate-950 uppercase tracking-widest">DIDIT SECURE</span>
            </div>
          </div>

          {/* Checked Biometric circle */}
          <div className="space-y-4 my-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse">
              <Check className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">You've been verified!</h4>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-[260px] mx-auto">
                That's all, no further action needed.
              </p>
            </div>
          </div>

          {/* Footer controls & Branding */}
          <div className="space-y-4 w-full">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center"
              >
                Continue
              </button>
            )}
            
            <div className="text-center text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
              Secured by <span className="font-extrabold tracking-tight text-slate-900">Didit</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div id="pending-step-review-box" className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl text-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
        <p className="text-xs font-black uppercase tracking-wider text-amber-400">
          Step {stepIndex + 1}: REVIEW IN PROGRESS
        </p>
        <p className="text-xs font-bold text-white mb-2">{step.instruction}</p>
        <p className="text-[10px] text-slate-400 leading-normal max-w-sm mx-auto">
          Your documentation is being evaluated by the Compliance Committee. It will update as soon as the administrator reviews and approves this step.
        </p>
        {step.submittedText && (
          <div className="mt-4 p-4 bg-black/40 rounded-2xl text-left text-xs space-y-3 border border-white/5">
            <p className="text-[9px] font-black uppercase text-slate-500">Your Secure Submission:</p>
            <p className="text-slate-300 font-medium italic">"{step.submittedText}"</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="scanner-main-wrapper" className="space-y-5 bg-[#0b0f19] border border-blue-500/20 p-5 rounded-2xl text-left relative overflow-hidden shadow-[0_5px_30px_rgba(27,51,95,0.4)]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
      
      <div className="flex justify-between items-start border-b border-white/5 pb-3">
        <div>
          <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest block mb-0.5">
            Step {stepIndex + 1} &bull; COMPLIANCE VERIFICATION HOLD
          </span>
          <h4 className="text-xs font-black text-white leading-normal uppercase">
            {step.instruction}
          </h4>
        </div>
        <div className="flex gap-2.5 z-10">
          <button 
            id="toggle-voice-assistant"
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              playBeep(voiceEnabled ? 450 : 650, 0.1);
            }} 
            className={`p-2 rounded-xl border transition-all ${voiceEnabled ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}
            title={voiceEnabled ? 'Mute voice instructions' : 'Unmute voice instructions'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* TEXT REQUIREMENT WRITING STATEMENT */}
        {needsText && (
          <div id="textarea-write-in-group" className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Required written statement information</label>
            <textarea
              value={inputText}
              id="statement-write-in-area"
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Please enter any compliance code or physical address statement requested..."
              className="w-full h-20 px-3.5 py-2.5 bg-[#040711] border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all resize-none font-medium leading-relaxed"
            />
          </div>
        )}

        {/* SECURE BIOMETRIC CAMERA INTERFACE */}
        {needsImage && (
          <div id="biometric-camera-viewport" className="space-y-4">
            {verificationState === 'idle' && (
              <div className="bg-[#040814] border border-white/5 rounded-2xl p-5 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-extrabold text-white uppercase tracking-wider">Dual-Side ID Card Verification</h5>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-normal">
                    A secure biometrical scan of both the front and back of your ID document is required. Prepare the physical card and click below to begin.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-proceed-to-scanner"
                  disabled={isSubmitting}
                  onClick={() => {
                    setVerificationState('scanning');
                    playBeep(600, 0.1);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      UPLOADING BIOMETRICS...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 animate-pulse" />
                      PROCEED
                    </>
                  )}
                </button>
              </div>
            )}

            {verificationState === 'scanning' && (
              <div className="fixed inset-0 z-[99999] bg-[#F7F8FA] flex items-center justify-center">
                <iframe 
                  src="/id-scanner.html" 
                  className="w-full h-full max-w-[480px] mx-auto border-none bg-transparent" 
                  title="ID Scanner" 
                />
              </div>
            )}
          </div>
        )}

        {/* PRIMARY COMPLIANCE SUBMISSION BUTTON (ONLY VISIBLE AND ACTIVE WHEN DUAL SCANS ARE APPROVED) */}
        {(!needsImage && needsText) && (
          <button
            type="button"
            id="btn-primary-dynamic-submission"
            onClick={handleManualFormSubmitOnlyText}
            disabled={isSubmitting || (needsText && !inputText.trim())}
            className="w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600 hover:from-emerald-500 hover:via-teal-600 hover:to-blue-700 disabled:opacity-50 text-slate-950 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_25px_rgba(16,185,129,0.35)] active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-100" />
                SIGNING CONTRACT COMPLIANCE LEDGERS...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-slate-950" />
                SUBMIT VERIFICATION RESPONSE &rarr;
              </>
            )}
          </button>
        )}
      </div>

      {/* HIDDEN PHOTO CANVAS REF */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
