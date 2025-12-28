"use client";

import { useState, useEffect, useMemo } from "react";
import { HistoricalDraw, formatUSD, formatNumber, calculateYieldPer1KSHFL } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { Calendar, DollarSign, Ticket, TrendingUp, ExternalLink, Trophy, Users, Sparkles, ChevronLeft, ChevronRight, Clock, Inbox } from "lucide-react";
import DrawDetailsModal from "./DrawDetailsModal";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";
import EmptyState from "./EmptyState";

interface UpcomingDraw {
  drawNumber: number;
  date: string; // ISO date string
  totalPoolUSD: number;
  jackpotAmount: number;
  totalTickets: number;
  prizeSplit: string;
  ngrUSD: number; // NGR for yield calculation
}

interface LotteryHistoryTableProps {
  draws: HistoricalDraw[];
  upcomingDraw?: UpcomingDraw;
}

const ITEMS_PER_PAGE = 10;

export default function LotteryHistoryTable({ draws, upcomingDraw }: LotteryHistoryTableProps) {
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

  // Calculate estimated yield for upcoming draw
  const upcomingYield = useMemo(() => {
    if (!upcomingDraw) return 0;
    const yieldPer1K = calculateYieldPer1KSHFL(
      upcomingDraw.ngrUSD,
      upcomingDraw.totalTickets,
      upcomingDraw.prizeSplit
    );
    return yieldPer1K * yieldMultiplier;
  }, [upcomingDraw, yieldMultiplier]);

  return (
    <>
      <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-terminal-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-medium text-terminal-text">
                  Lottery History
                </h3>
                <InfoTooltip content={TOOLTIPS.lottery} title="How the Lottery Works" />
              </div>
              <p className="text-[10px] sm:text-xs text-terminal-textMuted">
                {draws.length} draws • Tap to view details
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              {jackpotWonCount > 0 && (
                <div className="text-left sm:text-right">
                  <div className="text-[10px] sm:text-xs text-yellow-500 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Jackpots Won
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-yellow-400">
                    {jackpotWonCount}
                  </div>
                </div>
              )}
              <div className="text-left sm:text-right">
                <div className="text-[10px] sm:text-xs text-terminal-textSecondary">
                  Avg/{stakedLabel}
                </div>
                <div className="text-xs sm:text-sm font-medium text-terminal-accent">
                  <CurrencyAmount amount={avgYield} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table with horizontal scroll on mobile */}
        <div className="overflow-x-auto touch-scroll max-h-[500px] sm:max-h-[600px] overflow-y-auto">
          <table className="w-full min-w-[600px] sticky-header">
            <thead className="bg-terminal-card">
              <tr className="border-b border-terminal-border">
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1">
                    <Ticket className="w-3 h-3" />
                    <span className="hidden sm:inline">Draw</span> #
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1 justify-end">
                    <DollarSign className="w-3 h-3" />
                    Pool
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium hidden sm:table-cell">
                  <div className="flex items-center gap-1 justify-end">
                    <Trophy className="w-3 h-3" />
                    Jackpot
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium hidden md:table-cell">
                  <div className="flex items-center gap-1 justify-end">
                    <Users className="w-3 h-3" />
                    Tickets
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                  <div className="flex items-center gap-1 justify-end">
                    <TrendingUp className="w-3 h-3" />
                    Yield
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 w-8 sm:w-10"></th>
              </tr>
            </thead>
            <tbody>
              {/* Empty State */}
              {draws.length === 0 && !upcomingDraw && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Inbox className="w-8 h-8 text-terminal-accent" />}
                      title="No lottery data available"
                      description="Lottery history will appear here once draws are completed."
                    />
                  </td>
                </tr>
              )}
              
              {/* Upcoming Draw Row - Only show on first page */}
              {currentPage === 0 && upcomingDraw && (
                <tr
                  className="border-b border-terminal-border/50 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 hover:from-cyan-500/20 hover:via-blue-500/20 hover:to-cyan-500/20 border-l-2 border-l-cyan-500"
                >
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="relative">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium tabular-nums text-cyan-100">
                        #{upcomingDraw.drawNumber}
                      </span>
                      <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 uppercase tracking-wider font-bold">
                        ⏳ NEXT
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm tabular-nums text-cyan-200">
                    {new Date(upcomingDraw.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                    <span className="text-xs sm:text-sm font-medium tabular-nums text-cyan-100">
                      <CurrencyAmount amount={upcomingDraw.totalPoolUSD} />
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right hidden sm:table-cell">
                    <span className="text-xs sm:text-sm font-medium tabular-nums text-yellow-300">
                      <CurrencyAmount amount={upcomingDraw.jackpotAmount} />
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm tabular-nums text-cyan-200 hidden md:table-cell">
                    {upcomingDraw.totalTickets >= 1000000 
                      ? `${(upcomingDraw.totalTickets / 1000000).toFixed(1)}M`
                      : upcomingDraw.totalTickets >= 1000
                      ? `${(upcomingDraw.totalTickets / 1000).toFixed(0)}K`
                      : upcomingDraw.totalTickets}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                    <span className="text-xs sm:text-sm font-medium tabular-nums px-1.5 sm:px-2 py-0.5 rounded text-cyan-300 bg-cyan-500/20">
                      <CurrencyAmount amount={upcomingYield} />
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    {/* No external link for upcoming draw */}
                  </td>
                </tr>
              )}
              
              {/* Completed Draws */}
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
                // Check if this draw had jackpot replenishment (previous draw had jackpot won)
                const hadJackpotReplenishment = draw.jackpotReplenishment && draw.jackpotReplenishment > 0;
                
                return (
                  <tr
                    key={draw.drawNumber}
                    onClick={() => setSelectedDraw(draw.drawNumber)}
                    className={cn(
                      "border-b border-terminal-border/50 transition-all cursor-pointer active:bg-terminal-accent/20",
                      isJackpotWon 
                        ? "bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-amber-500/20 hover:from-yellow-500/30 hover:via-yellow-400/20 hover:to-amber-500/30 border-l-2 border-l-yellow-500"
                        : hadJackpotReplenishment
                        ? "bg-orange-500/5 hover:bg-orange-500/10 border-l-2 border-l-orange-400"
                        : "hover:bg-terminal-accent/10",
                      isLatest && !isJackpotWon && !hadJackpotReplenishment && "bg-terminal-accent/5"
                    )}
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {isJackpotWon && (
                          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 flex-shrink-0" />
                        )}
                        <span className={cn(
                          "text-xs sm:text-sm font-medium tabular-nums",
                          isJackpotWon ? "text-yellow-100" : "text-terminal-text"
                        )}>
                          #{draw.drawNumber}
                        </span>
                        {isLatest && (
                          <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent uppercase">
                            Latest
                          </span>
                        )}
                        {hadJackpotReplenishment && (
                          <span 
                            className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 uppercase" 
                            title={`Jackpot replenished: $${draw.jackpotReplenishment?.toLocaleString() || 0} (yield adjusted)`}
                          >
                            🎰 JP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm tabular-nums",
                      isJackpotWon ? "text-yellow-200" : "text-terminal-textSecondary"
                    )}>
                      {new Date(draw.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                      <span className={cn(
                        "text-xs sm:text-sm font-medium tabular-nums",
                        isJackpotWon ? "text-yellow-100" : "text-terminal-text"
                      )}>
                        <CurrencyAmount amount={draw.totalPoolUSD} />
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right hidden sm:table-cell">
                      <span className={cn(
                        "text-xs sm:text-sm font-medium tabular-nums",
                        isJackpotWon ? "text-yellow-300 font-bold" : "text-yellow-400"
                      )}>
                        <CurrencyAmount amount={estimatedJackpot} />
                      </span>
                    </td>
                    <td className={cn(
                      "px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm tabular-nums hidden md:table-cell",
                      isJackpotWon ? "text-yellow-200" : "text-terminal-textSecondary"
                    )}>
                      {draw.totalTickets >= 1000000 
                        ? `${(draw.totalTickets / 1000000).toFixed(1)}M`
                        : draw.totalTickets >= 1000
                        ? `${(draw.totalTickets / 1000).toFixed(0)}K`
                        : draw.totalTickets}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium tabular-nums px-1.5 sm:px-2 py-0.5 rounded",
                          isJackpotWon
                            ? "text-yellow-200 bg-yellow-500/20"
                            : isAboveAvg
                            ? "text-terminal-positive bg-terminal-positive/10"
                            : "text-terminal-text"
                        )}
                      >
                        <CurrencyAmount amount={userYield} />
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <ExternalLink className={cn(
                        "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors",
                        isJackpotWon ? "text-yellow-400 hover:text-yellow-300" : "text-terminal-textMuted hover:text-terminal-accent"
                      )} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination - Simplified on mobile */}
        <div className="p-2 sm:p-3 bg-terminal-dark/50 border-t border-terminal-border">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-terminal-textMuted">
              {startIndex + 1}-{Math.min(endIndex, draws.length)} of {draws.length}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className={cn(
                    "p-1.5 sm:p-2 rounded transition-colors touch-target",
                    currentPage === 0 
                      ? "text-terminal-textMuted/50 cursor-not-allowed" 
                      : "text-terminal-textMuted hover:text-terminal-accent hover:bg-terminal-accent/10 active:bg-terminal-accent/20"
                  )}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                
                {/* Page numbers - fewer on mobile */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                    // On mobile, only show current, first, and last
                    const isMobileVisible = page === 0 || page === totalPages - 1 || page === currentPage;
                    const showEllipsis = page === 1 && currentPage > 2 && totalPages > 3;
                    
                    if (!isMobileVisible && window.innerWidth < 640) return null;
                    
                    // Desktop logic
                    const showPage = 
                      page === 0 || 
                      page === totalPages - 1 || 
                      Math.abs(page - currentPage) <= 1;
                    
                    const showDesktopEllipsis = 
                      (page === 1 && currentPage > 2) ||
                      (page === totalPages - 2 && currentPage < totalPages - 3);
                    
                    if (!showPage && !showDesktopEllipsis) return null;
                    
                    if (showDesktopEllipsis && !showPage) {
                      return (
                        <span key={page} className="px-1 text-terminal-textMuted text-xs">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={cn(
                          "min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-1.5 sm:px-2 rounded text-xs font-medium transition-colors touch-target",
                          currentPage === page
                            ? "bg-terminal-accent text-black"
                            : "text-terminal-textMuted hover:text-terminal-accent hover:bg-terminal-accent/10 active:bg-terminal-accent/20"
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
                    "p-1.5 sm:p-2 rounded transition-colors touch-target",
                    currentPage === totalPages - 1 
                      ? "text-terminal-textMuted/50 cursor-not-allowed" 
                      : "text-terminal-textMuted hover:text-terminal-accent hover:bg-terminal-accent/10 active:bg-terminal-accent/20"
                  )}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
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
