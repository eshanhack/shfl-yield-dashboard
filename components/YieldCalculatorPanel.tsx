"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Calculator, 
  TrendingUp, 
  Calendar, 
  History,
  Save,
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
  const [savedAmount, setSavedAmount] = useState<number | null>(null);

  // Parse the input value to number
  const shflAmount = parseFloat(inputValue) || 0;

  // Load saved amount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      setInputValue(saved);
      setSavedAmount(parseFloat(saved));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers only
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleSave = () => {
    localStorage.setItem("shfl-staked-amount", shflAmount.toString());
    setSavedAmount(shflAmount);
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

  // Historical yields for each draw
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
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow mb-6">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
              <Calculator className="w-4 h-4 text-terminal-accent" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-terminal-text">
                Yield Calculator
              </h3>
              <p className="text-xs text-terminal-textMuted">
                Expected returns based on your stake
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Input Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 pb-6 border-b border-terminal-border">
          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-xs text-terminal-textSecondary uppercase tracking-wider mb-2">
              SHFL Staked Amount
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full bg-terminal-dark border border-terminal-border rounded-lg px-4 py-3 text-lg font-mono text-terminal-text focus:outline-none focus:border-terminal-accent transition-colors"
                placeholder="100000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-terminal-textMuted text-sm">
                SHFL
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs text-terminal-textMuted mb-1">Tickets</div>
              <div className="text-lg font-bold text-terminal-accent tabular-nums">
                {formatNumber(ticketCount)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-terminal-textMuted mb-1">Value</div>
              <div className="text-lg font-bold text-terminal-text tabular-nums">
                {formatUSD(stakingValueUSD)}
              </div>
            </div>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                savedAmount === shflAmount
                  ? "bg-terminal-positive/20 text-terminal-positive border border-terminal-positive/30"
                  : "bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 hover:bg-terminal-accent/20"
              }`}
            >
              <Save className="w-4 h-4" />
              {savedAmount === shflAmount ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Yield Projections Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* This Week */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">This Week</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5" />
                <span className="text-xl font-bold text-terminal-text tabular-nums">
                  {formatUSD(thisWeekYield.weeklyExpectedUSD)}
                </span>
              </div>
              <div className="text-sm font-medium text-yellow-400 tabular-nums">
                {((thisWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100).toFixed(3)}% weekly
              </div>
            </div>
            <div className="text-[10px] text-terminal-textMuted mt-2">
              Based on current NGR: {formatUSD(currentWeekNGR)}
            </div>
          </div>

          {/* Average Week */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-terminal-accent" />
              <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">Avg Week</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5" />
                <span className="text-xl font-bold text-terminal-text tabular-nums">
                  {formatUSD(avgWeekYield.weeklyExpectedUSD)}
                </span>
              </div>
              <div className="text-sm font-medium text-terminal-accent tabular-nums">
                {((avgWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100).toFixed(3)}% weekly
              </div>
            </div>
            <div className="text-[10px] text-terminal-textMuted mt-2">
              4-week avg NGR: {formatUSD(avgWeeklyNGR)}
            </div>
          </div>

          {/* Monthly */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-green-400" />
              <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">Monthly</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5" />
                <span className="text-xl font-bold text-terminal-text tabular-nums">
                  {formatUSD(monthlyYield)}
                </span>
              </div>
              <div className="text-sm font-medium text-green-400 tabular-nums">
                {((monthlyYield / stakingValueUSD) * 100).toFixed(2)}% monthly
              </div>
            </div>
            <div className="text-[10px] text-terminal-textMuted mt-2">
              ~4.33 weeks projected
            </div>
          </div>

          {/* Annual */}
          <div className="bg-gradient-to-br from-terminal-accent/10 to-purple-900/20 border border-terminal-accent/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-terminal-accent" />
              <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">Annual</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5" />
                <span className="text-xl font-bold text-terminal-text tabular-nums">
                  {formatUSD(annualYield)}
                </span>
              </div>
              <div className="text-lg font-bold text-terminal-accent tabular-nums">
                {formatPercent(annualAPY)} APY
              </div>
            </div>
            <div className="text-[10px] text-terminal-textMuted mt-2">
              52 weeks projected
            </div>
          </div>
        </div>

        {/* Historical Yields */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-terminal-textSecondary" />
            <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">
              Historical Expected Yields
            </span>
          </div>
          <div className="bg-terminal-dark border border-terminal-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-terminal-border bg-terminal-card/50">
                  <th className="px-4 py-2 text-left text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    Draw
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    NGR Added
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    Expected USDC
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    Weekly %
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
                    <td className="px-4 py-2">
                      <span className="text-sm font-medium text-terminal-text">
                        #{draw.drawNumber}
                      </span>
                      {index === 0 && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent uppercase">
                          Latest
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-terminal-textSecondary">
                      {new Date(draw.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-terminal-textMuted tabular-nums">
                      {formatUSD(draw.ngrUSD)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4" />
                        <span className="text-sm font-medium text-terminal-text tabular-nums">
                          {formatUSD(weeklyUSD)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-sm font-bold tabular-nums ${
                        weeklyPercent > (avgWeekYield.weeklyExpectedUSD / stakingValueUSD) * 100
                          ? "text-terminal-positive"
                          : "text-terminal-text"
                      }`}>
                        {weeklyPercent.toFixed(3)}%
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
  );
}

