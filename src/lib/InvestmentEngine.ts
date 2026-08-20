/**
 * InvestmentEngine.ts
 * 
 * Core source of truth for Investment calculations across Aetheris Platform.
 * Fully supports:
 * 1. FIXED — Single-cycle model ($0 -> Final Payout Target based on elapsed time)
 * 2. QUICK TRADE — Single-cycle model ($0 -> Final Payout Target based on elapsed time)
 * 3. FLEX — Recurring multi-cycle model (Each cycle independently progresses $0 -> Cycle Target Payout)
 * 
 * All progress calculations are dynamic, timestamp-driven, and adapt automatically
 * to admin configurations and real-time elapsed timestamps.
 */

export interface InvestmentData {
  id?: string;
  user_id?: string;
  plan?: string;
  plan_name?: string;
  plan_id?: string;
  model?: 'fixed' | 'quick_trade' | 'flex';
  type?: 'fixed' | 'quick_trade' | 'flex';
  
  // Amounts
  principal?: number;
  total_amount?: number;
  amount?: number;
  deposited?: number;
  
  // Returns
  return_pct?: number;
  expectedReturn?: number;
  returnPercentage?: number;
  base_roi?: number;
  final_roi?: number;
  expected_total_profit?: number;
  
  completion_value?: number;
  completionValue?: number;
  expected_payout?: number;
  targetPayout?: number;
  
  // Durations & Intervals
  duration_days?: number;
  duration?: number;
  interval_days?: number;
  
  // Timestamps
  created_at?: any;
  activation_time?: any;
  started_at?: any;
  completed_at?: any;
  startTime?: any;
  endTime?: any;
  next_execution_time?: any;
  next_profit_time?: any;
  
  // Status
  status?: string;
  renewalStatus?: string;
  renewal_status?: string;
  
  // Flags
  isPro?: boolean;
  isFixed?: boolean;
  
  // Flex specific fields
  totalAllocation?: number;
  total_duration_days?: number;
  recurring_interval_days?: number;
  recurringIntervalDays?: number;
  recurring_principal?: number;
  recurringPrincipal?: number;
  amount_per_interval?: number;
  total_cycles?: number;
  total_intervals?: number;
  current_cycle?: number;
  currentCycleNumber?: number;
  intervals_completed?: number;
  cycle_start_time?: any;
  cycle_end_time?: any;
  
  // Config overrides
  maxOutcome?: number;
  proMultiplier?: number;
}

export interface CalculatedInvestmentMetrics {
  id?: string;
  model: 'fixed' | 'quick_trade' | 'flex';
  planName: string;
  status: string; // 'active' | 'completed' | 'paused' | 'pending_activation' | 'renewal_required'
  
  // Core totals
  principalInvested: number;
  totalAllocation: number;
  returnPercentage: number;
  targetPayout: number;
  targetProfit: number;
  
  // Dynamic progression ($0 -> targetPayout)
  currentValue: number;
  currentProfit: number;
  progressPercentage: number;
  
  // Timeline
  startTimeMs: number;
  endTimeMs: number;
  elapsedMs: number;
  durationMs: number;
  remainingMs: number;
  remainingFormatted: string;
  
  isComplete: boolean;
  isPending: boolean;
  
  // Flex multi-cycle specific
  totalCycles: number;
  totalAllocations?: number;
  currentCycleNumber: number;
  completedAllocations?: number;
  cyclePrincipal: number;
  recurringAllocation?: number;
  cycleReturnPct: number;
  cycleProfit: number;
  profitPerAllocation?: number;
  cycleTargetPayout: number;
  allocationValue?: number;
  
  // Flex cycle dynamic progression ($0 -> cycleTargetPayout)
  cycleCurrentValue: number;
  cycleCurrentProfit: number;
  cycleProgress: number;
  cycleStartTimeMs: number;
  cycleEndTimeMs: number;
  cycleRemainingMs: number;
  cycleRemainingFormatted: string;
  
