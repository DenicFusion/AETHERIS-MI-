import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Copy, Activity, Zap, ArrowUpRight, ArrowDown, AlertCircle, Upload, Loader2, Gift, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { WithdrawalReceipt } from '@/components/WithdrawalReceipt';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ isOpen, onClose, transaction }) => {
  const { formatCurrency } = useCurrency();
  const [isUploading, setIsUploading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  if (!transaction) return null;

  // Viewport Transition: Override details layout with dedicated withdrawal receipt
  if (transaction.type === 'withdrawal') {
    const normalizedWithdrawal = {
      id: transaction.id,
      userId: transaction.userId || transaction.user_id,
      referenceId: transaction.reference || transaction.referenceId || transaction.id,
      amount: Number(transaction.amount || 0),
      processingFee: transaction.processingFee ?? (transaction.source === 'referral' ? 0 : 25),
      netAmount: transaction.netAmount ?? Math.max(0, Number(transaction.amount || 0) - (transaction.source === 'referral' ? 0 : 25)),
      method: transaction.withdrawal_method || transaction.method || 'Bank Wire Transfer',
      bankName: transaction.bankName || 'Direct Express',
      accountName: transaction.accountName || 'Unknown Investor',
      accountNumber: transaction.accountNumber || transaction.address || '••••1122',
      status: (transaction.status === 'rejected' || transaction.status === 'failed' ? 'declined' : transaction.status) || 'pending',
      submittedAt: transaction.submittedAt || transaction.timestamp,
      approvedAt: transaction.approvedAt || transaction.approved_at,
      completedAt: transaction.completedAt || transaction.completed_at,
      declinedAt: transaction.declinedAt || transaction.rejected_at,
      declineReason: transaction.declineReason || transaction.rejection_reason,
      estimatedArrival: transaction.estimatedArrival || '1–5 Business Days',
      verificationSteps: transaction.verificationSteps || []
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-[#070b18] overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
        <WithdrawalReceipt withdrawal={normalizedWithdrawal as any} onClose={onClose} />
      </div>
    );
  }

  const handleReuploadProof = async () => {
    if (!proofFile) {
      toast.error("Please select a file first");
      return;
    }
    
    setIsUploading(true);
    try {
      const { url } = await uploadToCloudinary(proofFile);
      
      // We need the payment ID. Usually it's in the reference or we can find it.
      // In our system, reference is often the paymentId.
      const paymentId = transaction.reference;
      if (!paymentId) throw new Error("Payment reference missing");

      const payRef = doc(db, 'payments', paymentId);
      await updateDoc(payRef, {
        proof_url: url,
        status: 'pending', // Reset to pending for admin to see
        verification_triggered: true,
        updated_at: new Date()
      });

      // Also update the transaction record status to show it's pending again
      // We'd need to find the specific transaction doc. 
      // But status 'pending' is usually enough to signal the user.
      
      toast.success("Proof re-uploaded successfully!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Re-upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getTxDetails = (type: string) => {
    switch (type) {
      case 'deposit':
        return { icon: ArrowDown, color: 'text-teal-400', bg: 'bg-teal-400/10', label: 'Deposit', symbol: '+', glow: 'shadow-[0_0_15px_rgba(45,212,191,0.2)]' };
      case 'Signup Reward':
      case 'signup_reward':
        return { icon: Gift, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Signup Reward', symbol: '+', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.25)]' };
      case 'reward_cash_credit':
      case 'reward_conversion':
      case 'reward_claim':
      case 'cash_reward':
      case 'reward_cash':
        return { icon: Gift, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Reward Cash Claimed', symbol: '+', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]' };
      case 'commission_earned':
      case 'referral_commission':
      case 'referral_earning':
      case 'referral_reward':
      case 'referral_bonus':
        return { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Commission Earned', symbol: '+', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]' };
      case 'INTERVAL_DEDUCTION':
      case 'TRADING_DISTRIBUTION':
      case 'deduction':
        return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Trading Distribution', symbol: '-', glow: '' };
      case 'investment_opened':
      case 'INVESTMENT_OPENED':
        return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Investment Opened', symbol: '-', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' };
      case 'investment_completed':
      case 'INVESTMENT_COMPLETED':
        return { icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Investment Completed', symbol: '', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' };
      case 'flex_cycle_started':
      case 'FLEX_CYCLE_STARTED':
        return { icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-400/10', label: 'Flex Cycle Started', symbol: '-', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]' };
      case 'flex_cycle_completed':
      case 'FLEX_CYCLE_COMPLETED':
      case 'allocation_completed':
      case 'ALLOCATION_COMPLETED':
      case 'alloc_completed': {
        const allocName = transaction.allocation_name || 
          (transaction.allocation_number ? `Alloc_${transaction.allocation_number}` : 
          (transaction.cycle ? `Alloc_${transaction.cycle}` : 
          (transaction.sequence ? `Alloc_${transaction.sequence}` : 
          (transaction.reference?.match(/alloc_(\d+)/i)?.[1] ? `Alloc_${transaction.reference.match(/alloc_(\d+)/i)[1]}` : null))));
        return { 
          icon: Zap, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10', 
          label: 'Allocation Completed', 
          allocName: allocName,
          symbol: '+', 
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
        };
      }
      case 'flex_renewal_due':
      case 'FLEX_RENEWAL_DUE':
        return { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Flex Renewal Due', symbol: '', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' };
      case 'flex_renewal_completed':
      case 'FLEX_RENEWAL_COMPLETED':
        return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Flex Renewal Completed', symbol: '-', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]' };
      case 'flex_renewal_failed':
      case 'FLEX_RENEWAL_FAILED':
        return { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Flex Renewal Failed', symbol: '', glow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]' };
      case 'PLAN_ACTIVATED':
        return { icon: Activity, color: 'text-foreground', bg: 'bg-white/10', label: 'AI Subsystem Activated', symbol: '', glow: '' };
      case 'deduction_failed':
        return { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Distribution Failed', symbol: '', glow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]' };
      case 'withdrawal':
        return { icon: ArrowUpRight, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Withdrawal', symbol: '-', glow: '' };
      case 'profit_release':
      case 'PROFIT_PAYOUT':
      case 'MATURITY_PROFIT':
      case 'CYCLE_DISTRIBUTION':
        return { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Profit Payout', symbol: '+', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]' };
      case 'penalty':
        return { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Late Penalty', symbol: '-', glow: '' };
      default:
        const tLower = (type || '').toLowerCase();
        if (tLower.includes('reward') || tLower.includes('claim')) {
          return { icon: Gift, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Reward Cash Claimed', symbol: '+', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]' };
        }
        if (tLower.includes('referral') || tLower.includes('commission')) {
          return { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Commission Earned', symbol: '+', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]' };
        }
        return { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Transaction', symbol: '+', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'Success':
      case 'success':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'failed':
      case 'overdue':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-muted-foreground bg-slate-400/10 border-slate-400/20';
    }
  };

  const details = getTxDetails(transaction.type);
  const statusColor = getStatusColor(transaction.status);
  
  const isFailed = ['failed', 'cancelled', 'insufficient_funds', 'declined', 'expired'].includes(transaction.status?.toLowerCase());
  if (isFailed) {
      details.symbol = '';
  }

  let displayStatus = transaction.status === 'paid' ? 'PAID' : transaction.status.toUpperCase().replace(/_/g, ' ');
  if (isFailed) {
      displayStatus = 'FAILED';
  } else if (displayStatus === 'COMPLETED' || displayStatus === 'SUCCESS') {
      displayStatus = 'SUCCESSFUL';
  }
  
  const timestamp = transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date(transaction.timestamp);
  const dateStr = timestamp.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  const isAllocCompleted = ['allocation_completed', 'ALLOCATION_COMPLETED', 'flex_cycle_completed', 'FLEX_CYCLE_COMPLETED', 'alloc_completed'].includes(transaction.type) || !!transaction.allocation_name;
  
  let displayAmount = transaction.amount;
  if (isAllocCompleted) {
    if (transaction.payout != null && Number(transaction.payout) > 0) {
      displayAmount = Number(transaction.payout);
    } else if (transaction.allocation_value != null && Number(transaction.allocation_value) > 0) {
      displayAmount = Number(transaction.allocation_value);
    } else if (transaction.principal != null && transaction.profit != null && (Number(transaction.principal) + Number(transaction.profit) > 0)) {
      displayAmount = Number(transaction.principal) + Number(transaction.profit);
    } else if (transaction.capital_amount != null && transaction.profit_amount != null && (Number(transaction.capital_amount) + Number(transaction.profit_amount) > 0)) {
      displayAmount = Number(transaction.capital_amount) + Number(transaction.profit_amount);
    }
  }

  const isSignupReward = ['signup reward', 'signup_reward'].includes((transaction.type || '').toLowerCase()) || 
    (transaction.message || '').toLowerCase().includes('signup reward');

  let displayDescription = (details as any).allocName || transaction.message;
  if (isSignupReward) {
    displayDescription = transaction.message?.includes('Withdrawable Only')
      ? transaction.message
      : 'Signup Reward Bonus (Withdrawable Only)';
  }

  const amountColor = isFailed 
    ? 'text-red-500' 
    : (['deposit', 'profit_release', 'PROFIT_PAYOUT', 'MATURITY_PROFIT', 'Signup Reward', 'signup_reward', 'allocation_completed', 'ALLOCATION_COMPLETED', 'flex_cycle_completed', 'FLEX_CYCLE_COMPLETED', 'alloc_completed', 'commission_earned', 'referral_commission'].includes(transaction.type) || isAllocCompleted
        ? 'text-emerald-400' 
        : (['INTERVAL_DEDUCTION', 'deduction'].includes(transaction.type) ? 'text-slate-400' : 'text-white'));

  const modalBg = isFailed ? 'bg-red-500/10 border-red-500/20' : details.bg;
  const modalGlow = isFailed ? 'shadow-[0_0_20px_rgba(239,68,68,0.35)]' : (details.glow || '');
  const modalColor = isFailed ? 'text-red-400' : details.color;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95%] bg-[#121826] border-white/10 text-white p-0 overflow-hidden shadow-2xl rounded-3xl" aria-describedby="transaction-details">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Transaction Details</h2>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className={`w-20 h-20 rounded-full ${modalBg} ${modalGlow} flex items-center justify-center mb-4 border border-white/5`}>
              <details.icon className={`w-10 h-10 ${modalColor}`} />
            </div>
            <div className="text-xl font-bold mb-1">{details.label}</div>
            <div className={`text-4xl font-black ${amountColor}`}>
              {displayAmount != null ? `${details.symbol}${formatCurrency(displayAmount)}` : ''}
            </div>
          </div>

          <div className="space-y-4 bg-black/20 rounded-2xl p-5 border border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</span>
              <div className="flex items-center">
                 <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                   {displayStatus}
                 </span>
              </div>
            </div>
            
            <div className="w-full h-px bg-white/5" />

            {(displayDescription || isSignupReward) && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Description</span>
                  <span className="text-sm font-semibold text-emerald-400 font-mono">
                    {displayDescription || 'Signup Reward Bonus (Withdrawable Only)'}
                  </span>
                  {isSignupReward && (
                    <span className="text-[11px] font-medium text-amber-400/90 flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Withdrawable only
                    </span>
                  )}
                </div>
                <div className="w-full h-px bg-white/5" />
              </>
            )}

            {isAllocCompleted && (transaction.principal || transaction.capital_amount) && (transaction.profit || transaction.profit_amount) && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Capital Allocated</span>
                    <span className="text-white font-bold">{formatCurrency(transaction.principal || transaction.capital_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Profit Accrued</span>
                    <span className="text-emerald-400 font-bold">+{formatCurrency(transaction.profit || transaction.profit_amount)}</span>
                  </div>
                </div>
                <div className="w-full h-px bg-white/5" />
              </>
            )}

            {(transaction.plan_name || transaction.plan) && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Trading Plan</span>
                  <span className="text-sm font-medium text-white uppercase">{transaction.plan_name || transaction.plan}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
              </>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date & Time</span>
              <span className="text-sm font-medium">{dateStr} at {timeStr}</span>
            </div>

            <div className="w-full h-px bg-white/5" />

            {transaction.status === 'failed' && transaction.rejection_reason && (
              <>
                <div className="flex flex-col gap-1 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">Rejection Reason</span>
                  <span className="text-sm font-medium text-red-100">{transaction.rejection_reason}</span>
                </div>
                <div className="w-full h-px bg-white/5" />
              </>
            )}

            {transaction.type === 'deposit' && (transaction.status === 'failed' || transaction.status === 'pending') && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-black text-center tracking-widest">Verification Zone</p>
                <div className="grid gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                   <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Upload Proof of Payment</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="reupload-proof"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      <label 
                        htmlFor="reupload-proof"
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 cursor-pointer transition-all bg-black/20"
                      >
                        {proofFile ? (
                           <span className="text-xs font-bold text-primary truncate max-w-[200px]">{proofFile.name}</span>
                        ) : (
                           <>
                             <Upload className="w-4 h-4 text-muted-foreground" />
                             <span className="text-xs font-bold text-muted-foreground">Select Receipt Image</span>
                           </>
                        )}
                      </label>
                   </div>
                   <Button 
                     onClick={handleReuploadProof}
                     disabled={!proofFile || isUploading}
                     className="w-full bg-primary hover:bg-primary/90 font-black uppercase text-[10px] h-10 tracking-widest"
                   >
                     {isUploading ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                       "Initiate Node Validation"
                     )}
                   </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 w-full min-w-0">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Reference ID</span>
              <div 
                onClick={() => copyToClipboard(transaction.reference || transaction.id || 'N/A')}
                className="flex items-center justify-between cursor-pointer group w-full min-w-0"
              >
                <span className="text-sm font-mono truncate mr-2 block min-w-0">{transaction.reference || transaction.id || 'N/A'}</span>
                <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
