import React, { useState, useEffect } from "react";
import { ChevronLeft, Trophy, Copy, TrendingUp, History, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getDocs, collection, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUserLevelBadge } from "@/lib/badge";
import { LevelBadge } from "@/components/ui/LevelBadge";

export function TabReferrals({
  goBack,
  userData,
}: {
  goBack: () => void;
  userData: any;
}) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "weekly" | "monthly">("all");

  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllReferred, setShowAllReferred] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, "users"),
          orderBy("total_referral_earnings", "desc"),
          limit(50),
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map((d) => ({
            uid: d.id,
            name:
              d.data().fullName ||
              d.data().username ||
              d.data().email?.split("@")[0] ||
              "User",
            earnings: d.data().total_referral_earnings || 0,
            count: d.data().referral_count || 0,
            avatarUrl:
              d.data().avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`,
            totalDeposits: d.data().total_deposits || 0,
          }))
          .filter((u) => u.earnings > 0 || u.count > 0);
        setLeaderboard(data);
      } catch (e) {
        console.error("Leaderboard fetch error", e);
      }
    };

    const fetchHistory = async () => {
      if (!userData?.uid) return;
      try {
        const q = query(
          collection(db, "referral_earnings"),
          where("referrerId", "==", userData.uid),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (e) {
        console.error("History fetch error", e);
      }
    }

    const fetchReferredUsers = async () => {
      if (!userData?.refCode) return;
      try {
        const q = query(collection(db, "users"), where("referredBy", "==", userData.refCode), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setReferredUsers(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (e) {
        console.error("Referred users fetch error", e);
      }
    }

    fetchLeaderboard();
    fetchHistory();
    fetchReferredUsers();
  }, [filter, userData?.uid, userData?.refCode]);

  const referralLink = `https://aetheriss.online/auth/signup?ref=${userData?.refCode || "AET-8906115"}`;
  const referralBalance = userData?.referralBalance || 0;
  
  const displayedLeaderboard = showAllLeaderboard ? leaderboard : leaderboard.slice(0, 3);
  const top3 = leaderboard.slice(0, 3);
  const others = showAllLeaderboard ? leaderboard.slice(3) : [];

  return (
    <div className="p-5 flex flex-col gap-6 animate-in slide-in-from-right duration-300 pb-24">
      <div className="flex items-center justify-between mt-2">
        <ChevronLeft
          className="w-6 h-6 text-foreground cursor-pointer"
          onClick={goBack}
        />
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          Referral Dashboard
        </h2>
        <div className="w-6" />
      </div>

      {/* Hero Stats */}
      <Card className="bg-[#121826]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-bold">
            Referral Wallet Balance
          </div>
          <h3 className="text-4xl font-black text-white mb-6 tracking-tight font-mono">
             ${referralBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/40 rounded-2xl border border-white/5 p-3.5 flex flex-col items-center justify-center">
              <div className="text-[11px] text-slate-400 font-semibold mb-0.5">Total Earned</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                ${(userData?.total_referral_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-black/40 rounded-2xl border border-white/5 p-3.5 flex flex-col items-center justify-center">
              <div className="text-[11px] text-slate-400 font-semibold mb-0.5">Total Referrals</div>
              <div className="text-lg font-bold text-primary font-mono">
                {userData?.referral_count || 0}
              </div>
            </div>
          </div>

          {/* Tier 1 & Tier 2 Commission Earnings Breakdown */}
          {(() => {
            const isWorkerUser = userData?.verified_referrer || userData?.is_worker || userData?.role === 'worker';
            const tier1Rate = userData?.level1_percentage !== undefined ? userData.level1_percentage : (isWorkerUser ? 60 : 10);
            const tier2Rate = userData?.level2_percentage !== undefined ? userData.level2_percentage : (isWorkerUser ? 0 : 3);
            return (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-3 text-center">
                  <div className="text-[11px] text-emerald-400 font-bold mb-0.5 uppercase tracking-wider">Tier 1 ({tier1Rate}%)</div>
                  <div className="text-base font-bold text-emerald-300 font-mono">
                    ${(userData?.tier1_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-sky-500/10 rounded-2xl border border-sky-500/20 p-3 text-center">
                  <div className="text-[11px] text-sky-400 font-bold mb-0.5 uppercase tracking-wider">Tier 2 ({tier2Rate}%)</div>
                  <div className="text-base font-bold text-sky-300 font-mono">
                    ${(userData?.tier2_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Copy Link */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Referral Link</h3>
        </div>
        <div className="flex bg-[#121826] border border-border rounded-xl overflow-hidden p-1">
          <input
            className="flex-1 bg-transparent px-3 text-sm text-muted-foreground outline-none"
            readOnly
            value={referralLink}
          />
          <Button
            className="rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 font-semibold text-foreground shrink-0 shadow-[0_0_15px_rgba(30,80,255,0.4)]"
            onClick={() => {
              navigator.clipboard.writeText(referralLink);
              toast.success("Referral link copied!");
            }}
          >
            Copy
          </Button>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Leaderboard
          </h3>
          <div className="flex bg-[#121826] border border-border rounded-lg p-1">
            <button
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${filter === "weekly" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              onClick={() => setFilter("weekly")}
            >
              Weekly
            </button>
            <button
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${filter === "monthly" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              onClick={() => setFilter("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${filter === "all" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              onClick={() => setFilter("all")}
            >
              All-time
            </button>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm bg-[#121826] border border-white/5 rounded-2xl">
            No top earners yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Top 3 Special Design */}
            <div className="grid grid-cols-3 gap-3">
              {top3.map((u, i) => {
                const borderStyles = [
                  "border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
                  "border-slate-400/30 bg-slate-400/5 shadow-[0_0_20px_rgba(148,163,184,0.1)]",
                  "border-orange-500/30 bg-orange-500/5 shadow-[0_0_20px_rgba(234,88,12,0.1)]",
                ];
                const rankBadges = ["🥇 1st", "🥈 2nd", "🥉 3rd"];
                const badgeColors = [
                  "bg-amber-400/20 text-amber-300 border-amber-400/30",
                  "bg-slate-300/20 text-slate-200 border-slate-300/30",
                  "bg-orange-400/20 text-orange-300 border-orange-400/30",
                ];
                const textColors = [
                  "text-amber-400",
                  "text-slate-300",
                  "text-orange-400",
                ];

                return (
                  <Card
                    key={i}
                    className={`bg-[#121826]/90 flex flex-col items-center p-3.5 rounded-2xl border relative overflow-hidden transition-all duration-200 ${borderStyles[i]}`}
                  >
                    <div className="mb-1.5 flex items-center justify-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeColors[i]}`}>
                        {rankBadges[i]}
                      </span>
                    </div>

                    <div className="relative mb-2">
                      <img
                        src={u.avatarUrl}
                        className="w-12 h-12 rounded-full border-2 border-white/10 bg-white/10 object-cover"
                        alt="Avatar"
                      />
                    </div>

                    <div className="text-xs font-bold text-white mb-1 truncate w-full text-center">
                      {u.name}
                    </div>
                    <div className={`text-sm font-black font-mono ${textColors[i]}`}>
                      ${u.earnings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Normal List */}
            {others.length > 0 && (
              <Card className="bg-[#121826] border-white/5 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                {others.map((u, i) => (
                  <div
                    key={i}
                    className="flex items-center p-3.5 border-t border-white/5 first:border-0 hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-6 font-bold text-xs text-muted-foreground">
                      #{i + 4}
                    </div>
                    <div className="relative ml-1 mr-3 group-hover:scale-105 transition-transform">
                      <img
                        src={u.avatarUrl}
                        className="w-8 h-8 rounded-full bg-white/10 border border-border object-cover"
                        alt=""
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground font-semibold group-hover:text-primary transition-colors truncate">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.count} Referrals
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      ${u.earnings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {!showAllLeaderboard && leaderboard.length > 3 && (
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllLeaderboard(true)}
              >
                View Full Leaderboard
              </Button>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" /> Recent Referral History
          </h3>
          {!showAllHistory && history.length > 3 && (
            <button 
              className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline"
              onClick={() => setShowAllHistory(true)}
            >
              View All
            </button>
          )}
        </div>
        {history.length > 0 ? (
          <Card className="bg-[#121826] border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {(showAllHistory ? history : history.slice(0, 3)).map((h: any) => (
              <div key={h.id} className="p-4 flex items-center justify-between">
                 <div>
                    <div className="font-bold text-sm text-foreground">Commission Received</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.createdAt?.toMillis()).toLocaleString()}</div>
                 </div>
                 <div className="font-bold text-green-500">
                    +${h.amount.toFixed(2)}
                 </div>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="bg-[#121826] border-white/5 rounded-2xl p-6 text-center text-muted-foreground text-xs">
            No recent direct commissions.
          </Card>
        )}
      </div>
      {/* Referred Users List */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Your Referred Users
          </h3>
          {!showAllReferred && referredUsers.length > 3 && (
            <button 
              className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline"
              onClick={() => setShowAllReferred(true)}
            >
              View All
            </button>
          )}
        </div>
        {referredUsers.length > 0 ? (
          <Card className="bg-[#121826] border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {(showAllReferred ? referredUsers : referredUsers.slice(0, 3)).map((u: any) => (
              <div key={u.id} className="p-4 flex flex-col gap-1">
                 <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-foreground">{u.fullName || u.username || 'User'}</div>
                    <div 
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded cursor-pointer font-bold border border-primary/20 flex items-center gap-1 active:scale-95 transition-all"
                      onClick={() => {
                        if (u.unique_tag) {
                           navigator.clipboard.writeText(u.unique_tag);
                           toast.success("Unique Tag Copied!");
                        }
                      }}
                      title="Copy Unique Tag"
                    >
                      {u.unique_tag || 'No Tag'} <Copy className="w-3 h-3" />
                    </div>
                 </div>
                 <div className="text-xs text-muted-foreground">{u.email}</div>
                 <div className="text-[10px] text-muted-foreground/60">{u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleString() : ''}</div>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="bg-[#121826] border-white/5 rounded-2xl p-6 text-center text-muted-foreground text-xs">
            You haven't referred anyone yet. Share your link to start earning!
          </Card>
        )}
      </div>

    </div>
  );
}
