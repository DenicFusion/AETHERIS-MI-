/**
 * Aetheris Tier-Level Badge System
 * Based on cumulative deposit amount thresholds.
 */
export interface UserLevel {
  name: string;
  fullName: string;
  color: string;
  threshold: number;
}

export function getUserLevelBadge(totalDeposits: number): UserLevel | null {
  const amount = totalDeposits || 0;
  
  if (amount < 1000) {
    return null; // Starter tier has no badge
  }
  
  if (amount < 5000) {
    return { 
      name: "L1", 
      fullName: "Level 1", 
      color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
      threshold: 1000 
    };
  }
  
  if (amount < 10000) {
    return { 
      name: "L2", 
      fullName: "Level 2", 
      color: "bg-blue-500/10 text-blue-400 border-blue-500/25",
      threshold: 5000 
    };
  }
  
  if (amount < 50000) {
    return { 
      name: "L3", 
      fullName: "Level 3", 
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      threshold: 10000 
    };
  }
  
  if (amount < 100000) {
    return { 
      name: "L4", 
      fullName: "Level 4", 
      color: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      threshold: 50000 
    };
  }
  
  if (amount < 500000) {
    return { 
      name: "L5", 
      fullName: "Level 5", 
      color: "bg-purple-500/10 text-purple-400 border-purple-500/25",
      threshold: 100000 
    };
  }
  
  return { 
    name: "L6", 
    fullName: "Level 6 Elite", 
    color: "bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.2)] font-black",
    threshold: 500000 
  };
}
