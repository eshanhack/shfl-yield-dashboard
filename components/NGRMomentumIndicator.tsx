"use client";

import { useMemo } from "react";
import { Gauge, TrendingUp, TrendingDown, Minus, ArrowRight, Flame, Snowflake, Activity } from "lucide-react";
import { HistoricalDraw, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip from "./InfoTooltip";

interface NGRMomentumIndicatorProps {
  historicalDraws: HistoricalDraw[];
  currentWeekNGR: number;
}

type TrendStatus = "bullish" | "bearish" | "neutral";

export default function NGRMomentumIndicator({
  historicalDraws,
  currentWeekNGR,
}: NGRMomentumIndicatorProps) {
  // Calculate momentum metrics
  const momentumData = useMemo(() => {
    const draws = historicalDraws.filter(d => d.ngrUSD > 0);
    if (draws.length < 8) return null;

    // Calculate moving averages
    const last4Weeks = draws.slice(0, 4);
    const last8Weeks = draws.slice(0, 8);
    const last12Weeks = draws.slice(0, 12);

    const ma4 = last4Weeks.reduce((sum, d) => sum + d.ngrUSD, 0) / last4Weeks.length;
    const ma8 = last8Weeks.reduce((sum, d) => sum + d.ngrUSD, 0) / last8Weeks.length;
    const ma12 = last12Weeks.length >= 12 
      ? last12Weeks.reduce((sum, d) => sum + d.ngrUSD, 0) / last12Weeks.length 
      : ma8;

    // Week over week change
    const thisWeek = draws[0]?.ngrUSD || currentWeekNGR;
    const lastWeek = draws[1]?.ngrUSD || thisWeek;
    const wowChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    // 4-week vs 8-week trend (golden cross / death cross style)
    const maRatio = ma8 > 0 ? (ma4 / ma8) : 1;
    const trendStrength = (maRatio - 1) * 100;

    // Determine trend status
    let trend: TrendStatus = "neutral";
    if (trendStrength > 5) trend = "bullish";
    else if (trendStrength < -5) trend = "bearish";

    // Consecutive weeks up/down
    let consecutiveDirection = 0;
    let direction: "up" | "down" | null = null;
    for (let i = 0; i < Math.min(8, draws.length - 1); i++) {
      const current = draws[i].ngrUSD;
      const previous = draws[i + 1].ngrUSD;
      const isUp = current > previous;
      
      if (direction === null) {
        direction = isUp ? "up" : "down";
        consecutiveDirection = 1;
      } else if ((direction === "up" && isUp) || (direction === "down" && !isUp)) {
        consecutiveDirection++;
      } else {
        break;
      }
    }

    // Predict next week based on trend
    const momentum = ma4 - ma8;
    const predictedNextWeek = ma4 + (momentum * 0.5); // Conservative prediction
    const predictedYieldChange = ma4 > 0 ? ((predictedNextWeek - ma4) / ma4) * 100 : 0;

    // Volatility (standard deviation of last 8 weeks)
    const mean = ma8;
    const variance = last8Weeks.reduce((sum, d) => sum + Math.pow(d.ngrUSD - mean, 2), 0) / last8Weeks.length;
    const volatility = Math.sqrt(variance);
    const volatilityPercent = mean > 0 ? (volatility / mean) * 100 : 0;

    // All-time high and low (from available data)
    const allTimeHigh = Math.max(...draws.map(d => d.ngrUSD));
    const allTimeLow = Math.min(...draws.map(d => d.ngrUSD));
    const currentVsATH = allTimeHigh > 0 ? ((thisWeek / allTimeHigh) - 1) * 100 : 0;

    return {
      ma4,
      ma8,
      ma12,
      wowChange,
      trend,
      trendStrength,
      consecutiveDirection,
      consecutiveDirectionType: direction,
      predictedNextWeek,
      predictedYieldChange,
      volatilityPercent,
      allTimeHigh,
      allTimeLow,
      currentVsATH,
      currentNGR: thisWeek,
    };
  }, [historicalDraws, currentWeekNGR]);

  if (!momentumData) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
            <Gauge className="w-4 h-4 text-terminal-accent" />
          </div>
          <h3 className="text-sm font-medium text-terminal-text">NGR Momentum</h3>
        </div>
        <p className="text-terminal-textMuted text-sm">Need more data to calculate momentum</p>
      </div>
    );
  }

  const getTrendColor = (trend: TrendStatus) => {
    switch (trend) {
      case "bullish": return "text-terminal-positive";
      case "bearish": return "text-terminal-negative";
      default: return "text-terminal-textSecondary";
    }
  };

  const getTrendBg = (trend: TrendStatus) => {
    switch (trend) {
      case "bullish": return "from-terminal-positive/10 to-emerald-900/20 border-terminal-positive/30";
      case "bearish": return "from-terminal-negative/10 to-red-900/20 border-terminal-negative/30";
      default: return "from-terminal-border/20 to-terminal-dark border-terminal-border";
    }
  };

  const getTrendIcon = (trend: TrendStatus) => {
    switch (trend) {
      case "bullish": return <Flame className="w-5 h-5 text-terminal-positive" />;
      case "bearish": return <Snowflake className="w-5 h-5 text-terminal-negative" />;
      default: return <Activity className="w-5 h-5 text-terminal-textSecondary" />;
    }
  };

  const getTrendLabel = (trend: TrendStatus) => {
    switch (trend) {
      case "bullish": return "Bullish";
      case "bearish": return "Bearish";
      default: return "Neutral";
    }
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className={cn(
              "p-1.5 lg:p-2 rounded border flex-shrink-0",
              momentumData.trend === "bullish" 
                ? "bg-terminal-positive/10 border-terminal-positive/20"
                : momentumData.trend === "bearish"
                ? "bg-terminal-negative/10 border-terminal-negative/20"
                : "bg-terminal-accent/10 border-terminal-accent/20"
            )}>
              <Gauge className={cn(
                "w-4 h-4",
                getTrendColor(momentumData.trend)
              )} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  <span className="lg:hidden">NGR Trend</span>
                  <span className="hidden lg:inline">NGR Momentum Indicator</span>
                </h3>
                <InfoTooltip 
                  content="Analyzes casino revenue trends using moving averages. Bullish = 4-week MA above 8-week MA. This is a lagging indicator and not predictive. Not financial advice."
                  title="Revenue Momentum"
                />
              </div>
              <p className="text-[10px] text-terminal-textMuted">
                4W vs 8W moving average analysis
              </p>
            </div>
          </div>
          
          {/* Trend Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            momentumData.trend === "bullish" 
              ? "bg-terminal-positive/20 text-terminal-positive"
              : momentumData.trend === "bearish"
              ? "bg-terminal-negative/20 text-terminal-negative"
              : "bg-terminal-border text-terminal-textSecondary"
          )}>
            {getTrendIcon(momentumData.trend)}
            <span className="hidden sm:inline">{getTrendLabel(momentumData.trend)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1">
        <div className="space-y-4">
          {/* Main Trend Display */}
          <div className={cn(
            "rounded-lg p-4 border bg-gradient-to-br",
            getTrendBg(momentumData.trend)
          )}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                  Trend Strength
                </div>
                <div className={cn("text-2xl lg:text-3xl font-bold tabular-nums", getTrendColor(momentumData.trend))}>
                  {momentumData.trendStrength >= 0 ? "+" : ""}{momentumData.trendStrength.toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                  WoW Change
                </div>
                <div className={cn(
                  "text-lg font-bold tabular-nums flex items-center gap-1 justify-end",
                  momentumData.wowChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  {momentumData.wowChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {momentumData.wowChange >= 0 ? "+" : ""}{momentumData.wowChange.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Streak indicator */}
            {momentumData.consecutiveDirection > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-terminal-textMuted">Streak:</span>
                <span className={cn(
                  "font-medium",
                  momentumData.consecutiveDirectionType === "up" ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  {momentumData.consecutiveDirection} weeks {momentumData.consecutiveDirectionType}
                </span>
              </div>
            )}
          </div>

          {/* Moving Averages - Mobile: 2 cols, Desktop: 3 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">4W MA</div>
              <div className="text-sm lg:text-base font-bold text-terminal-accent tabular-nums">
                <CurrencyAmount amount={momentumData.ma4} />
              </div>
            </div>
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">8W MA</div>
              <div className="text-sm lg:text-base font-bold text-terminal-text tabular-nums">
                <CurrencyAmount amount={momentumData.ma8} />
              </div>
            </div>
            <div className="hidden lg:block bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">12W MA</div>
              <div className="text-sm lg:text-base font-bold text-terminal-textSecondary tabular-nums">
                <CurrencyAmount amount={momentumData.ma12} />
              </div>
            </div>
          </div>

          {/* Desktop: Prediction & Stats */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowRight className="w-3.5 h-3.5 text-terminal-accent" />
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Next Week Est.</span>
              </div>
              <div className="text-lg font-bold text-terminal-text tabular-nums">
                <CurrencyAmount amount={momentumData.predictedNextWeek} />
              </div>
              <div className={cn(
                "text-[10px]",
                momentumData.predictedYieldChange >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {momentumData.predictedYieldChange >= 0 ? "+" : ""}{momentumData.predictedYieldChange.toFixed(1)}% vs current
              </div>
            </div>
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-terminal-accent" />
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Volatility</span>
              </div>
              <div className="text-lg font-bold text-terminal-text tabular-nums">
                {momentumData.volatilityPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                {momentumData.currentVsATH.toFixed(1)}% from ATH
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

