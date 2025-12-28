"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart3, ExternalLink } from "lucide-react";
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

// Fallback data to show immediately while loading
const FALLBACK_TANZANITE: TanzaniteData = {
  week: { depositVolume: 15000000, percentChange: 5, found: false },
  month: { depositVolume: 60000000, percentChange: 8, found: false },
  year: { depositVolume: 700000000, percentChange: 15, found: false },
};

export default function RevenueAnalysis({ historicalDraws, currentWeekNGR }: RevenueAnalysisProps) {
  // Start with fallback data - renders immediately
  const [tanzaniteData, setTanzaniteData] = useState<TanzaniteData>(FALLBACK_TANZANITE);
  const [isLoading, setIsLoading] = useState(false); // Don't block render
  const [dataSource, setDataSource] = useState<"live" | "estimated">("estimated");

  useEffect(() => {
    const fetchTanzanite = async () => {
      try {
        const scraperUrl = process.env.NEXT_PUBLIC_SCRAPER_URL || "https://shfl-revenue-scraper.onrender.com";
        
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${scraperUrl}/api/tanzanite`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            setTanzaniteData(json.data);
            setDataSource(json.data.week?.found ? "live" : "estimated");
          }
        }
      } catch {
        // Keep fallback data on error - already set
      }
    };

    // Fetch in background without blocking render
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

  // Calculate expected Lottery NGR from deposit volume
  // Formula: Deposit Volume / 3 = GGR, GGR / 2 = NGR, NGR * 15% = Lottery NGR
  // Simplified: Expected Lottery NGR = Deposit Volume / 40
  const calculateExpectedLotteryNGR = (depositVolume: number) => {
    return depositVolume / 40;
  };

  // Determine business health by comparing actual vs expected lottery NGR
  const getBusinessHealth = (depositVolume: number, actualLotteryNGR: number, depositChange: number, ngrChange: number) => {
    const expectedLotteryNGR = calculateExpectedLotteryNGR(depositVolume);
    
    // Calculate variance: how much actual differs from expected
    // Positive = actual > expected (casino winning more)
    // Negative = actual < expected (casino winning less)
    const variance = expectedLotteryNGR > 0 
      ? ((actualLotteryNGR - expectedLotteryNGR) / expectedLotteryNGR) * 100 
      : 0;
    
    // Also consider the trend (change in both metrics)
    const trendDelta = ngrChange - depositChange;
    
    // Combined score: variance is primary, trend is secondary
    const combinedScore = variance * 0.7 + trendDelta * 0.3;
    
    // Thresholds:
    // Within ±10% combined score = As Expected
    // Above +10% = Running Hot (casino winning more than expected)
    // Below -10% = Running Cold (casino winning less than expected)
    if (combinedScore > 10) {
      return { 
        status: "hot", 
        emoji: "🔥", 
        label: "Running Hot", 
        color: "text-orange-400", 
        bgColor: "bg-orange-500/10", 
        borderColor: "border-orange-500/30",
        variance: variance.toFixed(1),
      };
    } else if (combinedScore < -10) {
      return { 
        status: "cold", 
        emoji: "🥶", 
        label: "Running Cold", 
        color: "text-blue-400", 
        bgColor: "bg-blue-500/10", 
        borderColor: "border-blue-500/30",
        variance: variance.toFixed(1),
      };
    } else {
      return { 
        status: "neutral", 
        emoji: "📊", 
        label: "As Expected", 
        color: "text-terminal-textSecondary", 
        bgColor: "bg-terminal-border/30", 
        borderColor: "border-terminal-border/50",
        variance: variance.toFixed(1),
      };
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

      {/* Always render content - use fallback data while loading */}
      <div className="flex-1 flex flex-col">
          {/* Data Rows */}
          <div className="space-y-3 flex-1">
            {periods.map(({ key, label }) => {
              const deposit = tanzaniteData?.[key] || { depositVolume: 0, percentChange: 0 };
              const ngrValue = ngrStats[key];
              const ngrChange = ngrStats[`${key}Change` as keyof typeof ngrStats] as number;
              const health = getBusinessHealth(deposit.depositVolume, ngrValue, deposit.percentChange, ngrChange);
              const expectedNGR = calculateExpectedLotteryNGR(deposit.depositVolume);

              const varianceNum = parseFloat(health.variance);
              
              return (
                <div key={key} className={cn("rounded-lg p-3 border-2", health.bgColor, health.borderColor)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-terminal-text">{label}</span>
                    <div className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg",
                      health.status === "hot" && "bg-orange-500/30 text-orange-300 border border-orange-500/50",
                      health.status === "cold" && "bg-blue-500/30 text-blue-300 border border-blue-500/50",
                      health.status === "neutral" && "bg-terminal-border/50 text-terminal-textSecondary border border-terminal-border"
                    )}>
                      <span className="text-sm">{health.emoji}</span>
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
                      <div className="text-[9px] text-terminal-textMuted mt-0.5">
                        → Expected NGR: {formatVolume(expectedNGR)}
                      </div>
                    </div>
                    
                    {/* Lottery NGR */}
                    <div>
                      <div className="text-[10px] text-terminal-textMuted mb-1 uppercase tracking-wide">Actual Lottery NGR</div>
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
                      <div className={cn(
                        "text-[9px] mt-0.5 font-medium",
                        varianceNum > 5 ? "text-orange-400" : varianceNum < -5 ? "text-blue-400" : "text-terminal-textMuted"
                      )}>
                        {varianceNum > 0 ? "↑" : varianceNum < 0 ? "↓" : "="} {Math.abs(varianceNum).toFixed(1)}% {varianceNum > 0 ? "above" : varianceNum < 0 ? "below" : "at"} expected
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 mt-3 border-t border-terminal-border/50">
            <div className="text-[10px] text-terminal-textSecondary font-medium mb-2">
              Business Health Indicators
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-orange-500/10 border border-orange-500/20">
                <span>🔥</span>
                <span className="text-orange-400 font-medium">Running hot (casino winning)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                <span>🥶</span>
                <span className="text-blue-400 font-medium">Running cold (players winning)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-terminal-border/30 border border-terminal-border/50">
                <span>📊</span>
                <span className="text-terminal-textSecondary font-medium">Running as expected</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-terminal-border/30">
              <a 
                href="https://terminal.tanzanite.xyz/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-terminal-textMuted hover:text-terminal-accent transition-colors flex items-center gap-1"
              >
                Data provided by Tanzanite <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
  );
}