  // Flex renewal state
  renewalRequired: boolean;
  renewalStatus: string;
  userBalance: number;
  requiredRenewalAmount: number;
  shortfall: number;
}

export interface ProjectionInput {
  principal: number;
  returnPercentage: number;
  durationDays?: number;
  recurringIntervalDays?: number;
  model?: 'fixed' | 'quick_trade' | 'flex';
  isPro?: boolean;
}

export interface ProjectionOutput {
  principal: number;
  returnPercentage: number;
  projectedProfit: number;
  estimatedFinalReturn: number;
  
  // Model breakdown
  model: 'fixed' | 'quick_trade' | 'flex';
  durationDays: number;
  recurringIntervalDays: number;
  totalCycles: number;
  totalAllocations: number;
  
  // Per-interval breakdown (for Flex)
  recurringPrincipal: number;
  recurringAllocation: number;
  cycleProfit: number;
  profitPerAllocation: number;
  allocationValue: number;
  cycleEstimatedReturn: number;
}

/**
 * Single Central Calculation Engine for Projections across Aetheris Platform.
 * Enforces the source-of-truth formula:
 * - Principal = investment amount
 * - Total Projected Profit = principal * (returnPercentage / 100)
 * - Final Estimated Return = principal + projectedProfit
 * - Profit Per Allocation = totalProjectedProfit / totalAllocations
 * - Allocation Value = recurringAllocation + profitPerAllocation
 */
export function calculateInvestmentProjection(input: ProjectionInput): ProjectionOutput {
  const principal = Number(input.principal) || 0;
  const returnPercentage = Number(input.returnPercentage) || 0;
  const durationDays = Math.max(1, Number(input.durationDays) || 15);
  const recurringIntervalDays = Math.max(1, Number(input.recurringIntervalDays) || 3);
  
  let model: 'fixed' | 'quick_trade' | 'flex' = input.model || (input.isPro ? 'fixed' : 'flex');
  
  const totalCycles = (model === 'fixed' || model === 'quick_trade')
    ? 1
    : Math.max(1, Math.floor(durationDays / recurringIntervalDays));

  const recurringPrincipal = totalCycles > 1
    ? Number((principal / totalCycles).toFixed(2))
    : principal;

  // Single source of truth formulas:
  const projectedProfit = Number((principal * (returnPercentage / 100)).toFixed(2));
  const estimatedFinalReturn = Number((principal + projectedProfit).toFixed(2));

  const profitPerAllocation = Number((projectedProfit / totalCycles).toFixed(2));
  const allocationValue = Number((recurringPrincipal + profitPerAllocation).toFixed(2));

  return {
    principal,
    returnPercentage,
    projectedProfit,
    estimatedFinalReturn,
    model,
    durationDays,
    recurringIntervalDays,
    totalCycles,
    totalAllocations: totalCycles,
    recurringPrincipal,
    recurringAllocation: recurringPrincipal,
    cycleProfit: profitPerAllocation,
    profitPerAllocation,
    allocationValue,
    cycleEstimatedReturn: allocationValue,
  };
}

/**
 * Safely parse any date representation into milliseconds Unix timestamp
 */
export function parseTimestampMs(ts: any, fallback: number = Date.now()): number {
  if (ts === null || ts === undefined) return fallback;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toDate === 'function') {
    try { return ts.toDate().getTime(); } catch (e) { return fallback; }
  }
  if (ts.seconds !== undefined && ts.seconds !== null) return ts.seconds * 1000;
  if (ts._seconds !== undefined && ts._seconds !== null) return ts._seconds * 1000;
  if (typeof ts === 'string') {
    const parsed = new Date(ts).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Format remaining time in human readable format (e.g., "3 days 4h", "18 hours", "32m 14s")
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return "Completed";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days} days`;
  }
  if (hours > 0) {
    const remMins = minutes % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours} hours`;
  }
  if (minutes > 0) {
    const remSecs = seconds % 60;
    return `${minutes}m ${remSecs}s`;
  }
  return `${seconds}s`;
}

