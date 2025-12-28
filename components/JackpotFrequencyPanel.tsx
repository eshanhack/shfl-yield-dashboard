"use client";

import { useMemo, useState } from "react";
import { Trophy, TrendingUp, Calendar, Target, Clock, Sparkles, ChevronRight } from "lucide-react";
import { HistoricalDraw, TOTAL_LOTTERY_COMBINATIONS, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";

interface JackpotFrequencyPanelProps {
  historicalDraws: HistoricalDraw[];
  currentTickets: number;
  currentJackpot: number;
}

// Jackpot probability per ticket
const JACKPOT_PROBABILITY = 1 / TOTAL_LOTTERY_COMBINATIONS;

interface JackpotPrediction {
  drawNumber: number;
  date: Date;
  cumulativeProbability: number;
  estimatedTickets: number;
  expectedJackpot: number;
}

export default function JackpotFrequencyPanel({
  historicalDraws,
  currentTickets,
  currentJackpot,
}: JackpotFrequencyPanelProps) {
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Find all jackpot wins from historical data
  const jackpotWins = useMemo(() => {
    return historicalDraws
      .filter(draw => draw.jackpotWon)
      .sort((a, b) => a.drawNumber - b.drawNumber);
  }, [historicalDraws]);

  // Calculate gaps between jackpot wins
  const jackpotGaps = useMemo(() => {
    const gaps: { from: number; to: number; gap: number }[] = [];
    for (let i = 1; i < jackpotWins.length; i++) {
      gaps.push({
        from: jackpotWins[i - 1].drawNumber,
        to: jackpotWins[i].drawNumber,
        gap: jackpotWins[i].drawNumber - jackpotWins[i - 1].drawNumber,
      });
    }
    return gaps;
  }, [jackpotWins]);

  // Calculate ticket growth trend
  const ticketGrowthTrend = useMemo(() => {
    const recentDraws = historicalDraws.slice(0, 12); // Last 12 weeks
    if (recentDraws.length < 2) return 0;
    
    const ticketCounts = recentDraws.map(d => d.totalTickets).filter(t => t > 0);
    if (ticketCounts.length < 2) return 0;
    
    // Calculate average weekly growth rate
    let totalGrowth = 0;
    for (let i = 0; i < ticketCounts.length - 1; i++) {
      const growth = (ticketCounts[i] - ticketCounts[i + 1]) / ticketCounts[i + 1];
      totalGrowth += growth;
    }
    return totalGrowth / (ticketCounts.length - 1);
  }, [historicalDraws]);

  // Calculate average jackpot amount when won
  const avgJackpotWon = useMemo(() => {
    if (jackpotWins.length === 0) return 0;
    const totalJackpots = jackpotWins.reduce((sum, d) => sum + (d.jackpotAmount || d.totalPoolUSD * 0.87), 0);
    return totalJackpots / jackpotWins.length;
  }, [jackpotWins]);

  // Current streak without jackpot
  const currentStreak = useMemo(() => {
    const latestDraw = historicalDraws[0];
    if (!latestDraw) return 0;
    
    const lastJackpotWin = jackpotWins[jackpotWins.length - 1];
    if (!lastJackpotWin) return latestDraw.drawNumber;
    
    return latestDraw.drawNumber - lastJackpotWin.drawNumber;
  }, [historicalDraws, jackpotWins]);

  // Generate future predictions
  const predictions = useMemo(() => {
    const latestDraw = historicalDraws[0];
    if (!latestDraw) return [];
    
    const preds: JackpotPrediction[] = [];
    let cumulativeProb = 0;
    let estimatedTickets = currentTickets;
    let estimatedJackpot = currentJackpot;
    
    // Average weekly jackpot growth based on NGR
    const avgWeeklyNGR = historicalDraws.slice(0, 8).reduce((sum, d) => sum + d.ngrUSD, 0) / 8;
    const weeklyJackpotGrowth = avgWeeklyNGR * 0.30; // ~30% of prize pool goes to jackpot
    
    for (let i = 1; i <= 52; i++) { // Next 52 weeks
      // Apply ticket growth
      estimatedTickets = Math.round(estimatedTickets * (1 + ticketGrowthTrend));
      
      // Calculate draw probability (at least one winner among all tickets)
      const drawProbability = 1 - Math.pow(1 - JACKPOT_PROBABILITY, estimatedTickets);
      
      // Cumulative probability of at least one jackpot hit by this draw
      cumulativeProb = 1 - (1 - cumulativeProb) * (1 - drawProbability);
      
      // Jackpot grows each week if not won
      estimatedJackpot += weeklyJackpotGrowth;
      
      const drawDate = new Date(latestDraw.date);
      drawDate.setDate(drawDate.getDate() + (i * 7));
      
      preds.push({
        drawNumber: latestDraw.drawNumber + i,
        date: drawDate,
        cumulativeProbability: cumulativeProb,
        estimatedTickets,
        expectedJackpot: estimatedJackpot,
      });
    }
    
    return preds;
  }, [historicalDraws, currentTickets, currentJackpot, ticketGrowthTrend]);

  // Find key probability milestones
  const probabilityMilestones = useMemo(() => {
    const milestones = [0.25, 0.50, 0.75, 0.90, 0.95];
    return milestones.map(target => {
      const pred = predictions.find(p => p.cumulativeProbability >= target);
      return { target, prediction: pred };
    });
  }, [predictions]);

  // Average gap between jackpots
  const avgGap = jackpotGaps.length > 0 
    ? jackpotGaps.reduce((sum, g) => sum + g.gap, 0) / jackpotGaps.length 
    : 0;

  const longestGap = jackpotGaps.length > 0 
    ? Math.max(...jackpotGaps.map(g => g.gap)) 
    : 0;

  // Per-draw probability with current tickets
  const currentDrawProbability = 1 - Math.pow(1 - JACKPOT_PROBABILITY, currentTickets);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg xl:rounded-xl card-glow">
      {/* Header */}
      <div className="p-3 sm:p-4 xl:p-6 border-b border-terminal-border">
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="p-1.5 xl:p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <Trophy className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm xl:text-base font-medium text-terminal-text">
              Jackpot Frequency
            </h3>
            <p className="text-[10px] sm:text-xs xl:text-sm text-terminal-textMuted">
              Historical patterns & probability predictions
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 xl:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 xl:gap-4 mb-4 sm:mb-6 xl:mb-8">
          {/* Total Jackpots */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-2.5 sm:p-3 xl:p-4">
            <div className="flex items-center gap-1.5 xl:gap-2 mb-1.5 xl:mb-2">
              <Trophy className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-yellow-400" />
              <span className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textSecondary uppercase tracking-wider">Jackpots Won</span>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-bold text-yellow-400 tabular-nums">
              {jackpotWins.length}
            </div>
            <div className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textMuted">
              in {historicalDraws.length} draws
            </div>
          </div>

          {/* Current Streak */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-2.5 sm:p-3 xl:p-4">
            <div className="flex items-center gap-1.5 xl:gap-2 mb-1.5 xl:mb-2">
              <Clock className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-orange-400" />
              <span className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textSecondary uppercase tracking-wider">Current Streak</span>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-bold text-orange-400 tabular-nums">
              {currentStreak}
            </div>
            <div className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textMuted">
              draws since last
            </div>
          </div>

          {/* Average Gap */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-2.5 sm:p-3 xl:p-4">
            <div className="flex items-center gap-1.5 xl:gap-2 mb-1.5 xl:mb-2">
              <Calendar className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-terminal-accent" />
              <span className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textSecondary uppercase tracking-wider">Avg Gap</span>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-bold text-terminal-accent tabular-nums">
              {avgGap.toFixed(1)}
            </div>
            <div className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textMuted">
              draws between wins
            </div>
          </div>

          {/* Draw Probability */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-2.5 sm:p-3 xl:p-4">
            <div className="flex items-center gap-1.5 xl:gap-2 mb-1.5 xl:mb-2">
              <Target className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-green-400" />
              <span className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textSecondary uppercase tracking-wider">This Draw</span>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-bold text-green-400 tabular-nums">
              {(currentDrawProbability * 100).toFixed(2)}%
            </div>
            <div className="text-[9px] sm:text-[10px] xl:text-xs text-terminal-textMuted">
              chance of jackpot
            </div>
          </div>
        </div>

        {/* Jackpot History Timeline */}
        <div className="mb-4 sm:mb-6 xl:mb-8">
          <div className="flex items-center justify-between mb-2 sm:mb-3 xl:mb-4">
            <div className="flex items-center gap-1.5 xl:gap-2">
              <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-yellow-400" />
              <span className="text-[10px] sm:text-xs xl:text-sm text-terminal-textSecondary uppercase tracking-wider">
                Jackpot Timeline
              </span>
            </div>
            {jackpotWins.length > 3 && (
              <button
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="text-[10px] sm:text-xs xl:text-sm text-terminal-accent hover:text-terminal-text transition-colors flex items-center gap-1"
              >
                {showAllHistory ? "Show Less" : `Show All (${jackpotWins.length})`}
                <ChevronRight className={cn("w-3 h-3 xl:w-4 xl:h-4 transition-transform", showAllHistory && "rotate-90")} />
              </button>
            )}
          </div>
          
          <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-3 sm:p-4 xl:p-5 overflow-x-auto xl:overflow-visible">
            {/* Visual timeline */}
            <div className="relative min-w-[400px]">
              {/* Draw markers - all draws */}
              <div className="flex items-center gap-0.5 mb-3">
                {historicalDraws.slice().reverse().slice(showAllHistory ? 0 : -30).map((draw) => (
                  <div
                    key={draw.drawNumber}
                    className={cn(
                      "flex-1 h-6 rounded-sm transition-all cursor-default",
                      draw.jackpotWon
                        ? "bg-gradient-to-t from-yellow-600 to-yellow-400 min-w-[8px]"
                        : "bg-terminal-border/50 min-w-[3px] max-w-[6px]"
                    )}
                    title={`Draw #${draw.drawNumber}${draw.jackpotWon ? " - 🎰 JACKPOT WON!" : ""}`}
                  />
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 text-[9px] sm:text-[10px] text-terminal-textMuted">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-yellow-600 to-yellow-400" />
                  <span>Jackpot Won</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-terminal-border/50" />
                  <span>No Jackpot</span>
                </div>
                <span className="text-terminal-textMuted/50">
                  {showAllHistory ? `${historicalDraws.length} draws shown` : "Last 30 draws"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Jackpot wins list */}
          {jackpotWins.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {(showAllHistory ? jackpotWins : jackpotWins.slice(-3)).map((win, idx) => (
                <div 
                  key={win.drawNumber}
                  className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs sm:text-sm font-medium text-yellow-100">
                      Draw #{win.drawNumber}
                    </span>
                    <span className="text-[10px] sm:text-xs text-yellow-200/70">
                      {new Date(win.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-yellow-400">
                    <CurrencyAmount amount={win.jackpotAmount || win.totalPoolUSD * 0.87} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Probability Milestones */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-terminal-accent" />
            <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">
              Jackpot Probability Forecast
            </span>
          </div>
          
          <div className="bg-terminal-dark border border-terminal-border rounded-lg overflow-hidden">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-terminal-border bg-terminal-card/50">
                  <th className="px-3 py-2 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-3 py-2 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    By Draw
                  </th>
                  <th className="px-3 py-2 text-left text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                    Est. Jackpot
                  </th>
                </tr>
              </thead>
              <tbody>
                {probabilityMilestones.map(({ target, prediction }) => (
                  <tr key={target} className="border-b border-terminal-border/50">
                    <td className="px-3 py-2">
                      <span className={cn(
                        "font-bold tabular-nums",
                        target >= 0.9 ? "text-green-400" : 
                        target >= 0.5 ? "text-terminal-accent" : 
                        "text-terminal-text"
                      )}>
                        {(target * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-terminal-text font-medium tabular-nums">
                      {prediction ? `#${prediction.drawNumber}` : "52+"}
                    </td>
                    <td className="px-3 py-2 text-terminal-textSecondary hidden sm:table-cell">
                      {prediction 
                        ? prediction.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                        : "1yr+"
                      }
                    </td>
                    <td className="px-3 py-2 text-right text-yellow-400 font-medium">
                      {prediction ? <CurrencyAmount amount={prediction.expectedJackpot} /> : "Growing..."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="mt-2 text-[9px] sm:text-[10px] text-terminal-textMuted italic">
            * Based on current {formatNumber(currentTickets)} tickets with {ticketGrowthTrend >= 0 ? "+" : ""}{(ticketGrowthTrend * 100).toFixed(1)}% weekly growth. 
            Jackpot odds: 1 in {formatNumber(TOTAL_LOTTERY_COMBINATIONS)} per ticket.
          </p>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-3">
            <div className="text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider mb-1">
              Avg Jackpot Won
            </div>
            <div className="text-sm sm:text-base font-bold text-yellow-400">
              <CurrencyAmount amount={avgJackpotWon} />
            </div>
          </div>
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-3">
            <div className="text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider mb-1">
              Longest Drought
            </div>
            <div className="text-sm sm:text-base font-bold text-orange-400">
              {longestGap} draws
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

