export function calculateYield(principal: number, targetYieldPercent: number, daysElapsed: number, totalDuration: number, multiplier: number = 1.0) {
  // Simulate performance-based growth
  // targetYieldPercent is something like 150 (meaning 150% of principal, or 50% profit)
  const targetProfitPercent = targetYieldPercent - 100;
  const targetProfit = principal * (targetProfitPercent / 100);
  
  // Calculate linear progress
  const progress = Math.min(daysElapsed / totalDuration, 1);
  
  // Apply multiplier (controlled by admin)
  const adjustedProfit = targetProfit * multiplier;
  
  // Add some slight randomization to simulate real-time performance (+/- 2%)
  const variance = 1 + (Math.random() * 0.04 - 0.02);
  
  const currentYield = adjustedProfit * progress * variance;
  
  return {
    principal,
    currentYield: Number(currentYield.toFixed(2)),
    totalValue: Number((principal + currentYield).toFixed(2)),
    progressPercent: Math.round(progress * 100),
    isComplete: progress >= 1
  };
}
