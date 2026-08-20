import React, { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Link as LinkIcon, TrendingUp } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "motion/react";

export function SwipableWalletCards({ 
  hideBalance, 
  setHideBalance, 
  totalBalance, 
  displayProfitBalance, 
  depositBalance, 
  userData 
}: any) {
  const { preferredCurrency, localCurrency, setPreferredCurrency, formatCurrency } = useCurrency();
  const [activeDot, setActiveDot] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const referralEarnings = userData?.total_referral_earnings || 0;
  const currentReferralBalance = userData?.referralBalance || 0;
  const referredUsersCount = userData?.referred_users || 0;

  // Compute proportion values for the progress ring
  const totalVal = (displayProfitBalance + depositBalance) || 1;
  const profitRatio = displayProfitBalance / totalVal;
  const profitPercentage = Math.round(profitRatio * 100);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollPosition = target.scrollLeft;
    const width = target.clientWidth;
    // Switch active dot when scrolled past half the container width
    if (scrollPosition > width / 2) {
      setActiveDot(1);
    } else {
      setActiveDot(0);
    }
  };

  const scrollTo = (index: number) => {
    if (scrollContainerRef.current) {
      const targetCard = scrollContainerRef.current.children[index] as HTMLElement;
      if (targetCard) {
         // Smooth scroll to the target card's left position
         scrollContainerRef.current.scrollTo({
            left: targetCard.offsetLeft - scrollContainerRef.current.offsetLeft,
            behavior: 'smooth'
         });
      }
    }
    setActiveDot(index);
  };

  const handleCurrencyChange = (val: string) => {
    setPreferredCurrency(val);
  };

  return (
    <div className="w-full max-w-full flex flex-col items-center min-w-0">
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full max-w-full flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 min-w-0"
      >
        {/* Card 1: TOTAL BALANCE */}
        <div className="snap-center shrink-0 w-[92%] sm:w-[85%] md:w-full max-w-[calc(100vw-2.5rem)]">
          <Card className="balance-card h-full rounded-2xl p-4 relative overflow-hidden group border-none min-h-[150px] flex flex-col justify-between shadow-lg">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[50px] group-hover:bg-white/10 transition-colors" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-[40px]" />

            <div>
              <div className="flex justify-between items-center mb-2.5 relative z-10">
                <span className="text-xs text-white/80 flex items-center gap-1.5 font-bold tracking-wider uppercase">
                  <div className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                  TOTAL BALANCE
                </span>
                <Select value={preferredCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-auto gap-1.5 h-7 bg-black/25 hover:bg-black/40 transition-colors border-[#ffffff15] text-[#ffffff] text-xs px-3 shadow-none rounded-full font-bold backdrop-blur-md focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-card-foreground min-w-[80px] rounded-xl shadow-xl">
                    <SelectItem value="USD" className="focus:bg-primary/20 focus:text-primary">USD</SelectItem>
                    <SelectItem value="GBP" className="focus:bg-primary/20 focus:text-primary">GBP</SelectItem>
                    <SelectItem value="EUR" className="focus:bg-primary/20 focus:text-primary">EUR</SelectItem>
                    {localCurrency && !['USD', 'GBP', 'EUR'].includes(localCurrency) && (
                      <SelectItem value={localCurrency} className="focus:bg-primary/20 focus:text-primary">{localCurrency}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col relative z-10">
                <div
                  className={`text-3xl sm:text-[32px] font-extrabold text-white tracking-tight cursor-pointer transition-all duration-300 drop-shadow-md ${hideBalance ? "blur-md" : "blur-none"} flex items-baseline gap-2`}
                  onClick={() => setHideBalance(!hideBalance)}
                >
                  {formatCurrency(totalBalance)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10 pt-2.5 border-t border-white/10 mt-2">
              <div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
                  Profit Balance
                </div>
                <div>
                  <span className={`text-base font-bold text-white transition-all duration-300 drop-shadow-sm ${hideBalance ? "blur-md" : "blur-none"}`}>
                    {formatCurrency(displayProfitBalance)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] inline-block" />
                  Trading Balance
                </div>
                <div>
                  <span className={`text-base font-bold text-white transition-all duration-300 drop-shadow-sm ${hideBalance ? "blur-md" : "blur-none"}`}>
                    {formatCurrency(depositBalance)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Card 2: REFERRAL BALANCE */}
        <div className="snap-center shrink-0 w-[92%] sm:w-[85%] md:w-full max-w-[calc(100vw-2.5rem)]">
          <Card className="h-full rounded-2xl p-4 relative overflow-hidden group bg-[#F5F7FF] border-[#E8EEFF] shadow-[0_4px_20px_rgba(0,0,0,0.08)] min-h-[150px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2.5 relative z-10">
                <span className="text-xs text-[#5B6B8A] flex items-center gap-1.5 font-extrabold tracking-wider uppercase">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  REFERRAL BALANCE
                </span>
                
                <Select value={preferredCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-auto gap-1.5 h-7 bg-[#E5EDFF] hover:bg-[#D1E0FF] transition-colors border-[#2563EB]/20 text-[#2563EB] text-xs px-3 shadow-sm rounded-full font-bold focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5EDFF] text-[#2563EB] min-w-[80px] rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.15)] font-bold">
                    <SelectItem value="USD" className="focus:bg-[#E5EDFF] focus:text-[#2563EB]">USD</SelectItem>
                    <SelectItem value="GBP" className="focus:bg-[#E5EDFF] focus:text-[#2563EB]">GBP</SelectItem>
                    <SelectItem value="EUR" className="focus:bg-[#E5EDFF] focus:text-[#2563EB]">EUR</SelectItem>
                    {localCurrency && !['USD', 'GBP', 'EUR'].includes(localCurrency) && (
                      <SelectItem value={localCurrency} className="focus:bg-[#E5EDFF] focus:text-[#2563EB]">{localCurrency}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center mb-1 relative z-10">
                <div
                  className={`text-3xl sm:text-[32px] font-black text-[#0F172A] tracking-tight cursor-pointer transition-all duration-300 ${hideBalance ? "blur-md" : "blur-none"}`}
                  onClick={() => setHideBalance(!hideBalance)}
                >
                  {formatCurrency(currentReferralBalance)}
                </div>

                <div 
                  className="bg-[#E5EDFF] text-[#2563EB] border border-[#2563EB]/20 rounded-full px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold cursor-pointer hover:bg-[#D1E0FF] transition-all shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://aetheriss.online/auth/signup?ref=${userData?.refCode || "AET-8906115"}`);
                    toast.success("Referral link copied!");
                  }}
                >
                  <LinkIcon className="w-3 h-3" /> Program
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10 pt-2.5 border-t border-[#3B82F6]/10 mt-1">
              <div>
                <div className="text-[10px] text-[#5B6B8A] mb-0.5 font-semibold uppercase tracking-wider">Total Earned</div>
                <div className={`text-base font-bold text-[#0F172A] transition-all duration-300 ${hideBalance ? "blur-md" : "blur-none"}`}>
                  {formatCurrency(referralEarnings)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#5B6B8A] mb-0.5 font-semibold uppercase tracking-wider">Referred Users</div>
                <div className={`text-base font-bold text-[#0F172A] transition-all duration-300 ${hideBalance ? "blur-md" : "blur-none"}`}>
                  {referredUsersCount}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-center mt-3 gap-2">
        <div 
          onClick={() => scrollTo(0)}
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeDot === 0 ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"}`} 
        />
        <div 
          onClick={() => scrollTo(1)}
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeDot === 1 ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"}`} 
        />
      </div>
    </div>
  );
}
