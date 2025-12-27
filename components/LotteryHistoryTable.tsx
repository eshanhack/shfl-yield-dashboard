"use client";

import { useState } from "react";
import { HistoricalDraw, formatUSD } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { Calendar, DollarSign, Ticket, TrendingUp, ExternalLink, Trophy, Users, Sparkles } from "lucide-react";
import DrawDetailsModal from "./DrawDetailsModal";

interface LotteryHistoryTableProps {
  draws: HistoricalDraw[];
}

export default function LotteryHistoryTable({ draws }: LotteryHistoryTableProps) {
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  
  const avgYield =
    draws.length > 0
      ? draws.reduce((sum, d) => sum + d.yieldPerThousandSHFL, 0) / draws.length
      : 0;

  const jackpotWonCount = draws.filter(d => d.jackpotWon).length;

  return (
    <>
      <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow overflow-hidden">
        <div className="p-4 border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-terminal-text">
                Lottery History
              </h3>
              <p className="text-xs text-terminal-textMuted">
                Click on a draw to view full prize breakdown
              </p>
            </div>
            <div className="flex items-center gap-6">
              {jackpotWonCount > 0 && (
                <div className="text-right">
                  <div className="text-xs text-yellow-500 flex items-center gap-1 justify-end">
                    <Trophy className="w-3 h-3" />
                    Jackpots Won
                  </div>
                  <div className="text-sm font-medium text-yellow-400">
                    {jackpotWonCount}
                  </div>
                </div>
              )}
              <div className="text-right">
                <div className="text-xs text-terminal-textSecondary">
                  Avg. Yield/1K SHFL
                </div>
                <div className="text-sm font-medium text-terminal-accent">
                  {formatUSD(avgYield)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terminal-border">
                <th className="px-4 py-3 text-left text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="w-3 h-3" />
                    Draw #
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Date
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1.5 justify-end">
                    <DollarSign className="w-3 h-3" />
                    Total Pool
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Trophy className="w-3 h-3" />
                    Jackpot
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Users className="w-3 h-3" />
                    Tickets
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1.5 justify-end">
                    <TrendingUp className="w-3 h-3" />
                    Yield/1K SHFL
                  </div>
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {draws.map((draw, index) => {
                const isAboveAvg = draw.yieldPerThousandSHFL > avgYield;
                // Estimate jackpot as ~87% of pool (based on typical splits)
                const estimatedJackpot = draw.totalPoolUSD * 0.87;
                const isJackpotWon = draw.jackpotWon;
                
                return (
                  <tr
                    key={draw.drawNumber}
                    onClick={() => setSelectedDraw(draw.drawNumber)}
                    className={cn(
                      "border-b border-terminal-border/50 transition-all cursor-pointer",
                      isJackpotWon 
                        ? "bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-amber-500/20 hover:from-yellow-500/30 hover:via-yellow-400/20 hover:to-amber-500/30 border-l-2 border-l-yellow-500"
                        : "hover:bg-terminal-accent/10",
                      index === 0 && !isJackpotWon && "bg-terminal-accent/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isJackpotWon && (
                          <div className="relative">
                            <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
                            <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-ping" style={{ animationDuration: '2s' }} />
                          </div>
                        )}
                        <span className={cn(
                          "text-sm font-medium tabular-nums",
                          isJackpotWon ? "text-yellow-100" : "text-terminal-text"
                        )}>
                          #{draw.drawNumber}
                        </span>
                        {index === 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent uppercase tracking-wider">
                            Latest
                          </span>
                        )}
                        {isJackpotWon && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/30 text-yellow-300 uppercase tracking-wider font-bold animate-pulse">
                            🎉 JACKPOT WON
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-sm tabular-nums",
                      isJackpotWon ? "text-yellow-200" : "text-terminal-textSecondary"
                    )}>
                      {new Date(draw.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-sm font-medium tabular-nums",
                        isJackpotWon ? "text-yellow-100" : "text-terminal-text"
                      )}>
                        {formatUSD(draw.totalPoolUSD)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-sm font-medium tabular-nums",
                        isJackpotWon ? "text-yellow-300 font-bold" : "text-yellow-400"
                      )}>
                        {formatUSD(estimatedJackpot)}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right text-sm tabular-nums",
                      isJackpotWon ? "text-yellow-200" : "text-terminal-textSecondary"
                    )}>
                      {(draw.totalTickets / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums px-2 py-0.5 rounded",
                          isJackpotWon
                            ? "text-yellow-200 bg-yellow-500/20"
                            : isAboveAvg
                            ? "text-terminal-positive bg-terminal-positive/10"
                            : "text-terminal-text"
                        )}
                      >
                        {formatUSD(draw.yieldPerThousandSHFL)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink className={cn(
                        "w-4 h-4 transition-colors",
                        isJackpotWon ? "text-yellow-400 hover:text-yellow-300" : "text-terminal-textMuted hover:text-terminal-accent"
                      )} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-terminal-dark/50 border-t border-terminal-border">
          <div className="flex items-center justify-between text-xs text-terminal-textMuted">
            <span className="flex items-center gap-4">
              <span>Showing {draws.length} recent draws</span>
              {jackpotWonCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Trophy className="w-3 h-3" />
                  Gold rows = Jackpot Won
                </span>
              )}
            </span>
            <span>Click any row for details</span>
          </div>
        </div>
      </div>

      {/* Draw Details Modal */}
      <DrawDetailsModal
        drawNumber={selectedDraw}
        onClose={() => setSelectedDraw(null)}
      />
    </>
  );
}
