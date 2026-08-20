import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ChevronLeft, ArrowDownToLine, ArrowUpFromLine, Activity, CreditCard, Gift, AlertCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { TransactionCard } from '@/components/dashboard/TransactionCard';
import { TransactionDetailModal } from '@/components/dashboard/TransactionDetailModal';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export function Transactions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('user_id', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cleaned = txs.filter((t: any) => t.type !== 'PLAN_ACTIVATED');
      const sorted = cleaned.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        
        const getPriority = (tx: any) => {
          const type = (tx.type || '').toLowerCase();
          if (['deduction', 'interval_deduction', 'trading_distribution'].includes(type)) return 1;
          if (['profit_release', 'profit_payout', 'maturity_profit', 'cycle_distribution'].includes(type)) return 2;
          return 3;
        };
        
        return getPriority(a) - getPriority(b);
      });
      setTransactions(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
    return () => unsub();
  }, [user]);

  const filteredTx = transactions.filter((tx:any) => {
    const typeLower = (tx.type || '').toLowerCase();
    
    if (filter === 'Deposits') {
      if (typeLower !== 'deposit') return false;
    } else if (filter === 'Withdrawals') {
      if (typeLower !== 'withdrawal') return false;
    } else if (filter === 'Deductions') {
      if (!['deduction', 'deduction_failed', 'interval_deduction', 'trading_distribution', 'investment_opened', 'flex_cycle_started', 'flex_renewal_completed', 'flex_renewal_failed'].includes(typeLower)) return false;
    } else if (filter === 'Profits') {
      if (!['profit_release', 'profit_payout', 'maturity_profit', 'cycle_distribution', 'investment_completed', 'flex_cycle_completed'].includes(typeLower)) return false;
    }
    
    if (searchQuery && !tx.reference?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#060B14] flex flex-col items-center w-full pb-10">
      <div className="w-full max-w-4xl p-6 md:p-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-white"/>
           </button>
           <h1 className="text-3xl font-bold text-white tracking-tight">Transaction History</h1>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
           <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar w-full md:w-auto">
             {['All', 'Deposits', 'Withdrawals', 'Deductions', 'Profits'].map((f, i) => (
               <div 
                 key={i} 
                 onClick={() => setFilter(f)} 
                 className={`px-4 py-[6px] rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer border transition-colors ${filter === f ? 'bg-[#1E50FF] text-white border-[#1E50FF]' : 'bg-[#121826] hover:bg-white/5 text-slate-400 border-white/10'}`}
               >
                 {f}
               </div>
             ))}
           </div>
           
           <div className="relative w-full md:w-64">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <Input 
               placeholder="Search references..." 
               className="bg-[#121826] border-white/10 rounded-full h-10 pl-9 text-sm focus:ring-[#1E50FF] focus:border-[#1E50FF] text-white w-full" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
            {filteredTx.length === 0 ? (
               <div className="py-20 bg-[#121826] border border-white/5 rounded-3xl flex flex-col items-center justify-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 inner-shadow">
                    <Activity className="w-8 h-8 text-slate-500" />
                 </div>
                 <div className="text-white font-medium mb-1">No Transactions Found</div>
                 <div className="text-xs text-slate-500">Try adjusting your filters or search.</div>
               </div>
            ) : (
              filteredTx.map((tx:any, i:any) => (
                <TransactionCard
                  key={tx.id || i}
                  transaction={tx}
                  onClick={(t) => setSelectedTx(t)}
                />
              ))
            )}
        </div>

      </div>
      <TransactionDetailModal 
        isOpen={selectedTx !== null} 
        onClose={() => setSelectedTx(null)} 
        transaction={selectedTx} 
      />
    </div>
  );
}
