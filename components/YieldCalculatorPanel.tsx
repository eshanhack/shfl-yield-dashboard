"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Calculator, 
  TrendingUp, 
  Calendar, 
  History,
  Coins,
  ArrowLeftRight
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

interface UpcomingDrawData {
  drawNumber: number;
  date: string;
  ngrUSD: number;
  totalTickets: number;
  prizeSplit: string;
}

interface YieldCalculatorPanelProps {
  shflPrice: number;
  currentWeekNGR: number;
  avgWeeklyNGR: number;
  totalTickets: number;
  historicalDraws: HistoricalDraw[];
  prizeSplit: string;
  upcomingDraw?: UpcomingDrawData;
}

export default function YieldCalculatorPanel({
  shflPrice,
  currentWeekNGR,
  avgWeeklyNGR,
  totalTickets,
  historicalDraws,
  prizeSplit,
  upcomingDraw,
}: YieldCalculatorPanelProps) {
  const [inputValue, setInputValue] = useState<string>("100000");
  const [inputMode, setInputMode] = useState<"shfl" | "tickets">("shfl");

  // Parse the input value to number and calculate SHFL amount based on mode
  const rawInputValue = parseFloat(inputValue) || 0;
  const shflAmount = inputMode === "shfl" 
    ? rawInputValue 
    : rawInputValue * SHFL_PER_TICKET;
  const ticketCount = inputMode === "tickets" 
    ? rawInputValue 
    : Math.floor(rawInputValue / SHFL_PER_TICKET);

  // Load saved amount from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      setInputValue(saved);
    }
  }, []);

  // Auto-save whenever the input value changes (debounced)
  useEffect(() => {
    if (shflAmount > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("shfl-staked-amount", shflAmount.toString());
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("shfl-staked-changed", { detail: shflAmount }));
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [shflAmount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers only
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  // Toggle between SHFL and Tickets input mode
  const handleFlipMode = () => {
    const currentShfl = shflAmount;
    const currentTickets = ticketCount;
    
    if (inputMode === "shfl") {
      // Switching to tickets mode - show current ticket count
      setInputMode("tickets");
      setInputValue(currentTickets.toString());
    } else {
      // Switching to SHFL mode - show current SHFL amount
      setInputMode("shfl");
      setInputValue(currentShfl.toString());
    }
  };

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

  // Calculate upcoming draw yield
  const upcomingYield = useMemo(() => {
    if (!upcomingDraw) return null;
    const yieldResult = calculateYield(
      shflAmount,
      shflPrice,
      upcomingDraw.ngrUSD,
      upcomingDraw.totalTickets,
      upcomingDraw.prizeSplit || prizeSplit
    );
    return {
      draw: upcomingDraw,
      weeklyUSD: yieldResult.weeklyExpectedUSD,
      weeklyPercent: (yieldResult.weeklyExpectedUSD / stakingValueUSD) * 100,
    };
  }, [shflAmount, shflPrice, upcomingDraw, prizeSplit, stakingValueUSD]);

  // Historical yields for each draw (historicalDraws should already be filtered to completed draws)
  // Use adjustedNgrUSD when available (accounts for jackpot replenishment)
  const historicalYields = useMemo(() => {
    return historicalDraws.slice(0, 8).map((draw) => {
      // Use adjusted NGR if available (after jackpot replenishment is deducted)
      // Otherwise fallback to regular NGR
      const effectiveNGR = draw.adjustedNgrUSD !== undefined ? draw.adjustedNgrUSD : draw.ngrUSD;
      
      const yieldResult = calculateYield(
        shflAmount,
        shflPrice,
        effectiveNGR,
        draw.totalTickets,
        draw.prizepoolSplit || prizeSplit
      );
      return {
        draw,
        weeklyUSD: yieldResult.weeklyExpectedUSD,
        weeklyPercent: (yieldResult.weeklyExpectedUSD / stakingValueUSD) * 100,
        // Track if this week had jackpot replenishment adjustment
        hadJackpotReplenishment: draw.jackpotReplenishment && draw.jackpotReplenishment > 0,
        jackpotReplenishment: draw.jackpotReplenishment || 0,
        originalNGR: draw.ngrUSD,
        adjustedNGR: effectiveNGR,
      };
    });
  }, [shflAmount, shflPrice, historicalDraws, prizeSplit, stakingValueUSD]);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow mb-4 sm:mb-5">
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
        {/* ===== UNIFIED LAYOUT (all screen sizes) ===== */}
        <div>
          {/* Input Section */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 sm:gap-4 mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-terminal-border">
            <div className="w-full lg:flex-1">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2 lg:mb-3">
                <label className="text-[10px] sm:text-xs  text-terminal-textSecondary uppercase tracking-wider">
                  {inputMode === "shfl" ? "SHFL Staked Amount" : "Number of Tickets"}
                </label>
                <button
                  onClick={handleFlipMode}
                  className="flex items-center gap-1.5 px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] sm:text-xs  text-terminal-accent hover:text-terminal-text bg-terminal-accent/10 hover:bg-terminal-accent/20 border border-terminal-accent/30 rounded-md transition-all"
                  title={inputMode === "shfl" ? "Switch to ticket input" : "Switch to SHFL input"}
                >
                  <ArrowLeftRight className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">
                    {inputMode === "shfl" ? "Enter Tickets" : "Enter SHFL"}
                  </span>
                  <span className="sm:hidden">Flip</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-base sm:text-lg lg:text-xl font-mono text-terminal-text focus:outline-none focus:border-terminal-accent transition-colors"
                  placeholder={inputMode === "shfl" ? "100000" : "2000"}
                />
                <span className="absolute right-3 sm:right-4 lg:right-5 top-1/2 -translate-y-1/2 text-terminal-textMuted text-xs sm:text-sm ">
                  {inputMode === "shfl" ? "SHFL" : "Tickets"}
                </span>
              </div>
            </div>
            
            {/* Stats row */}
            <div className="flex items-center justify-between sm:justify-start sm:gap-6 lg:gap-10">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-1 text-[10px] sm:text-xs  text-terminal-textMuted mb-0.5 sm:mb-1 lg:mb-2">
                  {inputMode === "shfl" ? "Tickets" : "SHFL"}
                  <InfoTooltip content={TOOLTIPS.ticket} title="Lottery Tickets" />
                </div>
                <div className="text-base sm:text-lg lg:text-xl font-bold text-terminal-accent tabular-nums">
                  {inputMode === "shfl" ? formatNumber(ticketCount) : formatNumber(shflAmount)}
                </div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-[10px] sm:text-xs  text-terminal-textMuted mb-0.5 sm:mb-1 lg:mb-2">Value</div>
                <div className="text-base sm:text-lg lg:text-xl font-bold text-terminal-text">
                  <CurrencyAmount amount={stakingValueUSD} />
                </div>
              </div>
            </div>
          </div>

          {/* Yield Projections Grid - 2x2 on mobile, 4 cols on lg */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
            {/* Upcoming Draw */}
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-4 ">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-3">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4   text-yellow-400" />
                <span className="text-[9px] sm:text-xs  text-terminal-textSecondary uppercase tracking-wider">Upcoming</span>
              </div>
              <div className="space-y-1 sm:space-y-2 lg:space-y-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5 " />
                  <CurrencyAmount amount={thisWeekYield.weeklyExpectedUSD} className="text-base sm:text-xl lg:text-xl font-bold text-terminal-text" />
                </div>
                <div className="text-xs sm:text-sm  font-medium text-yellow-400 tabular-nums">
                  {((thisWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Average Week */}
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-4 ">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-3">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4   text-terminal-accent" />
                <span className="text-[9px] sm:text-xs  text-terminal-textSecondary uppercase tracking-wider">Avg Week</span>
              </div>
              <div className="space-y-1 sm:space-y-2 lg:space-y-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5 " />
                  <CurrencyAmount amount={avgWeekYield.weeklyExpectedUSD} className="text-base sm:text-xl lg:text-xl font-bold text-terminal-text" />
                </div>
                <div className="text-xs sm:text-sm  font-medium text-terminal-accent tabular-nums">
                  {((avgWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Monthly */}
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-4 ">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-3">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4   text-green-400" />
                <span className="text-[9px] sm:text-xs  text-terminal-textSecondary uppercase tracking-wider">Monthly</span>
              </div>
              <div className="space-y-1 sm:space-y-2 lg:space-y-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5 " />
                  <CurrencyAmount amount={monthlyYield} className="text-base sm:text-xl lg:text-xl font-bold text-terminal-text" />
                </div>
                <div className="text-xs sm:text-sm  font-medium text-green-400 tabular-nums">
                  {((monthlyYield / stakingValueUSD) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Annual */}
            <div className="bg-gradient-to-br from-terminal-accent/10 to-purple-900/20 border border-terminal-accent/30 rounded-lg p-2.5 sm:p-4 ">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-3">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4   text-terminal-accent" />
                <span className="text-[9px] sm:text-xs  text-terminal-textSecondary uppercase tracking-wider">Annual</span>
              </div>
              <div className="space-y-1 sm:space-y-2 lg:space-y-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 sm:w-5 sm:h-5 " />
                  <CurrencyAmount amount={annualYield} className="text-base sm:text-xl lg:text-xl font-bold text-terminal-text" />
                </div>
                <div className="text-sm sm:text-lg lg:text-xl font-bold text-terminal-accent tabular-nums">
                  {formatPercent(annualAPY)} APY
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Yields - Scrollable on mobile, full width on desktop */}
        <div>
          <div className="flex items-center gap-2 mb-2 sm:mb-3 lg:mb-3 xl:mb-5">
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4   xl:w-6 xl:h-6 text-terminal-textSecondary" />
            <span className="text-[10px] sm:text-xs  xl:text-base text-terminal-textSecondary uppercase tracking-wider">
              Historical Expected Yields
            </span>
          </div>
          <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl overflow-hidden">
            <div className="overflow-x-auto touch-scroll xl:overflow-x-visible">
              <table className="w-full min-w-[500px] xl:min-w-0">
                <thead>
                  <tr className="border-b border-terminal-border bg-terminal-card/50">
                    <th className="px-2 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-3 xl:py-4 text-left text-[9px] sm:text-[10px] lg:text-xs xl:text-sm text-terminal-textSecondary uppercase tracking-wider">
                      Draw
                    </th>
                    <th className="px-2 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-3 xl:py-4 text-left text-[9px] sm:text-[10px] lg:text-xs xl:text-sm text-terminal-textSecondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-3 xl:py-4 text-right text-[9px] sm:text-[10px] lg:text-xs xl:text-sm text-terminal-textSecondary uppercase tracking-wider">
                      NGR
                    </th>
                    <th className="px-2 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-3 xl:py-4 text-right text-[9px] sm:text-[10px] lg:text-xs xl:text-sm text-terminal-textSecondary uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="px-2 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-3 xl:py-4 text-right text-[9px] sm:text-[10px] lg:text-xs xl:text-sm text-terminal-textSecondary uppercase tracking-wider">
                      Yield %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Upcoming Draw Row */}
                  {upcomingYield && (
                    <tr className="border-b border-terminal-border/50 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border-l-2 border-l-cyan-500">
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3">
                        <span className="text-xs sm:text-sm  font-medium text-cyan-100">
                          #{upcomingYield.draw.drawNumber}
                        </span>
                        <span className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] lg:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 uppercase font-bold">
                          ⏳ Next
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-xs sm:text-sm  text-cyan-200">
                        {new Date(upcomingYield.draw.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-right text-xs sm:text-sm  text-cyan-200">
                        <CurrencyAmount amount={upcomingYield.draw.ngrUSD} />
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-3 h-3 sm:w-4 sm:h-4  " />
                          <CurrencyAmount amount={upcomingYield.weeklyUSD} className="text-xs sm:text-sm  font-medium text-cyan-100" />
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-right">
                        <span className="text-xs sm:text-sm  font-bold tabular-nums text-cyan-300">
                          {upcomingYield.weeklyPercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  )}
                  
                  {/* Historical Draws */}
                  {historicalYields.map(({ draw, weeklyUSD, weeklyPercent, hadJackpotReplenishment, jackpotReplenishment, adjustedNGR }, index) => (
                    <tr 
                      key={draw.drawNumber}
                      className={`border-b border-terminal-border/50 ${
                        index === 0 ? "bg-terminal-accent/5" : ""
                      } ${hadJackpotReplenishment ? "bg-orange-500/5" : ""}`}
                    >
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3">
                        <span className="text-xs sm:text-sm  font-medium text-terminal-text">
                          #{draw.drawNumber}
                        </span>
                        {index === 0 && (
                          <span className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] lg:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent uppercase">
                            Latest
                          </span>
                        )}
                        {hadJackpotReplenishment && (
                          <span className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] lg:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 uppercase" title={`Jackpot replenishment: $${jackpotReplenishment.toLocaleString()}`}>
                            🎰 JP
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-xs sm:text-sm  text-terminal-textSecondary">
                        {new Date(draw.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-right">
                        {hadJackpotReplenishment ? (
                          <div className="flex flex-col items-end">
                            <CurrencyAmount amount={adjustedNGR} className="text-xs sm:text-sm  text-terminal-textMuted" />
                            <span className="text-[9px] lg:text-[10px] text-orange-400 line-through opacity-70">
                              <CurrencyAmount amount={draw.ngrUSD} />
                            </span>
                          </div>
                        ) : (
                          <CurrencyAmount amount={draw.ngrUSD} className="text-xs sm:text-sm  text-terminal-textMuted" />
                        )}
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-3 h-3 sm:w-4 sm:h-4  " />
                          <CurrencyAmount amount={weeklyUSD} className="text-xs sm:text-sm  font-medium text-terminal-text" />
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 lg:px-5 py-2 lg:py-3 text-right">
                        <span className={`text-xs sm:text-sm  font-bold tabular-nums ${
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
