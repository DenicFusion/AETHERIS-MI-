import { calculateInvestmentMetrics, calculateInvestmentProjection, CalculatedInvestmentMetrics } from './InvestmentEngine';

export const TradingEngineService = {
  /**
   * Retrieves standardized outcomes for a single investment or plan configuration.
   * Leverages calculateInvestmentProjection as the single source of truth.
   */
  getPlanOutcomes(planOrInv: any) {
    const nameUpper = (planOrInv.plan_name || planOrInv.plan || planOrInv.name || "").toUpperCase();
    const isPro = nameUpper.includes("PRO") || !!planOrInv.isPro;
    const cleanName = nameUpper.replace(" PRO", "").trim();

    let returnPct = 35;
    if (cleanName === "QUICK TRADE") {
      returnPct = Number(planOrInv.return_pct ?? planOrInv.quickTradeReturnPct ?? planOrInv.expectedReturn ?? 8.4);
    } else if (isPro) {
      if (cleanName === "STARTER") returnPct = 200;
      else if (cleanName === "CORE") returnPct = 220;
      else if (cleanName === "PRIME") returnPct = 260;
      else if (cleanName === "QUANTUM") returnPct = 300;
      else if (cleanName === "APEX") returnPct = 400;
      else if (cleanName === "ULTRA") returnPct = 3400;
      else returnPct = 200;

      if (planOrInv.proReturnPct !== undefined && planOrInv.proReturnPct !== null) {
        returnPct = Number(planOrInv.proReturnPct);
      } else if (planOrInv.proExpectedReturn !== undefined && planOrInv.proExpectedReturn !== null) {
        returnPct = Number(planOrInv.proExpectedReturn);
      } else if (planOrInv.proMultiplier !== undefined && planOrInv.proMultiplier !== null) {
        const pm = Number(planOrInv.proMultiplier);
        if (pm >= 10) returnPct = pm;
        else if (pm === 7) returnPct = 3400;
      }
    } else {
      if (cleanName === "STARTER") returnPct = 35;
      else if (cleanName === "CORE") returnPct = 45;
      else if (cleanName === "PRIME") returnPct = 60;
      else if (cleanName === "QUANTUM") returnPct = 75;
      else if (cleanName === "APEX") returnPct = 110;
      else if (cleanName === "ULTRA") returnPct = 200;

      if (planOrInv.expectedReturn !== undefined && planOrInv.expectedReturn !== null) {
        returnPct = Number(planOrInv.expectedReturn);
      } else if (planOrInv.return_pct !== undefined && planOrInv.return_pct !== null) {
        returnPct = Number(planOrInv.return_pct);
      } else if (planOrInv.expectedOutcome !== undefined && planOrInv.expectedOutcome !== null) {
        const val = Number(planOrInv.expectedOutcome);
        returnPct = val > 10 ? val : Math.round((val - 1) * 100);
      }
    }

    const capital = Number(planOrInv.total_amount || planOrInv.amount || planOrInv.min || planOrInv.minPrice || planOrInv.principal || 1000);
    const durationDays = Number(planOrInv.duration || planOrInv.duration_days || 15);
    const recurringIntervalDays = Number(planOrInv.interval_days || 3);

    const projection = calculateInvestmentProjection({
      principal: capital,
      returnPercentage: returnPct,
      durationDays,
      recurringIntervalDays,
      isPro
    });

    return {
      isPro,
      capital: projection.principal,
      returnPercentage: projection.returnPercentage,
      projectedProfit: projection.projectedProfit,
      estimatedFinalReturn: projection.estimatedFinalReturn,
      minOutcome: projection.estimatedFinalReturn,
      expectedOutcome: projection.estimatedFinalReturn,
      maxOutcome: projection.estimatedFinalReturn,
      estimatedGainMin: projection.projectedProfit,
      estimatedGainMax: projection.projectedProfit,
      projection
    };
  },

  /**
   * Retrieves unified lists for display (base configurations, standard plans, pro plans)
   */
  getPlanLists(plansList: any[]) {
    const defaultPlans = [
      { id: "starter", name: "STARTER", min: 1000, max: 4999, step: 250, dragTicks: 16, minOutcome: 1.20, expectedOutcome: 1.35, maxOutcome: 1.50, riskRating: "Low", statusLabel: "Ready", returns: "Projected Outcome", cycles: "15 Days", intervals: [1, 2, 3], engineUnlock: "Basic AI Trading Engine", duration: 15, proMultiplier: 2 },
      { id: "core", name: "CORE", min: 5000, max: 9999, step: 500, dragTicks: 10, minOutcome: 1.30, expectedOutcome: 1.45, maxOutcome: 1.60, riskRating: "Low", statusLabel: "Ready", returns: "Projected Outcome", cycles: "15 Days", intervals: [1, 2, 3, 4, 5], engineUnlock: "Advanced Market Intelligence", duration: 15, proMultiplier: 2 },
      { id: "prime", name: "PRIME", min: 10000, max: 49999, step: 2500, dragTicks: 16, minOutcome: 1.40, expectedOutcome: 1.60, maxOutcome: 1.80, riskRating: "Medium", statusLabel: "Ready", returns: "Projected Outcome", cycles: "21 Days", intervals: [1, 2, 3, 4, 5], engineUnlock: "Multi-Market Analytics", duration: 21, proMultiplier: 2 },
      { id: "quantum", name: "QUANTUM", min: 50000, max: 99999, step: 5000, dragTicks: 10, minOutcome: 1.50, expectedOutcome: 1.75, maxOutcome: 2.00, riskRating: "Medium", statusLabel: "Optimized", returns: "Projected Outcome", cycles: "30 Days", intervals: [1, 2, 3, 4, 5], engineUnlock: "Institutional Trading Systems", duration: 30, proMultiplier: 2 },
      { id: "apex", name: "APEX", min: 100000, max: 499999, step: 25000, dragTicks: 16, minOutcome: 1.70, expectedOutcome: 2.10, maxOutcome: 2.50, riskRating: "Evaluated", statusLabel: "Optimized", returns: "Projected Outcome", cycles: "45 Days", intervals: [1, 2, 3, 4, 5], engineUnlock: "Strategic Allocation Engine", duration: 45, proMultiplier: 2 },
      { id: "ultra", name: "ULTRA", min: 500000, max: 1000000, step: 50000, dragTicks: 10, minOutcome: 2.00, expectedOutcome: 3.00, maxOutcome: 5.00, riskRating: "Evaluated", statusLabel: "Elite", returns: "Projected Outcome", cycles: "60 Days", intervals: [1, 2, 3, 4, 5, 6, 7], engineUnlock: "Global Market Access", duration: 60, proMultiplier: 7 },
    ];

    const basePlansList = defaultPlans.map(defPlan => {
      const dbPlan = plansList?.find(p => p.id === defPlan.id || p.name?.toUpperCase() === defPlan.name?.toUpperCase());
      if (dbPlan) {
        return { ...defPlan, ...dbPlan };
      }
      return defPlan;
    });

    const customPlans = plansList?.length > 0
      ? plansList.filter(p => !defaultPlans.some(def => def.id === p.id || def.name?.toUpperCase() === p.name?.toUpperCase()))
      : [];

    const mergedPlans = [...basePlansList, ...customPlans];

    const standardPlans = mergedPlans.map((p: any) => {
      const pName = p.name?.toUpperCase() || "";
      let intervalsVal = p.intervals && p.intervals.length > 0 ? p.intervals : [1, 2, 3];
      if (!p.intervals || p.intervals.length === 0) {
        if (pName.includes("STARTER")) {
          intervalsVal = [1, 2, 3];
        } else if (pName.includes("ULTRA")) {
          intervalsVal = [1, 2, 3, 4, 5, 6, 7];
        } else if (["CORE", "PRIME", "QUANTUM", "APEX"].some(k => pName.includes(k))) {
          intervalsVal = [1, 2, 3, 4, 5];
        }
      }
      const days = p.duration || (pName.includes("PRIME") ? 21 : pName.includes("QUANTUM") ? 30 : pName.includes("APEX") ? 45 : pName.includes("ULTRA") ? 60 : 15);
      const cyclesVal = p.cycles || `${days} Days`;
      let fallbackMin = p.min !== undefined ? p.min : (p.minPrice ?? 1000);
      let fallbackMax = p.max !== undefined ? p.max : (p.maxPrice ?? fallbackMin);
      
      if (fallbackMax <= fallbackMin) {
         if (pName.includes("STARTER")) { fallbackMax = Math.max(fallbackMin + 3999, 4999); }
         else if (pName.includes("CORE")) { fallbackMax = Math.max(fallbackMin + 4999, 9999); }
         else if (pName.includes("PRIME")) { fallbackMax = Math.max(fallbackMin + 39999, 49999); }
         else if (pName.includes("QUANTUM")) { fallbackMax = Math.max(fallbackMin + 49999, 99999); }
         else if (pName.includes("APEX")) { fallbackMax = Math.max(fallbackMin + 399999, 499999); }
         else if (pName.includes("ULTRA")) { fallbackMax = Math.max(fallbackMin + 500000, 1000000); }
         else { fallbackMax = fallbackMin * 2; }
      }

      let derivedStep = p.step;
      if (!derivedStep) {
         derivedStep = fallbackMax >= 500000 ? 50000 : 
                       fallbackMax >= 100000 ? 25000 : 
                       fallbackMax >= 50000 ? 5000 : 
                       fallbackMax >= 10000 ? 2500 : 
                       fallbackMax >= 5000 ? 500 : 250;
      }

      return {
        ...p,
        min: fallbackMin,
        max: fallbackMax,
        step: derivedStep,
        intervals: intervalsVal,
        cycles: cyclesVal,
        duration: days
      };
    });

    const proPlans = standardPlans.map((p: any) => {
      const pName = p.name?.toUpperCase() || "";
      let durationTitle = `${p.duration || 15} Days`;

      return {
        ...p,
        id: p.id.endsWith("_pro") ? p.id : `${p.id}_pro`,
        name: pName.endsWith(" PRO") ? pName : `${pName} PRO`,
        isPro: true,
        cycles: `One time payment* (${durationTitle} To Completion)`,
        returns: p.returns?.includes("PRO") ? p.returns : `${p.returns || "Projected Return"} (PRO - Paid in Full on Completion)`,
        intervals: [0]
      };
    });

    const availablePlans = [...standardPlans, ...proPlans];

    return { basePlansList: mergedPlans, standardPlans, proPlans, availablePlans };
  },

  /**
   * Calculate live growth forecasting values driven strictly by InvestmentEngine
   */
  getLiveForecast(inv: any, matchedConfig?: any, liveEarningsByInv: Record<string, number> = {}, isWarning: boolean = false, globalConfig?: any, intervalsList?: any[], userBalance: number = 0) {
    const metrics: CalculatedInvestmentMetrics = calculateInvestmentMetrics(
      { ...matchedConfig, ...inv },
      globalConfig,
      userBalance
    );

    const liveTick = (isWarning || metrics.isComplete) ? 0 : Number(liveEarningsByInv[inv.id] || 0);
    const dynamicForecast = metrics.isComplete
      ? metrics.targetPayout
      : Math.min(metrics.targetPayout, metrics.currentValue + liveTick);

    return {
      metrics,
      capital: metrics.totalAllocation,
      principalInvested: metrics.principalInvested,
      targetReturn: metrics.targetPayout,
      targetProfit: metrics.targetProfit,
      intervalTargetPayout: metrics.model === 'flex' ? metrics.cycleTargetPayout : metrics.targetPayout,
      intervalTargetProfit: metrics.model === 'flex' ? metrics.cycleProfit : metrics.targetProfit,
      dynamicForecast,
      currentProgressVal: metrics.model === 'flex' ? metrics.cycleProgress : metrics.progressPercentage,
      totalIntervals: metrics.totalCycles,
      completedIntervals: metrics.status === 'completed' ? metrics.totalCycles : (metrics.currentCycleNumber - 1)
    };
  }
};
