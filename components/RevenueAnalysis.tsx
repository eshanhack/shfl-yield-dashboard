"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Flame, Snowflake, Target, BarChart3, ExternalLink } from "lucide-react";
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
        // Use fallback estimates
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

    // Weekly NGR (latest draw)
    const weekNGR = historicalDraws[0]?.ngrUSD + (historicalDraws[0]?.singlesAdded || 0) * 0.85 || 0;
    const priorWeekNGR = historicalDraws[1]?.ngrUSD + (historicalDraws[1]?.singlesAdded || 0) * 0.85 || weekNGR;
    const weekChange = priorWeekNGR > 0 ? ((weekNGR - priorWeekNGR) / priorWeekNGR) * 100 : 0;

    // Monthly NGR (last 4 weeks average)
    const monthDraws = historicalDraws.slice(0, 4);
    const monthNGR = monthDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const priorMonthDraws = historicalDraws.slice(4, 8);
    const priorMonthNGR = priorMonthDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const monthChange = priorMonthNGR > 0 ? ((monthNGR - priorMonthNGR) / priorMonthNGR) * 100 : 0;

    // Yearly NGR (all draws annualized)
    const totalNGR = historicalDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const avgWeeklyNGR = totalNGR / historicalDraws.length;
    const yearNGR = avgWeeklyNGR * 52;
    
    // For year change, compare first half vs second half of data
    const halfPoint = Math.floor(historicalDraws.length / 2);
    const recentHalf = historicalDraws.slice(0, halfPoint);
    const olderHalf = historicalDraws.slice(halfPoint);
    const recentAvg = recentHalf.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / recentHalf.length;
    const olderAvg = olderHalf.length > 0 ? olderHalf.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / olderHalf.length : recentAvg;
    const yearChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    return { 
      week: weekNGR, 
      month: monthNGR, 
      year: yearNGR, 
      weekChange, 
      monthChange, 
      yearChange 
    };
  }, [historicalDraws]);

  // Determine business health for each period
  const getBusinessHealth = (depositChange: number, ngrChange: number) => {
    const depositUp = depositChange > 2;
    const depositDown = depositChange < -2;
    const ngrUp = ngrChange > 2;
    const ngrDown = ngrChange < -2;

    // Deposit up/same but NGR down = running cold
    if ((depositUp || Math.abs(depositChange) <= 2) && ngrDown) {
      return { status: "cold", emoji: "🥶", label: "Running Cold", color: "text-blue-400", bgColor: "bg-blue-500/10" };
    }
    // Deposit down/same but NGR up = running hot
    if ((depositDown || Math.abs(depositChange) <= 2) && ngrUp) {
      return { status: "hot", emoji: "🔥", label: "Running Hot", color: "text-orange-400", bgColor: "bg-orange-500/10" };
    }
    // Both similar = as expected
    return { status: "neutral", emoji: "📊", label: "As Expected", color: "text-terminal-textSecondary", bgColor: "bg-terminal-border/30" };
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const periods: { key: Period; label: string }[] = [
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "year", label: "Annual" },
  ];

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
            <BarChart3 className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <span className="text-sm font-medium text-terminal-text">Revenue Analysis</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                dataSource === "live" 
                  ? "bg-terminal-positive/20 text-terminal-positive border border-terminal-positive/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}>
                {dataSource === "live" ? "● LIVE" : "◉ EST"}
              </span>
            </div>
          </div>
        </div>
        <a 
          href="https://terminal.tanzanite.xyz/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-terminal-textMuted hover:text-terminal-accent flex items-center gap-1"
        >
          Tanzanite <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Data Rows */}
          {periods.map(({ key, label }) => {
            const deposit = tanzaniteData?.[key] || { depositVolume: 0, percentChange: 0 };
            const ngrValue = ngrStats[key];
            const ngrChange = ngrStats[`${key}Change` as keyof typeof ngrStats] as number;
            const health = getBusinessHealth(deposit.percentChange, ngrChange);

            return (
              <div key={key} className="bg-terminal-dark rounded-lg p-3 border border-terminal-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-terminal-text">{label}</span>
                  <div className={cn("px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1", health.bgColor, health.color)}>
                    <span>{health.emoji}</span>
                    <span>{health.label}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Deposit Volume */}
                  <div>
                    <div className="text-[10px] text-terminal-textMuted mb-0.5">Deposit Volume</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-terminal-text">
                        {formatVolume(deposit.depositVolume)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium flex items-center gap-0.5",
                        deposit.percentChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                      )}>
                        {deposit.percentChange >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {deposit.percentChange >= 0 ? "+" : ""}{deposit.percentChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Lottery NGR */}
                  <div>
                    <div className="text-[10px] text-terminal-textMuted mb-0.5">Lottery NGR</div>
                    <div className="flex items-center gap-2">
                      <CurrencyAmount 
                        amount={ngrValue} 
                        className="text-sm font-bold text-terminal-accent"
                      />
                      <span className={cn(
                        "text-[10px] font-medium flex items-center gap-0.5",
                        ngrChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                      )}>
                        {ngrChange >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {ngrChange >= 0 ? "+" : ""}{ngrChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="pt-2 border-t border-terminal-border/50">
            <div className="text-[10px] text-terminal-textMuted mb-2">Business Health Indicators</div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 text-orange-400">
                🔥 Hot = Low deposits, high NGR (lucky streak)
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                🥶 Cold = High deposits, low NGR (players winning)
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-terminal-border/30 text-terminal-textSecondary">
                📊 Expected = Normal variance
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

