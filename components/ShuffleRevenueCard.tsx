"use client";

import { useState, useMemo } from "react";
import { Building2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { HistoricalDraw, formatNumber } from "@/lib/calculations";
import CurrencyAmount from "./CurrencyAmount";
import { cn } from "@/lib/utils";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";

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

    // Month over month change (current 4 weeks vs previous 4 weeks)
    const prior4Weeks = draws.slice(4, 8);
    const priorMonthlyLotteryNGR = prior4Weeks.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const momChange = priorMonthlyLotteryNGR > 0 
      ? ((monthlyLotteryNGR - priorMonthlyLotteryNGR) / priorMonthlyLotteryNGR) * 100 
      : 0;

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
      momChange,
    };
  }, [historicalDraws, currentWeekNGR]);

  // Generate chart data based on time period
  const chartData = useMemo(() => {
    const draws = historicalDraws.filter(d => d.ngrUSD > 0);
    
    if (timePeriod === "7d") {
      // Show last 7 days worth of data (just the latest draw data points simulated)
      const latestDraw = draws[0];
      if (!latestDraw) return [];
      const lotteryNGR = latestDraw.ngrUSD + (latestDraw.singlesAdded || 0) * 0.85;
      const shuffleNGR = lotteryNGR / 0.15;
      // Simulate daily data for sparkline effect
      return Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        value: shuffleNGR * (0.8 + Math.random() * 0.4) / 7, // Distribute across days with variation
        label: `Day ${i + 1}`,
      }));
    } else if (timePeriod === "30d") {
      // Show last 4 weeks
      return draws.slice(0, 4).reverse().map((draw, i) => {
        const lotteryNGR = draw.ngrUSD + (draw.singlesAdded || 0) * 0.85;
        const shuffleNGR = lotteryNGR / 0.15;
        return {
          day: i + 1,
          value: shuffleNGR,
          label: `Week ${i + 1}`,
        };
      });
    } else {
      // Annual - show last 12 data points (monthly aggregates)
      const monthlyData: { day: number; value: number; label: string }[] = [];
      for (let i = 0; i < 12; i++) {
        const monthDraws = draws.slice(i * 4, (i + 1) * 4);
        if (monthDraws.length === 0) break;
        const monthTotal = monthDraws.reduce((sum, d) => {
          const lotteryNGR = d.ngrUSD + (d.singlesAdded || 0) * 0.85;
          return sum + lotteryNGR / 0.15;
        }, 0);
        monthlyData.push({
          day: i + 1,
          value: monthTotal,
          label: `Month ${12 - i}`,
        });
      }
      return monthlyData.reverse();
    }
  }, [historicalDraws, timePeriod]);

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
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  Shuffle.com Revenue
                </h3>
                <InfoTooltip content={TOOLTIPS.shuffle} title="About Shuffle.com" />
              </div>
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
        {/* Main GGR Display with Chart */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
          {/* Mini Sparkline Chart */}
          {chartData.length > 0 && (
            <div className="h-16 mb-3 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis 
                    hide 
                    domain={['dataMin', 'dataMax']} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-terminal-dark border border-green-500/30 rounded px-2 py-1 text-[10px]">
                          <span className="text-green-400 font-medium">
                            ${formatNumber(Math.round(payload[0].value as number))}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#22c55e", stroke: "#000", strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs text-terminal-textSecondary uppercase tracking-wider">
              {periodLabels[timePeriod]} GGR (Est.)
              <InfoTooltip content={TOOLTIPS.ggr} title="Gross Gaming Revenue" />
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
            {timePeriod === "30d" && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                revenueData.momChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {revenueData.momChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {revenueData.momChange >= 0 ? "+" : ""}{revenueData.momChange.toFixed(1)}% MoM
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

