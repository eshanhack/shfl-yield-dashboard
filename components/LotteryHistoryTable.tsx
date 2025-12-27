"use client";

import { useState } from "react";
import { HistoricalDraw, formatUSD } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { Calendar, DollarSign, Ticket, TrendingUp, ExternalLink, Trophy, Users } from "lucide-react";
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
                
                return (
                  <tr
                    key={draw.drawNumber}
                    onClick={() => setSelectedDraw(draw.drawNumber)}
                    className={cn(
                      "border-b border-terminal-border/50 transition-colors cursor-pointer",
                      "hover:bg-terminal-accent/10",
                      index === 0 && "bg-terminal-accent/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-terminal-text tabular-nums">
                          #{draw.drawNumber}
                        </span>
                        {index === 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent uppercase tracking-wider">
                            Latest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-terminal-textSecondary tabular-nums">
                      {new Date(draw.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-terminal-text tabular-nums">
                        {formatUSD(draw.totalPoolUSD)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-yellow-400 tabular-nums">
                        {formatUSD(estimatedJackpot)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-terminal-textSecondary tabular-nums">
                      {(draw.totalTickets / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums px-2 py-0.5 rounded",
                          isAboveAvg
                            ? "text-terminal-positive bg-terminal-positive/10"
                            : "text-terminal-text"
                        )}
                      >
                        {formatUSD(draw.yieldPerThousandSHFL)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink className="w-4 h-4 text-terminal-textMuted hover:text-terminal-accent transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-terminal-dark/50 border-t border-terminal-border">
          <div className="flex items-center justify-between text-xs text-terminal-textMuted">
            <span>Showing {draws.length} recent draws • Click any row for details</span>
            <span>Updated weekly on Sundays</span>
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
