"use client";

import { useState, useEffect, useMemo } from "react";
import { HistoricalDraw, formatUSD, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { Calendar, DollarSign, Ticket, TrendingUp, ExternalLink, Trophy, Users, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import DrawDetailsModal from "./DrawDetailsModal";

interface LotteryHistoryTableProps {
  draws: HistoricalDraw[];
}

const ITEMS_PER_PAGE = 10;

export default function LotteryHistoryTable({ draws }: LotteryHistoryTableProps) {
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [stakedAmount, setStakedAmount] = useState<number>(1000); // Default 1K SHFL
  
  // Load saved staked amount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      const amount = parseFloat(saved);
      if (amount > 0) {
        setStakedAmount(amount);
      }
    }
    
    // Listen for custom event when staked amount changes
    const handleStakedChange = (e: CustomEvent<number>) => {
      if (e.detail > 0) {
        setStakedAmount(e.detail);
      }
    };
    
    // Listen for storage changes (cross-tab)
    const handleStorageChange = () => {
      const updated = localStorage.getItem("shfl-staked-amount");
      if (updated) {
        const amount = parseFloat(updated);
        if (amount > 0) {
          setStakedAmount(amount);
        }
      }
    };
    
    window.addEventListener("shfl-staked-changed" as any, handleStakedChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("shfl-staked-changed" as any, handleStakedChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
  
  const totalPages = Math.ceil(draws.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentDraws = draws.slice(startIndex, endIndex);
  
  // Calculate yield based on user's staked amount
  const yieldMultiplier = stakedAmount / 1000; // Convert from per 1K to user's amount
  
  // Calculate average yield for user's stake
  const avgYield = useMemo(() => {
    if (draws.length === 0) return 0;
    const avgPer1K = draws.reduce((sum, d) => sum + d.yieldPerThousandSHFL, 0) / draws.length;
    return avgPer1K * yieldMultiplier;
  }, [draws, yieldMultiplier]);

  const jackpotWonCount = draws.filter(d => d.jackpotWon).length;
  
  // Format staked amount for display
  const stakedLabel = stakedAmount >= 1000000 
    ? `${(stakedAmount / 1000000).toFixed(1)}M` 
    : stakedAmount >= 1000 
    ? `${(stakedAmount / 1000).toFixed(0)}K` 
    : formatNumber(stakedAmount);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

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
                {draws.length} total draws • Click on a draw to view full prize breakdown
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
                  Avg. Yield/{stakedLabel} SHFL
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
                    Yield/{stakedLabel} SHFL
                  </div>
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {currentDraws.map((draw, index) => {
                const userYield = draw.yieldPerThousandSHFL * yieldMultiplier;
                const avgPer1K = draws.length > 0 
                  ? draws.reduce((sum, d) => sum + d.yieldPerThousandSHFL, 0) / draws.length 
                  : 0;
                const isAboveAvg = draw.yieldPerThousandSHFL > avgPer1K;
                // Estimate jackpot as ~87% of pool (based on typical splits)
                const estimatedJackpot = draw.totalPoolUSD * 0.87;
                const isJackpotWon = draw.jackpotWon;
                const isLatest = currentPage === 0 && index === 0;
                
                return (
                  <tr
                    key={draw.drawNumber}
                    onClick={() => setSelectedDraw(draw.drawNumber)}
                    className={cn(
                      "border-b border-terminal-border/50 transition-all cursor-pointer",
                      isJackpotWon 
                        ? "bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-amber-500/20 hover:from-yellow-500/30 hover:via-yellow-400/20 hover:to-amber-500/30 border-l-2 border-l-yellow-500"
                        : "hover:bg-terminal-accent/10",
                      isLatest && !isJackpotWon && "bg-terminal-accent/5"
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
                        {isLatest && (
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
                      {draw.totalTickets >= 1000000 
                        ? `${(draw.totalTickets / 1000000).toFixed(2)}M`
                        : draw.totalTickets >= 1000
                        ? `${(draw.totalTickets / 1000).toFixed(0)}K`
                        : draw.totalTickets}
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
                        {formatUSD(userYield)}
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

        {/* Pagination */}
        <div className="p-3 bg-terminal-dark/50 border-t border-terminal-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-terminal-textMuted">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, draws.length)} of {draws.length} draws
              </span>
              {jackpotWonCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Trophy className="w-3 h-3" />
                  Gold rows = Jackpot Won
                </span>
              )}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    currentPage === 0 
                      ? "text-terminal-textMuted/50 cursor-not-allowed" 
                      : "text-terminal-textMuted hover:text-terminal-accent hover:bg-terminal-accent/10"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                    // Show first, last, current, and adjacent pages
                    const showPage = 
                      page === 0 || 
                      page === totalPages - 1 || 
                      Math.abs(page - currentPage) <= 1;
                    
                    const showEllipsis = 
                      (page === 1 && currentPage > 2) ||
                      (page === totalPages - 2 && currentPage < totalPages - 3);
                    
                    if (!showPage && !showEllipsis) return null;
                    
                    if (showEllipsis && !showPage) {
                      return (
                        <span key={page} className="px-1 text-terminal-textMuted">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={cn(
                          "min-w-[28px] h-7 px-2 rounded text-xs font-medium transition-colors",
                          currentPage === page
                            ? "bg-terminal-accent text-black"
                            : "text-terminal-textMuted hover:text-terminal-accent hover:bg-terminal-accent/10"
                        )}
                      >
                        {page + 1}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    currentPage === totalPages - 1 
                      ? "text-terminal-textMuted/50 cursor-not-allowed" 
                      : "text-terminal-textMuted hover:text-terminal-accent hover:bg-terminal-accent/10"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
