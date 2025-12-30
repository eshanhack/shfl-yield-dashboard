"use client";

import { useState, useEffect, useMemo } from "react";
import { Hourglass, TrendingUp, Calendar, Target, ChevronDown, Settings2 } from "lucide-react";
import { HistoricalDraw, formatUSD, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip from "./InfoTooltip";

interface BreakEvenTimerProps {
  historicalDraws: HistoricalDraw[];
  currentPrice: number;
  currentWeeklyYieldPer1K: number;
}

export default function BreakEvenTimer({
  historicalDraws,
  currentPrice,
  currentWeeklyYieldPer1K,
}: BreakEvenTimerProps) {
  const [stakedAmount, setStakedAmount] = useState<number>(1000);
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice);

  // Load saved staked amount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      const amount = parseFloat(saved);
      if (amount > 0) setStakedAmount(amount);
    }

    const handleStakedChange = (e: CustomEvent<number>) => {
      if (e.detail > 0) setStakedAmount(e.detail);
    };

    window.addEventListener("shfl-staked-changed" as any, handleStakedChange);
    return () => window.removeEventListener("shfl-staked-changed" as any, handleStakedChange);
  }, []);

  // Update entry price when current price changes (first load)
  useEffect(() => {
    if (entryPrice === 0) {
      setEntryPrice(currentPrice);
    }
  }, [currentPrice, entryPrice]);

  // Format staked amount for display
  const stakedLabel = stakedAmount >= 1000000 
    ? `${(stakedAmount / 1000000).toFixed(1)}M` 
    : stakedAmount >= 1000 
    ? `${formatNumber(stakedAmount / 1000)}K` 
    : formatNumber(stakedAmount);

  // Calculate break-even metrics
  const breakEvenData = useMemo(() => {
    if (!entryPrice || entryPrice <= 0 || currentWeeklyYieldPer1K <= 0) {
      return null;
    }

    // Initial investment value
    const initialInvestment = stakedAmount * entryPrice;
    
    // Weekly yield based on user's stake
    const weeklyYield = (stakedAmount / 1000) * currentWeeklyYieldPer1K;
    
    // Current holdings value
    const currentValue = stakedAmount * currentPrice;
    
    // Unrealized P&L from price
    const unrealizedPnL = currentValue - initialInvestment;
    
    // Calculate weeks to break even
    // Break even = when cumulative yield >= initial investment
    const weeksToBreakEven = weeklyYield > 0 ? Math.ceil(initialInvestment / weeklyYield) : Infinity;
    
    // If price has dropped, need to cover both initial + loss
    const effectiveBreakEven = unrealizedPnL < 0 
      ? Math.ceil((initialInvestment + Math.abs(unrealizedPnL)) / weeklyYield)
      : weeksToBreakEven;
    
    // Calculate break-even date
    const breakEvenDate = new Date();
    breakEvenDate.setDate(breakEvenDate.getDate() + (effectiveBreakEven * 7));
    
    // Monthly/Annual projections
    const monthlyYield = weeklyYield * 4.33;
    const annualYield = weeklyYield * 52;
    
    // ROI metrics
    const annualROI = (annualYield / initialInvestment) * 100;
    
    // Progress if we're counting yield already earned
    const avgWeeklyYield = historicalDraws.length > 0 
      ? historicalDraws.slice(0, 12).reduce((sum, d) => {
          const totalPool = d.totalPoolUSD || 0;
          const stakerPool = totalPool * 0.70;
          const totalTickets = d.totalTickets || 1;
          const tickets = stakedAmount / 50;
          return sum + (tickets / totalTickets) * stakerPool;
        }, 0) / Math.min(12, historicalDraws.length)
      : weeklyYield;

    return {
      initialInvestment,
      weeklyYield,
      currentValue,
      unrealizedPnL,
      weeksToBreakEven: effectiveBreakEven,
      breakEvenDate,
      monthlyYield,
      annualYield,
      annualROI,
      avgWeeklyYield,
    };
  }, [stakedAmount, entryPrice, currentPrice, currentWeeklyYieldPer1K, historicalDraws]);

  // Progress percentage (capped at 100)
  const progressPercent = useMemo(() => {
    if (!breakEvenData) return 0;
    // Estimate yield earned so far (assume started recently)
    const weeksStaked = Math.min(historicalDraws.length, 12);
    const yieldEarned = breakEvenData.avgWeeklyYield * weeksStaked;
    return Math.min(100, (yieldEarned / breakEvenData.initialInvestment) * 100);
  }, [breakEvenData, historicalDraws]);

  const formatWeeks = (weeks: number) => {
    if (weeks === Infinity) return "∞";
    if (weeks >= 52) {
      const years = Math.floor(weeks / 52);
      const remainingWeeks = weeks % 52;
      return remainingWeeks > 0 ? `${years}y ${remainingWeeks}w` : `${years}y`;
    }
    return `${weeks}w`;
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex flex-col max-lg:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
              <Hourglass className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  <span className="lg:hidden">Break-Even</span>
                  <span className="hidden lg:inline">Break-Even Timer</span>
                </h3>
                <InfoTooltip 
                  content="Calculates how long until your dividend yield covers your initial investment. Based on current yield rates which may change. Not financial advice."
                  title="Break-Even Calculator"
                />
              </div>
              <p className="text-[10px] text-terminal-textMuted">
                Time until yield covers investment
              </p>
            </div>
          </div>

          {/* Entry Price Input */}
          <div className="flex items-center gap-2 max-lg:w-full">
            <span className="text-[10px] text-terminal-textMuted">Entry:</span>
            <input
              type="number"
              step="0.0001"
              value={entryPrice || ""}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              placeholder={currentPrice.toFixed(4)}
              className="w-20 lg:w-24 bg-terminal-dark border border-terminal-border rounded-lg px-2 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1">
        {breakEvenData ? (
          <div className="space-y-4">
            {/* Main Break-Even Display */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider">
                  Break-Even In
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Target className="w-3 h-3" />
                  <span>Target: <CurrencyAmount amount={breakEvenData.initialInvestment} /></span>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl lg:text-4xl font-bold text-amber-400 tabular-nums">
                  {formatWeeks(breakEvenData.weeksToBreakEven)}
                </span>
                <div className="text-sm text-terminal-textMuted">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  {breakEvenData.breakEvenDate.toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric",
                    year: breakEvenData.weeksToBreakEven > 52 ? "numeric" : undefined
                  })}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-terminal-textMuted mb-1">
                  <span>Progress</span>
                  <span>{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-terminal-dark rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Yield Stats - Mobile: 2 cols, Desktop: 4 cols */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
                <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">Weekly</div>
                <div className="text-sm lg:text-base font-bold text-terminal-positive tabular-nums">
                  +<CurrencyAmount amount={breakEvenData.weeklyYield} />
                </div>
              </div>
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
                <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">Monthly</div>
                <div className="text-sm lg:text-base font-bold text-terminal-positive tabular-nums">
                  +<CurrencyAmount amount={breakEvenData.monthlyYield} />
                </div>
              </div>
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
                <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">Annual</div>
                <div className="text-sm lg:text-base font-bold text-terminal-positive tabular-nums">
                  +<CurrencyAmount amount={breakEvenData.annualYield} />
                </div>
              </div>
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
                <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">APY</div>
                <div className="text-sm lg:text-base font-bold text-terminal-accent tabular-nums">
                  {breakEvenData.annualROI.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Desktop: Additional Info */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between text-xs text-terminal-textMuted p-2 bg-terminal-dark/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span>Investment: <CurrencyAmount amount={breakEvenData.initialInvestment} className="text-terminal-text" /></span>
                  <span>Current Value: <CurrencyAmount amount={breakEvenData.currentValue} className="text-terminal-text" /></span>
                </div>
                <div className={cn(
                  "font-medium",
                  breakEvenData.unrealizedPnL >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  {breakEvenData.unrealizedPnL >= 0 ? "+" : ""}<CurrencyAmount amount={breakEvenData.unrealizedPnL} /> unrealized
                </div>
              </div>
            </div>

            {/* Staked Amount Reminder */}
            <div className="flex items-center justify-between text-[10px] text-terminal-textMuted p-2 bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg">
              <span>Using <span className="text-terminal-accent font-medium">{stakedLabel} SHFL</span> staked</span>
              <button
                onClick={() => {
                  const el = document.getElementById("yield-calculator");
                  if (el) {
                    const isMobile = window.innerWidth < 1024;
                    const yOffset = isMobile ? -70 : -120;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-terminal-accent hover:text-terminal-text hover:bg-terminal-accent/20 rounded transition-colors"
              >
                <Settings2 className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-terminal-textMuted text-sm">
            Enter your entry price to calculate break-even
          </div>
        )}
      </div>
    </div>
  );
}

