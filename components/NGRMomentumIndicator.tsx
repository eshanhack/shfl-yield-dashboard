"use client";

import { useMemo, useRef } from "react";
import { Activity, TrendingUp, TrendingDown, BarChart3, Scale, AlertTriangle, Shield, Zap } from "lucide-react";
import { HistoricalDraw, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip from "./InfoTooltip";
import ScreenshotButton from "./ScreenshotButton";

interface NGRMomentumIndicatorProps {
  historicalDraws: HistoricalDraw[];
  currentWeekNGR: number;
}

type VolatilityLevel = "low" | "moderate" | "high" | "extreme";

export default function NGRMomentumIndicator({
  historicalDraws,
  currentWeekNGR,
}: NGRMomentumIndicatorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Calculate volatility and stability metrics
  const volatilityData = useMemo(() => {
    const draws = historicalDraws.filter(d => d.ngrUSD > 0);
    if (draws.length < 8) return null;

    const last8Weeks = draws.slice(0, 8);
    const last4Weeks = draws.slice(0, 4);
    const allDraws = draws.slice(0, 52); // Up to 1 year

    // Calculate mean and volatility for different periods
    const mean8W = last8Weeks.reduce((sum, d) => sum + d.ngrUSD, 0) / last8Weeks.length;
    const mean4W = last4Weeks.reduce((sum, d) => sum + d.ngrUSD, 0) / last4Weeks.length;
    const meanAll = allDraws.reduce((sum, d) => sum + d.ngrUSD, 0) / allDraws.length;

    // Standard deviation (volatility)
    const variance8W = last8Weeks.reduce((sum, d) => sum + Math.pow(d.ngrUSD - mean8W, 2), 0) / last8Weeks.length;
    const volatility8W = Math.sqrt(variance8W);
    const volatilityPercent = mean8W > 0 ? (volatility8W / mean8W) * 100 : 0;

    // Week-over-week changes
    const weeklyChanges = [];
    for (let i = 0; i < Math.min(8, draws.length - 1); i++) {
      const change = draws[i + 1].ngrUSD > 0 
        ? ((draws[i].ngrUSD - draws[i + 1].ngrUSD) / draws[i + 1].ngrUSD) * 100 
        : 0;
      weeklyChanges.push(change);
    }

    // Average weekly swing (absolute change)
    const avgWeeklySwing = weeklyChanges.length > 0 
      ? weeklyChanges.reduce((sum, c) => sum + Math.abs(c), 0) / weeklyChanges.length 
      : 0;

    // Max swing in last 8 weeks
    const maxSwing = weeklyChanges.length > 0 
      ? Math.max(...weeklyChanges.map(Math.abs)) 
      : 0;

    // Determine volatility level
    let volatilityLevel: VolatilityLevel = "low";
    if (volatilityPercent >= 40) volatilityLevel = "extreme";
    else if (volatilityPercent >= 25) volatilityLevel = "high";
    else if (volatilityPercent >= 15) volatilityLevel = "moderate";

    // Stability score (inverse of volatility, 0-100)
    const stabilityScore = Math.max(0, Math.min(100, 100 - volatilityPercent * 2));

    // Current vs historical average
    const thisWeek = draws[0]?.ngrUSD || currentWeekNGR;
    const vsHistoricalAvg = meanAll > 0 ? ((thisWeek - meanAll) / meanAll) * 100 : 0;

    // Recent trend direction (4W vs 8W)
    const trendDirection = mean4W > mean8W ? "up" : mean4W < mean8W ? "down" : "flat";
    const trendStrength = mean8W > 0 ? Math.abs((mean4W - mean8W) / mean8W) * 100 : 0;

    // All-time high and low
    const allTimeHigh = Math.max(...allDraws.map(d => d.ngrUSD));
    const allTimeLow = Math.min(...allDraws.map(d => d.ngrUSD));
    const range = allTimeHigh - allTimeLow;
    
    // Best and worst weeks in recent history
    const bestWeekChange = weeklyChanges.length > 0 ? Math.max(...weeklyChanges) : 0;
    const worstWeekChange = weeklyChanges.length > 0 ? Math.min(...weeklyChanges) : 0;
    
    // Consecutive direction streak
    let streakCount = 0;
    let streakDirection: "up" | "down" | null = null;
    for (const change of weeklyChanges) {
      const dir = change >= 0 ? "up" : "down";
      if (streakDirection === null) {
        streakDirection = dir;
        streakCount = 1;
      } else if (dir === streakDirection) {
        streakCount++;
      } else {
        break;
      }
    }

    // Predictability insight
    const isPredictable = volatilityPercent < 20 && avgWeeklySwing < 15;

    return {
      volatilityPercent,
      volatilityLevel,
      volatility8W,
      mean8W,
      mean4W,
      meanAll,
      avgWeeklySwing,
      maxSwing,
      stabilityScore,
      thisWeek,
      vsHistoricalAvg,
      trendDirection,
      trendStrength,
      allTimeHigh,
      allTimeLow,
      bestWeekChange,
      worstWeekChange,
      streakCount,
      streakDirection,
      isPredictable,
      weeklyChanges,
    };
  }, [historicalDraws, currentWeekNGR]);

  if (!volatilityData) {
    return (
      <div ref={panelRef} className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
              <Activity className="w-4 h-4 text-terminal-accent" />
            </div>
            <h3 className="text-sm font-medium text-terminal-text">NGR Volatility</h3>
          </div>
          <ScreenshotButton targetRef={panelRef} filename="shfl-ngr-volatility" />
        </div>
        <p className="text-terminal-textMuted text-sm">Need more data to analyze volatility</p>
      </div>
    );
  }

  const getVolatilityColor = (level: VolatilityLevel) => {
    switch (level) {
      case "low": return "text-terminal-positive";
      case "moderate": return "text-yellow-400";
      case "high": return "text-orange-400";
      case "extreme": return "text-terminal-negative";
    }
  };

  const getVolatilityBg = (level: VolatilityLevel) => {
    switch (level) {
      case "low": return "from-terminal-positive/10 to-emerald-900/20 border-terminal-positive/30";
      case "moderate": return "from-yellow-500/10 to-yellow-900/20 border-yellow-500/30";
      case "high": return "from-orange-500/10 to-orange-900/20 border-orange-500/30";
      case "extreme": return "from-terminal-negative/10 to-red-900/20 border-terminal-negative/30";
    }
  };

  const getVolatilityLabel = (level: VolatilityLevel) => {
    switch (level) {
      case "low": return "Stable";
      case "moderate": return "Moderate";
      case "high": return "Volatile";
      case "extreme": return "Extreme";
    }
  };

  const getVolatilityIcon = (level: VolatilityLevel) => {
    switch (level) {
      case "low": return <Shield className="w-4 h-4 text-terminal-positive" />;
      case "moderate": return <Activity className="w-4 h-4 text-yellow-400" />;
      case "high": return <Zap className="w-4 h-4 text-orange-400" />;
      case "extreme": return <AlertTriangle className="w-4 h-4 text-terminal-negative" />;
    }
  };

  const getInsightMessage = () => {
    if (volatilityData.volatilityLevel === "extreme") {
      return "⚠️ Revenue is highly unpredictable. Expect large yield swings.";
    } else if (volatilityData.volatilityLevel === "high") {
      return "Revenue varies significantly week to week. Plan for fluctuations.";
    } else if (volatilityData.volatilityLevel === "moderate") {
      return "Normal variance in revenue. Yields may fluctuate ±15-25%.";
    } else {
      return "Revenue is relatively stable. Yields should be more predictable.";
    }
  };

  return (
    <div ref={panelRef} className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className={cn(
              "p-1.5 lg:p-2 rounded border flex-shrink-0",
              volatilityData.volatilityLevel === "low" 
                ? "bg-terminal-positive/10 border-terminal-positive/20"
                : volatilityData.volatilityLevel === "extreme"
                ? "bg-terminal-negative/10 border-terminal-negative/20"
                : "bg-yellow-500/10 border-yellow-500/20"
            )}>
              <Activity className={cn(
                "w-4 h-4",
                getVolatilityColor(volatilityData.volatilityLevel)
              )} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  <span className="lg:hidden">NGR Volatility</span>
                  <span className="hidden lg:inline">NGR Volatility Analysis</span>
                </h3>
                <InfoTooltip 
                  content="Measures how much casino revenue fluctuates week to week. High volatility means unpredictable yields. This helps you understand yield stability expectations."
                  title="Revenue Volatility"
                />
              </div>
              <p className="text-[10px] text-terminal-textMuted">
                Weekly revenue stability insights
              </p>
            </div>
          </div>
          
          {/* Volatility Badge and Screenshot */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              volatilityData.volatilityLevel === "low" 
                ? "bg-terminal-positive/20 text-terminal-positive"
                : volatilityData.volatilityLevel === "extreme"
                ? "bg-terminal-negative/20 text-terminal-negative"
                : volatilityData.volatilityLevel === "high"
                ? "bg-orange-500/20 text-orange-400"
                : "bg-yellow-500/20 text-yellow-400"
            )}>
              {getVolatilityIcon(volatilityData.volatilityLevel)}
              <span className="hidden sm:inline">{getVolatilityLabel(volatilityData.volatilityLevel)}</span>
            </div>
            <ScreenshotButton targetRef={panelRef} filename="shfl-ngr-volatility" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1">
        <div className="space-y-4">
          {/* Main Volatility Display */}
          <div className={cn(
            "rounded-lg p-4 border bg-gradient-to-br",
            getVolatilityBg(volatilityData.volatilityLevel)
          )}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                  Volatility Index
                </div>
                <div className={cn("text-2xl lg:text-3xl font-bold tabular-nums", getVolatilityColor(volatilityData.volatilityLevel))}>
                  {volatilityData.volatilityPercent.toFixed(1)}%
                </div>
                <div className="text-[10px] text-terminal-textMuted">
                  σ / mean (8 weeks)
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                  Avg Weekly Swing
                </div>
                <div className="text-lg font-bold text-terminal-text tabular-nums">
                  ±{volatilityData.avgWeeklySwing.toFixed(1)}%
                </div>
                <div className="text-[10px] text-terminal-textMuted">
                  typical change
                </div>
              </div>
            </div>

            {/* Insight Message */}
            <div className="text-[10px] text-terminal-textSecondary bg-terminal-dark/50 rounded px-2 py-1.5">
              {getInsightMessage()}
            </div>
          </div>

          {/* Key Metrics - Mobile: 2 cols, Desktop: 3 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="flex items-center gap-1 mb-1">
                <Scale className="w-3 h-3 text-terminal-textMuted" />
                <span className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider">Stability</span>
              </div>
              <div className={cn(
                "text-sm lg:text-base font-bold tabular-nums",
                volatilityData.stabilityScore >= 70 ? "text-terminal-positive" 
                : volatilityData.stabilityScore >= 50 ? "text-yellow-400"
                : "text-terminal-negative"
              )}>
                {volatilityData.stabilityScore.toFixed(0)}/100
              </div>
            </div>
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-terminal-textMuted" />
                <span className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider">Max Swing</span>
              </div>
              <div className="text-sm lg:text-base font-bold text-terminal-text tabular-nums">
                {volatilityData.maxSwing.toFixed(1)}%
              </div>
            </div>
            <div className="hidden lg:block bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="flex items-center gap-1 mb-1">
                <BarChart3 className="w-3 h-3 text-terminal-textMuted" />
                <span className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider">vs Average</span>
              </div>
              <div className={cn(
                "text-sm lg:text-base font-bold tabular-nums",
                volatilityData.vsHistoricalAvg >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {volatilityData.vsHistoricalAvg >= 0 ? "+" : ""}{volatilityData.vsHistoricalAvg.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Desktop: Additional Analysis */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Best / Worst Week</span>
                {volatilityData.streakCount > 1 && (
                  <div className={cn(
                    "text-[10px] font-medium",
                    volatilityData.streakDirection === "up" ? "text-terminal-positive" : "text-terminal-negative"
                  )}>
                    {volatilityData.streakCount}w {volatilityData.streakDirection === "up" ? "↑" : "↓"} streak
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-terminal-textMuted">Best Week</div>
                  <div className="text-sm font-bold text-terminal-positive tabular-nums">
                    +{volatilityData.bestWeekChange.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-terminal-textMuted">Worst Week</div>
                  <div className="text-sm font-bold text-terminal-negative tabular-nums">
                    {volatilityData.worstWeekChange.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-terminal-textMuted mt-2">
                Your yield can swing this much week-to-week
              </div>
            </div>
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Recent Trend</span>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-medium",
                  volatilityData.trendDirection === "up" ? "text-terminal-positive" : 
                  volatilityData.trendDirection === "down" ? "text-terminal-negative" : 
                  "text-terminal-textMuted"
                )}>
                  {volatilityData.trendDirection === "up" ? <TrendingUp className="w-3 h-3" /> :
                   volatilityData.trendDirection === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                  {volatilityData.trendStrength.toFixed(1)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-terminal-textMuted">4W Average</div>
                  <div className="text-sm font-bold text-terminal-accent tabular-nums">
                    <CurrencyAmount amount={volatilityData.mean4W} />
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-terminal-textMuted">8W Average</div>
                  <div className="text-sm font-bold text-terminal-text tabular-nums">
                    <CurrencyAmount amount={volatilityData.mean8W} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Additional context */}
          <div className="lg:hidden flex items-center justify-between text-[10px] p-2 bg-terminal-dark/50 rounded-lg">
            <span className="text-terminal-textMuted">
              Trend: {volatilityData.trendDirection === "up" ? "↑" : volatilityData.trendDirection === "down" ? "↓" : "→"} {volatilityData.trendStrength.toFixed(1)}%
            </span>
            <span className={cn(
              volatilityData.vsHistoricalAvg >= 0 ? "text-terminal-positive" : "text-terminal-negative"
            )}>
              {volatilityData.vsHistoricalAvg >= 0 ? "+" : ""}{volatilityData.vsHistoricalAvg.toFixed(1)}% vs avg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
