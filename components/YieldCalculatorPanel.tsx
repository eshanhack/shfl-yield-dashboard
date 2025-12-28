"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Calculator, 
  TrendingUp, 
  Calendar, 
  History,
  Coins
} from "lucide-react";
import { 
  calculateYield, 
  formatUSD, 
  formatPercent,
  formatNumber,
  HistoricalDraw,
  SHFL_PER_TICKET
} from "@/lib/calculations";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";

interface YieldCalculatorPanelProps {
  shflPrice: number;
  currentWeekNGR: number;
  avgWeeklyNGR: number;
  totalTickets: number;
  historicalDraws: HistoricalDraw[];
  prizeSplit: string;
}

export default function YieldCalculatorPanel({
  shflPrice,
  currentWeekNGR,
  avgWeeklyNGR,
  totalTickets,
  historicalDraws,
  prizeSplit,
}: YieldCalculatorPanelProps) {
  const [inputValue, setInputValue] = useState<string>("100000");

  // Parse the input value to number
  const shflAmount = parseFloat(inputValue) || 0;

  // Load saved amount from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      setInputValue(saved);
    }
  }, []);

  // Auto-save whenever the input value changes (debounced)
  useEffect(() => {
    const amount = parseFloat(inputValue) || 0;
    if (amount > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("shfl-staked-amount", amount.toString());
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("shfl-staked-changed", { detail: amount }));
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers only
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const ticketCount = Math.floor(shflAmount / SHFL_PER_TICKET);
  const stakingValueUSD = shflAmount * shflPrice;

  // This week's expected yield (using current week NGR estimate)
  const thisWeekYield = useMemo(() => {
    return calculateYield(shflAmount, shflPrice, currentWeekNGR, totalTickets, prizeSplit);
  }, [shflAmount, shflPrice, currentWeekNGR, totalTickets, prizeSplit]);

  // Average weekly yield (using 4-week avg NGR)
  const avgWeekYield = useMemo(() => {
    return calculateYield(shflAmount, shflPrice, avgWeeklyNGR, totalTickets, prizeSplit);
  }, [shflAmount, shflPrice, avgWeeklyNGR, totalTickets, prizeSplit]);

  // Monthly and Annual projections based on avg
  const monthlyYield = avgWeekYield.weeklyExpectedUSD * 4.33;
  const monthlyAPY = (monthlyYield / stakingValueUSD) * 100 * 12;
  const annualYield = avgWeekYield.annualExpectedUSD;
  const annualAPY = avgWeekYield.effectiveAPY;

  // Historical yields for each draw (historicalDraws should already be filtered to completed draws)
  const historicalYields = useMemo(() => {
    return historicalDraws.slice(0, 8).map((draw) => {
      const yieldResult = calculateYield(
        shflAmount,
        shflPrice,
        draw.ngrUSD,
        draw.totalTickets,
        draw.prizepoolSplit || prizeSplit
      );
      return {
        draw,
        weeklyUSD: yieldResult.weeklyExpectedUSD,
        weeklyPercent: (yieldResult.weeklyExpectedUSD / stakingValueUSD) * 100,
      };
    });
  }, [shflAmount, shflPrice, historicalDraws, prizeSplit, stakingValueUSD]);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow mb-4 sm:mb-6">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
              <Calculator className="w-4 h-4 text-terminal-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-medium text-terminal-text">
                  Yield Calculator
                </h3>
                <InfoTooltip content={TOOLTIPS.yield} title="How Yield Works" />
              </div>
              <p className="text-[10px] sm:text-xs text-terminal-textMuted hidden sm:block">
                See how much you could earn from lottery prizes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Input Section */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-terminal-border">
          <div className="w-full">
            <label className="block text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider mb-1.5 sm:mb-2">
              SHFL Staked Amount
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg font-mono text-terminal-text focus:outline-none focus:border-terminal-accent transition-colors"
                placeholder="100000"
              />
              <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-terminal-textMuted text-xs sm:text-sm">
                SHFL
              </span>
            </div>
          </div>
          
          {/* Stats row */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-terminal-textMuted mb-0.5 sm:mb-1">
                Tickets
                <InfoTooltip content={TOOLTIPS.ticket} title="Lottery Tickets" />
              </div>
              <div className="text-base sm:text-lg font-bold text-terminal-accent tabular-nums">
                {formatNumber(ticketCount)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-0.5 sm:mb-1">Value</div>
              <div className="text-base sm:text-lg font-bold text-terminal-text">
                <CurrencyAmount amount={stakingValueUSD} />
              </div>
            </div>
          </div>
        </div>

        {/* Yield Projections Grid - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Upcoming Draw */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
              <span className="text-[9px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">Upcoming</span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5" />
                <CurrencyAmount amount={thisWeekYield.weeklyExpectedUSD} className="text-base sm:text-xl font-bold text-terminal-text" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-yellow-400 tabular-nums">
                {((thisWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Average Week */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
              <span className="text-[9px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">Avg Week</span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5" />
                <CurrencyAmount amount={avgWeekYield.weeklyExpectedUSD} className="text-base sm:text-xl font-bold text-terminal-text" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-terminal-accent tabular-nums">
                {((avgWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Monthly */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
              <span className="text-[9px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">Monthly</span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5" />
                <CurrencyAmount amount={monthlyYield} className="text-base sm:text-xl font-bold text-terminal-text" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-green-400 tabular-nums">
                {((monthlyYield / stakingValueUSD) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Annual */}
          <div className="bg-gradient-to-br from-terminal-accent/10 to-purple-900/20 border border-terminal-accent/30 rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
              <span className="text-[9px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">Annual</span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5" />
                <CurrencyAmount amount={annualYield} className="text-base sm:text-xl font-bold text-terminal-text" />
              </div>
              <div className="text-sm sm:text-lg font-bold text-terminal-accent tabular-nums">
                {formatPercent(annualAPY)} APY
              </div>
            </div>
          </div>
        </div>

        {/* Historical Yields - Scrollable on mobile */}
        <div>
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-textSecondary" />
            <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">
              Historical Expected Yields
            </span>
          </div>
          <div className="bg-terminal-dark border border-terminal-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-terminal-border bg-terminal-card/50">
                    <th className="px-2 sm:px-4 py-2 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                      Draw
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                      NGR
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historicalYields.map(({ draw, weeklyUSD, weeklyPercent }, index) => (
                    <tr 
                      key={draw.drawNumber}
                      className={`border-b border-terminal-border/50 ${
                        index === 0 ? "bg-terminal-accent/5" : ""
                      }`}
                    >
                      <td className="px-2 sm:px-4 py-2">
                        <span className="text-xs sm:text-sm font-medium text-terminal-text">
                          #{draw.drawNumber}
                        </span>
                        {index === 0 && (
                          <span className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent uppercase">
                            Latest
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-terminal-textSecondary">
                        {new Date(draw.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm text-terminal-textMuted">
                        <CurrencyAmount amount={draw.ngrUSD} />
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-3 h-3 sm:w-4 sm:h-4" />
                          <CurrencyAmount amount={weeklyUSD} className="text-xs sm:text-sm font-medium text-terminal-text" />
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <span className={`text-xs sm:text-sm font-bold tabular-nums ${
                          weeklyPercent > (avgWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100
                            ? "text-terminal-positive"
                            : "text-terminal-text"
                        }`}>
                          {weeklyPercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
