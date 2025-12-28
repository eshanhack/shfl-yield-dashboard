"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";
import { HistoricalDraw } from "@/lib/calculations";

interface TanzaniteData {
  week: { depositVolume: number; percentChange: number; found: boolean };
  month: { depositVolume: number; percentChange: number; found: boolean };
  year: { depositVolume: number; percentChange: number; found: boolean };
}

interface RevenueAnalysisProps {
  historicalDraws: HistoricalDraw[];
  currentWeekNGR: number;
}

type Period = "week" | "month" | "year";

export default function RevenueAnalysis({ historicalDraws, currentWeekNGR }: RevenueAnalysisProps) {
  const [tanzaniteData, setTanzaniteData] = useState<TanzaniteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "estimated">("estimated");

  useEffect(() => {
    const fetchTanzanite = async () => {
      setIsLoading(true);
      try {
        const scraperUrl = process.env.NEXT_PUBLIC_SCRAPER_URL || "https://shfl-revenue-scraper.onrender.com";
        const response = await fetch(`${scraperUrl}/api/tanzanite`);
        
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            setTanzaniteData(json.data);
            setDataSource(json.data.week?.found ? "live" : "estimated");
          }
        }
      } catch (error) {
        console.error("Error fetching Tanzanite data:", error);
        setTanzaniteData({
          week: { depositVolume: 15000000, percentChange: 5, found: false },
          month: { depositVolume: 60000000, percentChange: 8, found: false },
          year: { depositVolume: 700000000, percentChange: 15, found: false },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTanzanite();
  }, []);

  // Calculate NGR stats for different periods
  const ngrStats = useMemo(() => {
    if (!historicalDraws.length) return { week: 0, month: 0, year: 0, weekChange: 0, monthChange: 0, yearChange: 0 };

    const weekNGR = historicalDraws[0]?.ngrUSD + (historicalDraws[0]?.singlesAdded || 0) * 0.85 || 0;
    const priorWeekNGR = historicalDraws[1]?.ngrUSD + (historicalDraws[1]?.singlesAdded || 0) * 0.85 || weekNGR;
    const weekChange = priorWeekNGR > 0 ? ((weekNGR - priorWeekNGR) / priorWeekNGR) * 100 : 0;

    const monthDraws = historicalDraws.slice(0, 4);
    const monthNGR = monthDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const priorMonthDraws = historicalDraws.slice(4, 8);
    const priorMonthNGR = priorMonthDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const monthChange = priorMonthNGR > 0 ? ((monthNGR - priorMonthNGR) / priorMonthNGR) * 100 : 0;

    const totalNGR = historicalDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const avgWeeklyNGR = totalNGR / historicalDraws.length;
    const yearNGR = avgWeeklyNGR * 52;
    
    const halfPoint = Math.floor(historicalDraws.length / 2);
    const recentHalf = historicalDraws.slice(0, halfPoint);
    const olderHalf = historicalDraws.slice(halfPoint);
    const recentAvg = recentHalf.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / recentHalf.length;
    const olderAvg = olderHalf.length > 0 ? olderHalf.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / olderHalf.length : recentAvg;
    const yearChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    return { week: weekNGR, month: monthNGR, year: yearNGR, weekChange, monthChange, yearChange };
  }, [historicalDraws]);

  // Determine business health based on delta between deposit change and NGR change
  const getBusinessHealth = (depositChange: number, ngrChange: number) => {
    const delta = Math.abs(depositChange - ngrChange);
    
    // If both changes are within 5% of each other, it's as expected
    if (delta <= 5) {
      return { status: "neutral", emoji: "📊", label: "As Expected", color: "text-terminal-textSecondary", bgColor: "bg-terminal-border/30", borderColor: "border-terminal-border/50" };
    }
    
    // Delta > 5%: determine hot or cold
    // Hot: NGR outperforming deposits (NGR up more or down less than deposits)
    // Cold: Deposits outperforming NGR (deposits up more or down less than NGR)
    if (ngrChange > depositChange) {
      return { status: "hot", emoji: "🔥", label: "Running Hot", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" };
    } else {
      return { status: "cold", emoji: "🥶", label: "Running Cold", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" };
    }
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const periods: { key: Period; label: string }[] = [
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "year", label: "Annual" },
  ];

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-terminal-accent/10 border border-terminal-accent/20">
          <BarChart3 className="w-4 h-4 text-terminal-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-terminal-text">Revenue Analysis</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              dataSource === "live" 
                ? "bg-terminal-positive/20 text-terminal-positive border border-terminal-positive/30"
                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
            )}>
              {dataSource === "live" ? "● LIVE" : "◉ EST"}
            </span>
          </div>
          <p className="text-[10px] text-terminal-textMuted mt-0.5">Deposit volume vs lottery NGR comparison</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Data Rows */}
          <div className="space-y-3 flex-1">
            {periods.map(({ key, label }) => {
              const deposit = tanzaniteData?.[key] || { depositVolume: 0, percentChange: 0 };
              const ngrValue = ngrStats[key];
              const ngrChange = ngrStats[`${key}Change` as keyof typeof ngrStats] as number;
              const health = getBusinessHealth(deposit.percentChange, ngrChange);

              return (
                <div key={key} className={cn("rounded-lg p-3 border", health.bgColor, health.borderColor)}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-terminal-text">{label}</span>
                    <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1", health.color)}>
                      <span>{health.emoji}</span>
                      <span>{health.label}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Deposit Volume */}
                    <div>
                      <div className="text-[10px] text-terminal-textMuted mb-1 uppercase tracking-wide">Deposits</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-terminal-text tabular-nums">
                          {formatVolume(deposit.depositVolume)}
                        </span>
                        <span className={cn(
                          "text-[10px] font-semibold flex items-center",
                          deposit.percentChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                        )}>
                          {deposit.percentChange >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                          {deposit.percentChange >= 0 ? "+" : ""}{deposit.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Lottery NGR */}
                    <div>
                      <div className="text-[10px] text-terminal-textMuted mb-1 uppercase tracking-wide">Lottery NGR</div>
                      <div className="flex items-baseline gap-1.5">
                        <CurrencyAmount 
                          amount={ngrValue} 
                          className="text-base font-bold text-terminal-accent tabular-nums"
                        />
                        <span className={cn(
                          "text-[10px] font-semibold flex items-center",
                          ngrChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                        )}>
                          {ngrChange >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                          {ngrChange >= 0 ? "+" : ""}{ngrChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 mt-3 border-t border-terminal-border/50">
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-orange-500/10 border border-orange-500/20">
                <span>🔥</span>
                <span className="text-orange-400 font-medium">Casino winning</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                <span>🥶</span>
                <span className="text-blue-400 font-medium">Players winning</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-terminal-border/30 border border-terminal-border/50">
                <span>📊</span>
                <span className="text-terminal-textSecondary font-medium">Normal variance</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

