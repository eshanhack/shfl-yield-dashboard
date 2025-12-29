"use client";

import { useMemo } from "react";
import { Trophy, TrendingUp, Calendar, Target, Clock, Sparkles } from "lucide-react";
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
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-terminal-text">
              Jackpot Frequency
            </h3>
            <p className="text-[10px] sm:text-xs text-terminal-textMuted">
              Historical patterns & probability predictions
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Stats Grid - 4 columns on desktop */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
          {/* Total Jackpots */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">Jackpots Won</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-yellow-400 tabular-nums">
              {jackpotWins.length}
            </div>
            <div className="text-[9px] sm:text-[10px] text-terminal-textMuted">
              in {historicalDraws.length} draws
            </div>
          </div>

          {/* Current Streak */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">Current Streak</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-orange-400 tabular-nums">
              {currentStreak}
            </div>
            <div className="text-[9px] sm:text-[10px] text-terminal-textMuted">
              draws since last
            </div>
          </div>

          {/* Average Gap */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-terminal-accent" />
              <span className="text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">Avg Gap</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-terminal-accent tabular-nums">
              {avgGap.toFixed(1)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-terminal-textMuted">
              draws between wins
            </div>
          </div>

          {/* Draw Probability */}
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[9px] sm:text-[10px] text-terminal-textSecondary uppercase tracking-wider">This Draw</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-green-400 tabular-nums">
              {(currentDrawProbability * 100).toFixed(2)}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-terminal-textMuted">
              chance of jackpot
            </div>
          </div>
        </div>

        {/* Jackpot History Timeline - compact */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] text-terminal-textSecondary uppercase tracking-wider">
                Jackpot Timeline
              </span>
            </div>
          </div>
          
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3 overflow-x-auto">
            {/* Visual timeline - always show last 30 for consistency */}
            <div className="relative min-w-[300px]">
              {/* Draw markers */}
              <div className="flex items-center gap-0.5 mb-2">
                {historicalDraws.slice().reverse().slice(-30).map((draw) => (
                  <div
                    key={draw.drawNumber}
                    className={cn(
                      "flex-1 h-5 rounded-sm transition-all cursor-default",
                      draw.jackpotWon
                        ? "bg-gradient-to-t from-yellow-600 to-yellow-400 min-w-[6px]"
                        : "bg-terminal-border/50 min-w-[2px] max-w-[5px]"
                    )}
                    title={`Draw #${draw.drawNumber}${draw.jackpotWon ? " - 🎰 JACKPOT WON!" : ""}`}
                  />
                ))}
              </div>
              
              {/* Legend - inline */}
              <div className="flex items-center gap-3 text-[9px] text-terminal-textMuted">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-yellow-600 to-yellow-400" />
                  <span>Jackpot Won</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-terminal-border/50" />
                  <span>No Jackpot</span>
                </div>
                <span className="text-terminal-textMuted/50 ml-auto">Last 30 draws</span>
              </div>
            </div>
          </div>
          
          {/* Jackpot wins list - show only last 2 for density */}
          {jackpotWins.length > 0 && (
            <div className="mt-2 space-y-1">
              {jackpotWins.slice(-2).map((win) => (
                <div 
                  key={win.drawNumber}
                  className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-100">
                      Draw #{win.drawNumber}
                    </span>
                    <span className="text-[10px] text-yellow-200/70">
                      {new Date(win.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-yellow-400 tabular-nums">
                    <CurrencyAmount amount={win.jackpotAmount || win.totalPoolUSD * 0.87} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Probability Milestones - limited to 5 rows for data density */}
        <div className="mb-4 flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-terminal-accent" />
            <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wider">
              Jackpot Probability Forecast
            </span>
          </div>
          
          <div className="bg-terminal-dark border border-terminal-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-terminal-border bg-terminal-card/50">
                  <th className="px-2 xl:px-3 py-2 text-left text-[9px] text-terminal-textSecondary uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-2 xl:px-3 py-2 text-left text-[9px] text-terminal-textSecondary uppercase tracking-wider">
                    By Draw
                  </th>
                  <th className="px-2 xl:px-3 py-2 text-left text-[9px] text-terminal-textSecondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-2 xl:px-3 py-2 text-right text-[9px] text-terminal-textSecondary uppercase tracking-wider">
                    Est. Jackpot
                  </th>
                </tr>
              </thead>
              <tbody>
                {probabilityMilestones.map(({ target, prediction }) => (
                  <tr key={target} className="border-b border-terminal-border/50 last:border-b-0">
                    <td className="px-2 xl:px-3 py-1.5">
                      <span className={cn(
                        "font-bold tabular-nums text-xs",
                        target >= 0.9 ? "text-green-400" : 
                        target >= 0.5 ? "text-terminal-accent" : 
                        "text-terminal-text"
                      )}>
                        {(target * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 xl:px-3 py-1.5 text-terminal-text font-medium tabular-nums text-xs">
                      {prediction ? `#${prediction.drawNumber}` : "52+"}
                    </td>
                    <td className="px-2 xl:px-3 py-1.5 text-terminal-textSecondary text-xs">
                      {prediction 
                        ? prediction.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                        : "1yr+"
                      }
                    </td>
                    <td className="px-2 xl:px-3 py-1.5 text-right text-yellow-400 font-medium text-xs">
                      {prediction ? <CurrencyAmount amount={prediction.expectedJackpot} /> : "Growing..."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="mt-2 text-[9px] text-terminal-textMuted italic leading-relaxed">
            * Based on current {formatNumber(currentTickets)} tickets with {ticketGrowthTrend >= 0 ? "+" : ""}{(ticketGrowthTrend * 100).toFixed(1)}% weekly growth. 
            Jackpot odds: 1 in {formatNumber(TOTAL_LOTTERY_COMBINATIONS)} per ticket.
          </p>
        </div>

        {/* Bottom Stats - Avg Jackpot Won prominent */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
          <div className="bg-terminal-dark border border-yellow-500/30 rounded-lg p-2.5">
            <div className="text-[9px] text-terminal-textSecondary uppercase tracking-wider mb-1">
              Avg Jackpot Won
            </div>
            <div className="text-base font-bold text-yellow-400 tabular-nums">
              <CurrencyAmount amount={avgJackpotWon} />
            </div>
          </div>
          <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5">
            <div className="text-[9px] text-terminal-textSecondary uppercase tracking-wider mb-1">
              Longest Drought
            </div>
            <div className="text-base font-bold text-orange-400 tabular-nums">
              {longestGap} draws
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

