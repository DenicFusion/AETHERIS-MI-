import React from "react";
import { useSearchParams } from "react-router-dom";

// DepositModal is deprecated. All deposit actions route directly to TabDeposit (/dashboard?tab=deposit).
export function DepositModal({ trigger, activeInvestment, defaultAmount }: any) {
  const [, setSearchParams] = useSearchParams();

  if (trigger) {
    const amt = activeInvestment?.amount_per_interval || activeInvestment?.amount || defaultAmount || 0;
    const plan = activeInvestment?.plan || activeInvestment?.name || "";

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSearchParams({ tab: "deposit", amount: String(amt), plan: String(plan) });
        }}
        className="w-full cursor-pointer"
      >
        {trigger}
      </div>
    );
  }

  return null;
}
