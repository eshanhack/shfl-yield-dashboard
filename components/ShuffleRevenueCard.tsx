"use client";

import { useState, useMemo } from "react";
import { Building2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { HistoricalDraw, formatNumber } from "@/lib/calculations";
import CurrencyAmount from "./CurrencyAmount";
import { cn } from "@/lib/utils";

interface ShuffleRevenueCardProps {
  historicalDraws: HistoricalDraw[];
  currentWeekNGR: number;
}

type TimePeriod = "7d" | "30d" | "annual";

export default function ShuffleRevenueCard({
  historicalDraws,
  currentWeekNGR,
}: ShuffleRevenueCardProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");

  // Calculate Shuffle.com revenue from lottery NGR (lottery gets 15% of total NGR)
  const revenueData = useMemo(() => {
    // Current week estimate
    const weeklyLotteryNGR = currentWeekNGR;
    const weeklyShuffleNGR = weeklyLotteryNGR / 0.15; // Lottery is 15%, so total = lottery / 0.15
    const weeklyGGR = weeklyShuffleNGR * 2; // GGR ≈ 2 × NGR

    // Calculate from historical draws
    const draws = historicalDraws.filter(d => d.ngrUSD > 0);
    
    // Last 4 weeks (30d approximately)
    const last4Weeks = draws.slice(0, 4);
    const monthlyLotteryNGR = last4Weeks.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const monthlyShuffleNGR = monthlyLotteryNGR / 0.15;
    const monthlyGGR = monthlyShuffleNGR * 2;

    // Annual (52 weeks) - extrapolate from average
    const avgWeeklyLotteryNGR = draws.length > 0 
      ? draws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / draws.length
      : weeklyLotteryNGR;
    const annualLotteryNGR = avgWeeklyLotteryNGR * 52;
    const annualShuffleNGR = annualLotteryNGR / 0.15;
    const annualGGR = annualShuffleNGR * 2;

    // Week over week change
    const thisWeekNGR = draws[0]?.ngrUSD || currentWeekNGR;
    const lastWeekNGR = draws[1]?.ngrUSD || thisWeekNGR;
    const wowChange = lastWeekNGR > 0 ? ((thisWeekNGR - lastWeekNGR) / lastWeekNGR) * 100 : 0;

    return {
      "7d": {
        shuffleNGR: weeklyShuffleNGR,
        ggr: weeklyGGR,
        lotteryNGR: weeklyLotteryNGR,
      },
      "30d": {
        shuffleNGR: monthlyShuffleNGR,
        ggr: monthlyGGR,
        lotteryNGR: monthlyLotteryNGR,
      },
      "annual": {
        shuffleNGR: annualShuffleNGR,
        ggr: annualGGR,
        lotteryNGR: annualLotteryNGR,
      },
      wowChange,
    };
  }, [historicalDraws, currentWeekNGR]);

  const currentData = revenueData[timePeriod];

  const periodLabels: Record<TimePeriod, string> = {
    "7d": "Weekly",
    "30d": "Monthly (4wk)",
    "annual": "Annual (Est.)",
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-500/10 border border-green-500/20">
              <Building2 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-terminal-text">
                Shuffle.com Revenue
              </h3>
              <p className="text-[10px] text-terminal-textMuted">
                Estimated from lottery NGR allocation
              </p>
            </div>
          </div>
          
          {/* Time Period Selector */}
          <div className="flex items-center gap-1 bg-terminal-dark rounded-lg p-0.5">
            {(["7d", "30d", "annual"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                  timePeriod === period
                    ? "bg-green-500/20 text-green-400"
                    : "text-terminal-textMuted hover:text-terminal-text"
                )}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main GGR Display */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">
              {periodLabels[timePeriod]} GGR (Est.)
            </span>
            {timePeriod === "7d" && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                revenueData.wowChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {revenueData.wowChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {revenueData.wowChange >= 0 ? "+" : ""}{revenueData.wowChange.toFixed(1)}% WoW
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <CurrencyAmount 
              amount={currentData.ggr} 
              className="text-3xl font-bold text-green-400"
            />
          </div>
          <p className="text-[10px] text-terminal-textMuted mt-1">
            Gross Gaming Revenue ≈ 2× NGR
          </p>
        </div>

        {/* NGR Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-terminal-accent" />
              <span className="text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                Shuffle NGR
              </span>
            </div>
            <CurrencyAmount 
              amount={currentData.shuffleNGR} 
              className="text-lg font-bold text-terminal-text"
            />
            <p className="text-[9px] text-terminal-textMuted mt-1">
              Net Gaming Revenue
            </p>
          </div>

          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-3.5 h-3.5 rounded-full bg-terminal-accent/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-terminal-accent">15%</span>
              </div>
              <span className="text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                Lottery NGR
              </span>
            </div>
            <CurrencyAmount 
              amount={currentData.lotteryNGR} 
              className="text-lg font-bold text-terminal-accent"
            />
            <p className="text-[9px] text-terminal-textMuted mt-1">
              15% allocated to lottery
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="pt-2 border-t border-terminal-border">
          <p className="text-[10px] text-terminal-textMuted leading-relaxed">
            <span className="text-terminal-accent">•</span> Lottery receives 15% of Shuffle.com NGR
            <br />
            <span className="text-terminal-accent">•</span> GGR (Gross) ≈ 2× NGR (Net) based on industry avg
          </p>
        </div>
      </div>
    </div>
  );
}

