"use client";

import { useState, useEffect, useMemo } from "react";
import { CircleDollarSign, TrendingUp, TrendingDown, Calendar, Coins, ChevronDown, ArrowRight, Settings2 } from "lucide-react";
import { HistoricalDraw, formatUSD, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip from "./InfoTooltip";

interface PersonalROITrackerProps {
  historicalDraws: HistoricalDraw[];
  currentPrice: number;
}

export default function PersonalROITracker({
  historicalDraws,
  currentPrice,
}: PersonalROITrackerProps) {
  const [stakedAmount, setStakedAmount] = useState<number>(1000);
  const [startDrawNumber, setStartDrawNumber] = useState<number | null>(null);
  const [entryPrice, setEntryPrice] = useState<number>(0);

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

  // Set default start draw to earliest available
  useEffect(() => {
    if (historicalDraws.length > 0 && startDrawNumber === null) {
      // Default to 12 weeks ago or earliest available
      const defaultDraw = historicalDraws[Math.min(11, historicalDraws.length - 1)];
      setStartDrawNumber(defaultDraw?.drawNumber || historicalDraws[0].drawNumber);
    }
  }, [historicalDraws, startDrawNumber]);

  // Calculate ROI metrics
  const roiData = useMemo(() => {
    if (!startDrawNumber || historicalDraws.length === 0) {
      return null;
    }

    // Find draws from start to now
    const startIndex = historicalDraws.findIndex(d => d.drawNumber === startDrawNumber);
    if (startIndex === -1) return null;

    const relevantDraws = historicalDraws.slice(0, startIndex + 1).reverse();
    const startDraw = relevantDraws[0];
    
    // Calculate cumulative yield
    const tickets = stakedAmount / 50;
    let cumulativeYield = 0;
    const yieldByWeek: { draw: number; yield: number; cumulative: number }[] = [];

    relevantDraws.forEach((draw) => {
      const totalPool = draw.totalPoolUSD || 0;
      const jackpotPortion = totalPool * 0.30; // 30% to jackpot
      const stakerPool = totalPool - jackpotPortion;
      const totalTickets = draw.totalTickets || 1;
      const weeklyYield = (tickets / totalTickets) * stakerPool;
      cumulativeYield += weeklyYield;
      
      yieldByWeek.push({
        draw: draw.drawNumber,
        yield: weeklyYield,
        cumulative: cumulativeYield,
      });
    });

    // Price appreciation/depreciation
    // Use entry price if set, otherwise use current price (user should set entry price for accurate tracking)
    const startPrice = entryPrice > 0 ? entryPrice : currentPrice;
    const priceChange = currentPrice - startPrice;
    const priceChangePercent = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
    const priceImpact = priceChange * stakedAmount;

    // Total return
    const totalReturn = cumulativeYield + priceImpact;
    const totalReturnPercent = (totalReturn / (startPrice * stakedAmount)) * 100;

    // Weeks staked
    const weeksStaked = relevantDraws.length;

    // Annualized yield
    const annualizedYield = weeksStaked > 0 ? (cumulativeYield / weeksStaked) * 52 : 0;
    const annualizedYieldPercent = (annualizedYield / (startPrice * stakedAmount)) * 100;

    return {
      cumulativeYield,
      priceImpact,
      priceChangePercent,
      totalReturn,
      totalReturnPercent,
      weeksStaked,
      annualizedYield,
      annualizedYieldPercent,
      yieldByWeek,
      startPrice,
      startDate: startDraw.date,
    };
  }, [startDrawNumber, historicalDraws, stakedAmount, currentPrice, entryPrice]);

  // Format staked amount for display
  const stakedLabel = stakedAmount >= 1000000 
    ? `${(stakedAmount / 1000000).toFixed(1)}M` 
    : stakedAmount >= 1000 
    ? `${formatNumber(stakedAmount / 1000)}K` 
    : formatNumber(stakedAmount);

  // Available draws for selection (last 52 weeks)
  const availableDraws = historicalDraws.slice(0, 52);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex flex-col max-lg:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded bg-teal-500/10 border border-teal-500/20 flex-shrink-0">
              <CircleDollarSign className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  <span className="lg:hidden">My ROI</span>
                  <span className="hidden lg:inline">Personal ROI Tracker</span>
                </h3>
                <InfoTooltip 
                  content="Track your actual returns since you started staking. Includes both yield earned and price appreciation/depreciation of your SHFL holdings. Data may be inaccurate."
                  title="ROI Tracker"
                />
              </div>
              <p className="text-[10px] text-terminal-textMuted lg:whitespace-nowrap">
                {roiData ? `${roiData.weeksStaked} weeks • ${stakedLabel} SHFL` : "Select start date"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 max-lg:w-full">
            {/* Start Draw Selector */}
            <div className="relative flex-1 lg:flex-none">
              <select
                value={startDrawNumber || ""}
                onChange={(e) => setStartDrawNumber(parseInt(e.target.value))}
                className="appearance-none w-full lg:w-auto bg-terminal-dark border border-terminal-border rounded-lg px-3 py-1.5 pr-8 text-[10px] lg:text-xs text-terminal-text focus:outline-none focus:border-terminal-accent cursor-pointer"
              >
                {availableDraws.map((draw) => (
                  <option key={draw.drawNumber} value={draw.drawNumber}>
                    Draw #{draw.drawNumber} - {new Date(draw.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-terminal-textMuted pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1">
        {roiData ? (
          <div className="space-y-4">
            {/* Main ROI Display */}
            <div className={cn(
              "rounded-lg p-4 border",
              roiData.totalReturn >= 0 
                ? "bg-gradient-to-br from-terminal-positive/10 to-emerald-900/20 border-terminal-positive/30"
                : "bg-gradient-to-br from-terminal-negative/10 to-red-900/20 border-terminal-negative/30"
            )}>
              <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                Total Return ({roiData.weeksStaked}wk)
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-2xl lg:text-3xl font-bold tabular-nums",
                  roiData.totalReturn >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  {roiData.totalReturn >= 0 ? "+" : ""}<CurrencyAmount amount={roiData.totalReturn} />
                </span>
                <span className={cn(
                  "text-sm font-medium",
                  roiData.totalReturn >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  ({roiData.totalReturnPercent >= 0 ? "+" : ""}{roiData.totalReturnPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Breakdown - 2 columns on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Yield Earned */}
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Coins className="w-3.5 h-3.5 text-terminal-accent" />
                  <span className="text-[10px] text-terminal-textSecondary uppercase tracking-wider">Yield Earned</span>
                </div>
                <div className="text-lg lg:text-xl font-bold text-terminal-accent tabular-nums">
                  +<CurrencyAmount amount={roiData.cumulativeYield} />
                </div>
                <div className="text-[10px] text-terminal-textMuted mt-1">
                  ~<CurrencyAmount amount={roiData.cumulativeYield / roiData.weeksStaked} />/week avg
                </div>
              </div>

              {/* Price Impact */}
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  {roiData.priceImpact >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-terminal-positive" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-terminal-negative" />
                  )}
                  <span className="text-[10px] text-terminal-textSecondary uppercase tracking-wider">Price Impact</span>
                </div>
                <div className={cn(
                  "text-lg lg:text-xl font-bold tabular-nums",
                  roiData.priceImpact >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  {roiData.priceImpact >= 0 ? "+" : ""}<CurrencyAmount amount={roiData.priceImpact} />
                </div>
                <div className="text-[10px] text-terminal-textMuted mt-1">
                  ${roiData.startPrice.toFixed(4)} <ArrowRight className="w-2.5 h-2.5 inline" /> ${currentPrice.toFixed(4)} ({roiData.priceChangePercent >= 0 ? "+" : ""}{roiData.priceChangePercent.toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Desktop: Additional Stats */}
            <div className="hidden lg:grid grid-cols-3 gap-3">
              <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">Annualized Yield</div>
                <div className="text-sm font-bold text-terminal-text tabular-nums">
                  <CurrencyAmount amount={roiData.annualizedYield} />
                </div>
                <div className="text-[10px] text-terminal-positive">
                  {roiData.annualizedYieldPercent.toFixed(1)}% APY
                </div>
              </div>
              <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">Period</div>
                <div className="text-sm font-bold text-terminal-text tabular-nums">
                  {roiData.weeksStaked} weeks
                </div>
                <div className="text-[10px] text-terminal-textMuted">
                  Since {new Date(roiData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                </div>
              </div>
              <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">Holdings Value</div>
                <div className="text-sm font-bold text-terminal-text tabular-nums">
                  <CurrencyAmount amount={stakedAmount * currentPrice} />
                </div>
                <div className="text-[10px] text-terminal-textMuted">
                  {formatNumber(stakedAmount)} SHFL
                </div>
              </div>
            </div>

            {/* Entry Price Input */}
            <div className="flex items-center gap-2 text-[10px] text-terminal-textMuted p-2 bg-terminal-dark/50 rounded-lg">
              <span>Your entry price:</span>
              <input
                type="number"
                step="0.0001"
                placeholder={currentPrice.toFixed(4)}
                value={entryPrice || ""}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-20 lg:w-24 bg-terminal-dark border border-terminal-border rounded px-2 py-1 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent"
              />
              <span className="text-terminal-textMuted/70 hidden lg:inline">(for accurate price impact)</span>
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
            Select a start date to track your ROI
          </div>
        )}
      </div>
    </div>
  );
}