/**
 * Determine the investment model for a given record or configuration
 */
export function getInvestmentModel(inv: InvestmentData): 'fixed' | 'quick_trade' | 'flex' {
  if (inv.model) return inv.model;
  if (inv.type) return inv.type;
  
  const planName = (inv.plan_name || inv.plan || "").toUpperCase();
  const planId = (inv.plan_id || "").toLowerCase();
  
  if (planName.includes("QUICK TRADE") || planId === "quick_trade") {
    return 'quick_trade';
  }
  
  if (inv.isPro || planName.includes("PRO") || inv.isFixed) {
    return 'fixed';
  }
  
  // Default for standard multi-interval investments is Flex recurring
  return 'flex';
}

/**
 * Cleanly format plan name into standardized Tier + Fixed / Flex / Quick Trade
 */
export function formatPlanName(inv: any, opts?: { titleCase?: boolean }): string {
  if (!inv) return opts?.titleCase ? 'Starter Fixed' : 'STARTER FIXED';

  const rawName = typeof inv === 'string' ? inv : (inv.plan_name || inv.plan || inv.name || '');
  const model = typeof inv === 'string' 
    ? (rawName.toUpperCase().includes('QUICK TRADE') ? 'quick_trade' : (rawName.toUpperCase().includes('FLEX') ? 'flex' : 'fixed'))
    : getInvestmentModel(inv);

  if (model === 'quick_trade' || rawName.toUpperCase().includes('QUICK TRADE')) {
    return opts?.titleCase ? 'Quick Trade' : 'QUICK TRADE';
  }

  let cleanTier = rawName
    .toUpperCase()
    .replace(/\bPRO\b/g, '')
    .replace(/\bFIXED\b/g, '')
    .replace(/\bFLEX\b/g, '')
    .replace(/\bQUICK TRADE\b/g, '')
    .trim();

  if (!cleanTier) cleanTier = 'STARTER';

  const suffix = model === 'flex' ? 'FLEX' : 'FIXED';

  if (opts?.titleCase) {
    const capitalizedTier = cleanTier.charAt(0) + cleanTier.slice(1).toLowerCase();
    const capitalizedSuffix = suffix.charAt(0) + suffix.slice(1).toLowerCase();
    return `${capitalizedTier} ${capitalizedSuffix}`;
  }

  return `${cleanTier} ${suffix}`;
}

/**
 * Main engine calculation function. Returns precise real-time calculated metrics
 * for Fixed, Quick Trade, or Flex investment records.
 */
