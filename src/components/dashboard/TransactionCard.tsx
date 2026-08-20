import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDown, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  ShieldAlert,
  Gift
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';

interface TransactionCardProps {
  transaction: any;
  onClick?: (tx: any) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onClick }) => {
  const { formatCurrency } = useCurrency();
  
  const getTxDetails = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'deposit':
        return {
          icon: ArrowDown,
          color: 'text-teal-400',
          bg: 'bg-teal-400/10',
          glow: 'shadow-[0_0_15px_rgba(45,212,191,0.2)]',
          label: 'Deposit',
          symbol: '+',
        };
      case 'signup_reward':
      case 'signup reward':
        return {
          icon: Gift,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          glow: 'shadow-[0_0_15px_rgba(251,191,36,0.25)]',
          label: 'Signup Reward',
          symbol: '+',
        };
      case 'reward_cash_credit':
      case 'reward_conversion':
      case 'reward_claim':
      case 'cash_reward':
      case 'reward_cash':
        return {
          icon: Gift,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'Reward Cash Claimed',
          symbol: '+',
        };
      case 'commission_earned':
      case 'referral_commission':
      case 'referral_earning':
      case 'referral_reward':
      case 'referral_bonus':
        return {
          icon: Zap,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'Commission Earned',
          symbol: '+',
        };
      case 'deduction':
      case 'interval_deduction':
      case 'trading_distribution':
        return {
          icon: Activity,
          color: 'text-slate-400',
          bg: 'bg-slate-500/10',
          glow: '',
          label: 'Trading Distribution',
          symbol: '-',
        };
      case 'investment_opened':
        return {
          icon: Activity,
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
          glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
          label: 'Investment Opened',
          symbol: '-',
        };
      case 'investment_completed':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'Investment Completed',
          symbol: '',
        };
      case 'flex_cycle_started':
        return {
          icon: Activity,
          color: 'text-indigo-400',
          bg: 'bg-indigo-400/10',
          glow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]',
          label: 'Flex Cycle Started',
          symbol: '-',
        };
      case 'flex_cycle_completed':
      case 'allocation_completed':
        return {
          icon: Zap,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'Allocation Completed',
          symbol: '+',
        };
      case 'flex_renewal_due':
        return {
          icon: Clock,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          glow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]',
          label: 'Flex Renewal Due',
          symbol: '',
        };
      case 'flex_renewal_completed':
        return {
          icon: Activity,
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
          glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
          label: 'Flex Renewal Completed',
          symbol: '-',
        };
      case 'flex_renewal_failed':
        return {
          icon: ShieldAlert,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          glow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]',
          label: 'Flex Renewal Failed',
          symbol: '',
        };
      case 'plan_activated':
        return {
          icon: Activity,
          color: 'text-foreground',
          bg: 'bg-white/10',
          glow: '',
          label: 'AI Subsystem Activated',
          symbol: '',
        };
      case 'deduction_failed':
        return {
          icon: ShieldAlert,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          glow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]',
          label: 'Distribution Failed',
          symbol: '',
        };
      case 'withdrawal':
        return {
          icon: ArrowUpRight,
          color: 'text-slate-400',
          bg: 'bg-slate-500/10',
          glow: '',
          label: 'Withdrawal',
          symbol: '-',
        };
      case 'profit_release':
      case 'profit_payout':
      case 'maturity_profit':
      case 'cycle_distribution':
        return {
          icon: Zap,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'Profit Payout',
          symbol: '+',
        };
      case 'penalty':
        return {
          icon: AlertCircle,
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          glow: '',
          label: 'Late Penalty',
          symbol: '-',
        };
      default:
        if (t.includes('reward') || t.includes('claim')) {
          return {
            icon: Gift,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
            label: 'Reward Cash Claimed',
            symbol: '+',
          };
        }
        if (t.includes('referral') || t.includes('commission')) {
          return {
            icon: Zap,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
            label: 'Commission Earned',
            symbol: '+',
          };
        }
        return {
          icon: Zap,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'Transaction',
          symbol: '+',
        };
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
     details.symbol = ''; // Do NOT show positive credit symbol for failed runs
  }
  
  const timestamp = transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date(transaction.timestamp);
  const dateStr = timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  const typeLower = (transaction.type || '').toLowerCase();
  const amountColor = isFailed 
     ? 'text-red-500' // failed transactions in red
     : (['profit_release', 'profit_payout', 'maturity_profit', 'cycle_distribution', 'deposit', 'signup_reward', 'signup reward'].includes(typeLower) 
         ? 'text-emerald-400 font-extrabold' 
         : 'text-white font-extrabold');

  let displayStatus = transaction.status === 'paid' ? 'PAID' : transaction.status.replace(/_/g, ' ').toUpperCase();
  if (isFailed) {
      displayStatus = 'FAILED';
  } else if (displayStatus === 'COMPLETED' || displayStatus === 'SUCCESS') {
      displayStatus = 'SUCCESSFUL';
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick?.(transaction)}
      className="bg-card/40 border border-border/50 rounded-3xl p-5 flex items-center justify-between cursor-pointer transition-all gap-4"
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full ${isFailed ? 'bg-red-500/10 border-red-500/20' : details.bg} ${isFailed ? 'shadow-[0_0_15px_rgba(239,68,68,0.25)]' : details.glow} flex items-center justify-center shrink-0 border border-white/5`}>
          <details.icon className={`w-6 h-6 ${isFailed ? 'text-red-400' : details.color}`} />
        </div>
        <div>
          <div className="text-base font-bold text-foreground mb-0.5">{details.label}</div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
              {displayStatus}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {dateStr} • {timeStr}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className={`text-xl font-bold ${amountColor}`}>
          {transaction.amount != null ? `${details.symbol}${formatCurrency(transaction.amount)}` : ''}
        </div>
      </div>
    </motion.div>
  );
};
