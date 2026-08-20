import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Zap } from "lucide-react";

interface ProfitBreakdownChartProps {
  transactions: any[];
  formatCurrency: (amount: number) => string;
}

export function ProfitBreakdownChart({ transactions, formatCurrency }: ProfitBreakdownChartProps) {
  const [timeframe, setTimeframe] = useState<"7D" | "14D" | "30D" | "ALL">("30D");

  const data = useMemo(() => {
    // Filter profit transactions
    const profits = transactions.filter((tx) => 
      ['profit_release', 'PROFIT_PAYOUT', 'MATURITY_PROFIT'].includes(tx.type) &&
      (tx.status === 'completed' || tx.status === 'paid')
    );

    const now = new Date();
    const daysToSubtract = timeframe === "7D" ? 7 : timeframe === "14D" ? 14 : timeframe === "30D" ? 30 : 365;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - daysToSubtract);

    // Filter by timeframe
    const filtered = timeframe === "ALL" 
      ? profits 
      : profits.filter((tx) => {
          const tDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
          return tDate >= cutoff;
        });

    // Group by day string
    const map = new Map<string, number>();
    
    // Initialize days layout based on timeframe for empty states
    if (timeframe !== "ALL") {
      for (let i = daysToSubtract - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        map.set(dStr, 0);
      }
    }

    filtered.forEach(tx => {
      const tDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
      // fallback to short format 
      const dStr = tDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const current = map.get(dStr) || 0;
      map.set(dStr, current + (tx.amount || 0));
    });

    const res = Array.from(map.entries()).map(([name, profit]) => ({ name, profit }));

    if (timeframe === "ALL" && res.length === 0) {
      return [{ name: 'No data', profit: 0 }];
    }
    
    return res;
  }, [transactions, timeframe]);

  const totalPeriodProfit = data.reduce((acc, item) => acc + item.profit, 0);

  return (
    <Card className="bg-card border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold text-foreground tracking-widest uppercase">
              Profit Analysis
            </h2>
          </div>
          <div className="text-2xl font-bold text-green-400">
            +{formatCurrency(totalPeriodProfit)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            {timeframe === "ALL" ? "All Time" : `Past ${timeframe}`}
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-lg">
          {["7D", "14D", "30D", "ALL"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                timeframe === tf
                  ? "bg-primary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10 }}
              dy={10}
              minTickGap={20}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{
                backgroundColor: "#0f1115",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "#4ade80", fontWeight: "bold" }}
              formatter={(value: any) => [`+${formatCurrency(value)}`, "Profit"]}
              labelStyle={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}
            />
            <Bar 
              dataKey="profit" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.profit > 0 ? "#4ade80" : "#334155"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