export function calculateInvestmentMetrics(
  inv: InvestmentData,
  globalConfig?: any,
  userBalance: number = 0,
  now: number = Date.now()
): CalculatedInvestmentMetrics {
  const model = getInvestmentModel(inv);
  const planName = formatPlanName(inv);
  const rawStatus = (inv.status || 'active').toLowerCase();
  const isPending = rawStatus === 'pending_activation';
  const isExplicitCompleted = rawStatus === 'completed';

  // Extract Principal
  const totalAmount = Number(inv.total_amount || inv.amount || inv.principal || inv.deposited || 1000);

  if (model === 'fixed' || model === 'quick_trade') {
    // ----------------------------------------------------
    // FIXED & QUICK TRADE: SINGLE-CYCLE MODEL
    // ----------------------------------------------------
    const principalInvested = totalAmount;

    // Return percentage determination
    let returnPct = Number(inv.return_pct ?? inv.expectedReturn ?? inv.returnPercentage ?? inv.final_roi ?? inv.base_roi ?? 0);
    if (returnPct === 0) {
      if (model === 'quick_trade') {
        returnPct = globalConfig?.quickTradeReturnPct !== undefined ? Number(globalConfig.quickTradeReturnPct) : 8.4;
      } else {
        returnPct = 100; // Default 100% configured return
      }
    }

    // Payout Target Calculation: $0 -> Target Payout
    let targetPayout = Number(inv.completionValue ?? inv.completion_value ?? inv.expected_payout ?? inv.targetPayout ?? 0);
    if (targetPayout <= 0) {
      targetPayout = principalInvested * (1 + (returnPct / 100));
    }
    const targetProfit = Math.max(0, targetPayout - principalInvested);

    // Timeline calculation
    const durationDays = Number(inv.duration_days || inv.duration || (model === 'quick_trade' ? (globalConfig?.quickTradeCycleDays ?? 3) : 15));
    const durationMs = Math.max(1000, durationDays * 24 * 60 * 60 * 1000);

    const startTimeMs = parseTimestampMs(
      inv.activation_time || inv.started_at || inv.created_at || inv.startTime,
      now
    );
    const endTimeMs = inv.endTime ? parseTimestampMs(inv.endTime, startTimeMs + durationMs) : (startTimeMs + durationMs);

    let elapsedMs = Math.max(0, now - startTimeMs);
    let isComplete = isExplicitCompleted || (now >= endTimeMs && !isPending);

    let elapsedRatio = 0;
    if (isComplete) {
      elapsedRatio = 1.0;
      elapsedMs = durationMs;
    } else if (isPending) {
      elapsedRatio = 0.0;
      elapsedMs = 0;
    } else {
      elapsedRatio = Math.min(1.0, Math.max(0.0, elapsedMs / durationMs));
    }

    // Single-cycle progression: Starts at $0 -> reaches exact targetPayout at completion
    const currentValue = isComplete ? targetPayout : (isPending ? 0 : Number((targetPayout * elapsedRatio).toFixed(2)));
    const currentProfit = isComplete ? targetProfit : (isPending ? 0 : Number((targetProfit * elapsedRatio).toFixed(2)));
    const progressPercentage = isComplete ? 100 : (isPending ? 0 : Math.round(elapsedRatio * 100));

    const remainingMs = isComplete ? 0 : Math.max(0, endTimeMs - now);
    const status = isComplete ? 'completed' : (isPending ? 'pending_activation' : rawStatus);

    return {
      id: inv.id,
      model,
      planName,
      status,
      principalInvested,
      totalAllocation: principalInvested,
      returnPercentage: returnPct,
      targetPayout: Number(targetPayout.toFixed(2)),
      targetProfit: Number(targetProfit.toFixed(2)),

      currentValue,
      currentProfit,
      progressPercentage,

      startTimeMs,
      endTimeMs,
      elapsedMs,
      durationMs,
      remainingMs,
      remainingFormatted: formatRemainingTime(remainingMs),

      isComplete,
      isPending,

      // Flex stub defaults for Fixed/Quick Trade
      totalCycles: 1,
      currentCycleNumber: 1,
      cyclePrincipal: principalInvested,
      cycleReturnPct: returnPct,
      cycleProfit: targetProfit,
      cycleTargetPayout: targetPayout,
      cycleCurrentValue: currentValue,
      cycleCurrentProfit: currentProfit,
      cycleProgress: progressPercentage,
      cycleStartTimeMs: startTimeMs,
      cycleEndTimeMs: endTimeMs,
      cycleRemainingMs: remainingMs,
      cycleRemainingFormatted: formatRemainingTime(remainingMs),

      renewalRequired: false,
      renewalStatus: 'not_applicable',
      userBalance,
      requiredRenewalAmount: 0,
      shortfall: 0
    };

  } else {
    // ----------------------------------------------------
    // FLEX: RECURRING MULTI-CYCLE MODEL
    // ----------------------------------------------------
    const totalAllocation = totalAmount;

    // Cycle configuration parameters
    const totalDurationDays = Number(inv.total_duration_days || inv.duration_days || inv.duration || 16);
    const recurringIntervalDays = Number(inv.recurring_interval_days || inv.recurringIntervalDays || inv.interval_days || 2);
    const totalCycles = Math.max(1, Number(inv.total_cycles || inv.total_intervals || Math.floor(totalDurationDays / recurringIntervalDays)));

    // Recurring principal per cycle
    let recurringPrincipal = Number(inv.recurring_principal || inv.recurringPrincipal || inv.amount_per_interval || (totalAllocation / totalCycles));
    if (recurringPrincipal <= 0) recurringPrincipal = totalAllocation / totalCycles;

    // Cycle return % (e.g. 105%)
    const cycleReturnPct = Number(inv.return_pct ?? inv.expectedReturn ?? inv.returnPercentage ?? inv.final_roi ?? inv.base_roi ?? 105);

    // Exact cycle calculations:
    // Total Projected Profit = totalAllocation * (cycleReturnPct / 100)
    // Final Estimated Return = totalAllocation + totalTargetProfit
    const totalTargetProfit = Number((totalAllocation * (cycleReturnPct / 100)).toFixed(2));
    const totalTargetPayout = Number((totalAllocation + totalTargetProfit).toFixed(2));

    // Profit Per Allocation & Allocation Value
    const cycleProfit = Number((totalTargetProfit / totalCycles).toFixed(2));
    const cycleTargetPayout = Number((recurringPrincipal + cycleProfit).toFixed(2));

    // Cycle tracking
    const rawIntervalsCompleted = Number(inv.intervals_completed || (inv as any).intervalsCompleted || 0);
    const depositedVal = Number(inv.deposited || inv.total_amount || 0);
    
    // Determine paid cycles count (at least 1 for active plan)
    const paidCyclesFromDeposit = Math.max(1, Math.round(depositedVal / recurringPrincipal));
    const paidCycles = Math.max(paidCyclesFromDeposit, rawIntervalsCompleted);

    let completedCycles = 0;
    let currentCycleNumber = 1;

    if (isExplicitCompleted || rawIntervalsCompleted >= totalCycles) {
      completedCycles = totalCycles;
      currentCycleNumber = totalCycles;
    } else {
      currentCycleNumber = Math.min(totalCycles, paidCycles);
      completedCycles = Math.max(0, currentCycleNumber - 1);
    }

    // Timeline for current active cycle
    const cycleDurationMs = Math.max(1000, recurringIntervalDays * 24 * 60 * 60 * 1000);
    const overallDurationMs = Math.max(1000, totalDurationDays * 24 * 60 * 60 * 1000);

    const overallStartTimeMs = parseTimestampMs(
      inv.activation_time || inv.started_at || inv.created_at || inv.startTime,
      now
    );

    let cycleStartTimeMs = overallStartTimeMs + ((currentCycleNumber - 1) * cycleDurationMs);
    let cycleEndTimeMs = cycleStartTimeMs + cycleDurationMs;

    // Check if Firestore explicitly provided a next_execution_time or next_profit_time for the active cycle
    const storedNextExecMs = parseTimestampMs(inv.next_execution_time || inv.next_profit_time, 0);
    if (storedNextExecMs > 0 && storedNextExecMs > now) {
      cycleEndTimeMs = storedNextExecMs;
      cycleStartTimeMs = Math.max(overallStartTimeMs, cycleEndTimeMs - cycleDurationMs);
    }

    let cycleElapsedMs = Math.max(0, now - cycleStartTimeMs);
    let isCycleComplete = (now >= cycleEndTimeMs) && !isPending;
    let isTotalComplete = isExplicitCompleted || (completedCycles >= totalCycles) || (currentCycleNumber >= totalCycles && isCycleComplete);

    // Renewal check
    const rawRenewalStatus = (inv.renewalStatus || inv.renewal_status || '').toLowerCase();
    const isRenewalRequired = rawRenewalStatus === 'renewal_required' || (isCycleComplete && !isTotalComplete && userBalance < recurringPrincipal);
    const shortfall = Math.max(0, recurringPrincipal - userBalance);

    let status = rawStatus;
    if (isTotalComplete) status = 'completed';
    else if (isRenewalRequired) status = 'renewal_required';
    else if (isPending) status = 'pending_activation';

    let cycleElapsedRatio = 0;
    if (isTotalComplete || isRenewalRequired) {
      cycleElapsedRatio = 1.0;
      cycleElapsedMs = cycleDurationMs;
    } else if (isPending) {
      cycleElapsedRatio = 0.0;
      cycleElapsedMs = 0;
    } else {
      cycleElapsedRatio = Math.min(1.0, Math.max(0.0, cycleElapsedMs / cycleDurationMs));
    }

    // Every individual Flex cycle progresses independently from $0 -> cycleTargetPayout ($2,200)
    const cycleCurrentValue = isTotalComplete ? cycleTargetPayout : (isPending ? 0 : Number((cycleTargetPayout * cycleElapsedRatio).toFixed(2)));
    const cycleCurrentProfit = isTotalComplete ? cycleProfit : (isPending ? 0 : Number((cycleProfit * cycleElapsedRatio).toFixed(2)));
    const cycleProgress = isTotalComplete || isRenewalRequired ? 100 : (isPending ? 0 : Math.round(cycleElapsedRatio * 100));

    const cycleRemainingMs = (isTotalComplete || isRenewalRequired) ? 0 : Math.max(0, cycleEndTimeMs - now);

    // Overall progression across all cycles
    const overallProgress = isTotalComplete
      ? 100
      : Math.round(((completedCycles + (isRenewalRequired ? 1 : cycleElapsedRatio)) / totalCycles) * 100);

    const totalCurrentValue = isTotalComplete
      ? totalTargetPayout
      : Number(((completedCycles * cycleTargetPayout) + cycleCurrentValue).toFixed(2));

    const totalCurrentProfit = isTotalComplete
      ? totalTargetProfit
      : Number(((completedCycles * cycleProfit) + cycleCurrentProfit).toFixed(2));

    const overallRemainingMs = isTotalComplete ? 0 : Math.max(0, (overallStartTimeMs + overallDurationMs) - now);

    const investedCyclesCount = isTotalComplete
      ? totalCycles
      : Math.max(1, completedCycles + (isRenewalRequired || rawStatus === 'paused' || isPending ? 0 : 1));
    const principalInvested = Number(inv.deposited || (recurringPrincipal * investedCyclesCount));

    return {
      id: inv.id,
      model: 'flex',
      planName,
      status,
      principalInvested,
      totalAllocation,
      returnPercentage: cycleReturnPct,
      targetPayout: totalTargetPayout,
      targetProfit: totalTargetProfit,

      currentValue: totalCurrentValue,
      currentProfit: totalCurrentProfit,
      progressPercentage: overallProgress,

      startTimeMs: overallStartTimeMs,
      endTimeMs: overallStartTimeMs + overallDurationMs,
      elapsedMs: Math.max(0, now - overallStartTimeMs),
      durationMs: overallDurationMs,
      remainingMs: overallRemainingMs,
      remainingFormatted: formatRemainingTime(overallRemainingMs),

      isComplete: isTotalComplete,
      isPending,

      // Flex specifics
      totalCycles,
      totalAllocations: totalCycles,
      currentCycleNumber,
      completedAllocations: completedCycles,
      cyclePrincipal: recurringPrincipal,
      recurringAllocation: recurringPrincipal,
      cycleReturnPct,
      cycleProfit,
      profitPerAllocation: cycleProfit,
      cycleTargetPayout,
      allocationValue: cycleTargetPayout,

      cycleCurrentValue,
      cycleCurrentProfit,
      cycleProgress,
      cycleStartTimeMs,
      cycleEndTimeMs,
      cycleRemainingMs,
      cycleRemainingFormatted: formatRemainingTime(cycleRemainingMs),

      renewalRequired: isRenewalRequired,
      renewalStatus: isRenewalRequired ? 'renewal_required' : (rawRenewalStatus || 'active'),
      userBalance,
      requiredRenewalAmount: recurringPrincipal,
      shortfall
    };
  }
}
