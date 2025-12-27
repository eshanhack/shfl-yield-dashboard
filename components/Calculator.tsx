"use client";

import { useState, useMemo } from "react";
import { X, Calculator as CalcIcon, DollarSign, Percent, History, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateSimpleYield,
  calculateHistoricalEarnings,
  formatUSD,
  formatPercent,
  formatNumber,
  HistoricalDraw,
  SHFL_PER_TICKET,
} from "@/lib/calculations";

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  shflPrice: number;
  weeklyNGR: number;
  totalTickets: number;
  historicalDraws: HistoricalDraw[];
}

export default function PersonalCalculator({
  isOpen,
  onClose,
  shflPrice,
  weeklyNGR,
  totalTickets,
  historicalDraws,
}: CalculatorProps) {
  const [shflStaked, setShflStaked] = useState<string>("1000");

  const stakedAmount = parseFloat(shflStaked) || 0;

  const yieldResult = useMemo(() => {
    return calculateSimpleYield(stakedAmount, shflPrice, weeklyNGR, totalTickets);
  }, [stakedAmount, shflPrice, weeklyNGR, totalTickets]);

  const historicalEarnings = useMemo(() => {
    return calculateHistoricalEarnings(stakedAmount, historicalDraws.slice(0, 4));
  }, [stakedAmount, historicalDraws]);

  const totalHistoricalEarnings = historicalEarnings.reduce(
    (sum, e) => sum + e.earned,
    0
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-terminal-black border-l border-terminal-accent/30 z-50 overflow-y-auto shadow-glow-lg">
        {/* Header */}
        <div className="sticky top-0 bg-terminal-black border-b border-terminal-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-terminal-accent/10 border border-terminal-accent/30">
              <CalcIcon className="w-5 h-5 text-terminal-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-terminal-text">
                Personal Yield Calculator
              </h2>
              <p className="text-xs text-terminal-textMuted">
                Estimate your staking returns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-terminal-border transition-colors"
          >
            <X className="w-5 h-5 text-terminal-textSecondary" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Section */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-terminal-textSecondary uppercase tracking-wider mb-2 block">
                SHFL Amount to Stake
              </span>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-terminal-accent" />
                <input
                  type="number"
                  value={shflStaked}
                  onChange={(e) => setShflStaked(e.target.value)}
                  className="input-terminal pl-11 text-xl font-bold"
                  placeholder="Enter SHFL amount"
                  min="0"
                />
              </div>
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              {[1000, 5000, 10000, 50000, 100000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setShflStaked(amount.toString())}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded border transition-all",
                    parseFloat(shflStaked) === amount
                      ? "bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                      : "border-terminal-border text-terminal-textSecondary hover:border-terminal-accent/50"
                  )}
                >
                  {formatNumber(amount)}
                </button>
              ))}
            </div>
          </div>

          {/* Staking Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-terminal-card border border-terminal-border rounded-lg p-3">
              <div className="text-xs text-terminal-textMuted mb-1">
                Tickets Generated
              </div>
              <div className="text-xl font-bold text-terminal-text tabular-nums">
                {formatNumber(yieldResult.ticketCount)}
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                ({SHFL_PER_TICKET} SHFL per ticket)
              </div>
            </div>
            <div className="bg-terminal-card border border-terminal-border rounded-lg p-3">
              <div className="text-xs text-terminal-textMuted mb-1">
                Staking Value
              </div>
              <div className="text-xl font-bold text-terminal-text tabular-nums">
                {formatUSD(yieldResult.stakingValueUSD)}
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                @ ${shflPrice.toFixed(4)}/SHFL
              </div>
            </div>
          </div>

          {/* Yield Results */}
          <div className="space-y-3">
            <h3 className="text-xs text-terminal-textSecondary uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Expected Returns
            </h3>

            <div className="bg-terminal-dark border border-terminal-accent/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-terminal-textMuted">
                    Weekly Expected
                  </div>
                  <div className="text-2xl font-bold text-terminal-accent tabular-nums">
                    {formatUSD(yieldResult.weeklyExpectedUSD)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-terminal-textMuted">
                    Monthly Est.
                  </div>
                  <div className="text-lg font-medium text-terminal-textSecondary tabular-nums">
                    {formatUSD(yieldResult.weeklyExpectedUSD * 4.33)}
                  </div>
                </div>
              </div>

              <div className="h-px bg-terminal-border" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-terminal-textMuted">
                    Annual Expected
                  </div>
                  <div className="text-2xl font-bold text-terminal-positive tabular-nums">
                    {formatUSD(yieldResult.annualExpectedUSD)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-terminal-textMuted">
                    Effective APY
                  </div>
                  <div className="text-2xl font-bold text-terminal-accent tabular-nums flex items-center gap-1">
                    <Percent className="w-5 h-5" />
                    {formatPercent(yieldResult.effectiveAPY)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Backfill */}
          <div className="space-y-3">
            <h3 className="text-xs text-terminal-textSecondary uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" />
              Historical Backfill (Last 4 Draws)
            </h3>

            <div className="bg-terminal-card border border-terminal-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="px-3 py-2 text-left text-[10px] text-terminal-textMuted uppercase">
                      Draw
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] text-terminal-textMuted uppercase">
                      Date
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] text-terminal-textMuted uppercase">
                      Pool
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] text-terminal-textMuted uppercase">
                      Your Earnings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historicalEarnings.map(({ draw, earned }) => (
                    <tr
                      key={draw.drawNumber}
                      className="border-b border-terminal-border/50"
                    >
                      <td className="px-3 py-2 text-sm text-terminal-text">
                        #{draw.drawNumber}
                      </td>
                      <td className="px-3 py-2 text-sm text-terminal-textSecondary">
                        {new Date(draw.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm text-terminal-textSecondary text-right tabular-nums">
                        {formatUSD(draw.totalPoolUSD)}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-terminal-positive text-right tabular-nums">
                        {formatUSD(earned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-terminal-dark/50">
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-xs text-terminal-textSecondary"
                    >
                      Total (4 weeks)
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-terminal-accent text-right tabular-nums">
                      {formatUSD(totalHistoricalEarnings)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-[10px] text-terminal-textMuted text-center">
              * Historical earnings based on proportional share of prize pool.
              Actual lottery results may vary based on prize tier distribution.
            </p>
          </div>

          {/* Current Market Stats */}
          <div className="bg-terminal-card border border-terminal-border rounded-lg p-4">
            <h4 className="text-xs text-terminal-textSecondary uppercase tracking-wider mb-3">
              Current Market Stats
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-terminal-textMuted">SHFL Price:</span>
                <span className="text-terminal-text ml-2 font-medium">
                  ${shflPrice.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-terminal-textMuted">Weekly NGR:</span>
                <span className="text-terminal-text ml-2 font-medium">
                  {formatUSD(weeklyNGR)}
                </span>
              </div>
              <div>
                <span className="text-terminal-textMuted">Prize Pool:</span>
                <span className="text-terminal-text ml-2 font-medium">
                  {formatUSD(weeklyNGR * 0.15)}
                </span>
              </div>
              <div>
                <span className="text-terminal-textMuted">Total Tickets:</span>
                <span className="text-terminal-text ml-2 font-medium">
                  {(totalTickets / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

