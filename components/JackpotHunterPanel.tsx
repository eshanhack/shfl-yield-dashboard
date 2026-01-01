"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Crosshair, Trophy, Target, Sparkles, Dice1, TrendingUp, Zap, Settings2 } from "lucide-react";
import { HistoricalDraw, formatNumber, TOTAL_LOTTERY_COMBINATIONS } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import CurrencyAmount from "./CurrencyAmount";
import InfoTooltip from "./InfoTooltip";
import ScreenshotButton from "./ScreenshotButton";

interface JackpotHunterPanelProps {
  currentJackpot: number;
  totalTickets: number;
  historicalDraws: HistoricalDraw[];
}

const JACKPOT_PROBABILITY = 1 / TOTAL_LOTTERY_COMBINATIONS;

export default function JackpotHunterPanel({
  currentJackpot,
  totalTickets,
  historicalDraws,
}: JackpotHunterPanelProps) {
  const [stakedAmount, setStakedAmount] = useState<number>(1000);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved staked amount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      const amount = parseFloat(saved);
      if (amount > 0) setStakedAmount(amount);
    }

    const handleStakedChange = (e: CustomEvent<number>) => {
      if (e.detail > 0) setStakedAmount(e.detail);
    };

    window.addEventListener("shfl-staked-changed" as any, handleStakedChange);
    return () => window.removeEventListener("shfl-staked-changed" as any, handleStakedChange);
  }, []);

  const userTickets = stakedAmount / 50;

  // Format staked amount for display
  const stakedLabel = stakedAmount >= 1000000 
    ? `${(stakedAmount / 1000000).toFixed(1)}M` 
    : stakedAmount >= 1000 
    ? `${formatNumber(stakedAmount / 1000)}K` 
    : formatNumber(stakedAmount);

  // Calculate jackpot hunting stats
  const jackpotStats = useMemo(() => {
    // Per-ticket probability
    const ticketProbability = JACKPOT_PROBABILITY;
    
    // User's total probability this draw (at least one win)
    const userProbability = 1 - Math.pow(1 - ticketProbability, userTickets);
    
    // Network probability (at least one winner among all tickets)
    const networkProbability = 1 - Math.pow(1 - ticketProbability, totalTickets);
    
    // Expected draws until user wins (geometric distribution)
    const expectedDrawsToWin = userProbability > 0 ? 1 / userProbability : Infinity;
    
    // User's expected jackpot share IF jackpot is won (proportional to tickets)
    const userShareIfWon = totalTickets > 0 ? userTickets / totalTickets : 0;
    const expectedShareValue = userShareIfWon * currentJackpot;
    
    // Jackpot EV per ticket (probability * jackpot value)
    const jackpotEVPerTicket = ticketProbability * currentJackpot;
    const userJackpotEV = jackpotEVPerTicket * userTickets;
    
    // Historical jackpot frequency
    const jackpotWins = historicalDraws.filter(d => d.jackpotWon);
    const jackpotFrequency = historicalDraws.length > 0 
      ? jackpotWins.length / historicalDraws.length 
      : 0;
    
    // Current streak without jackpot
    let currentStreak = 0;
    for (const draw of historicalDraws) {
      if (draw.jackpotWon) break;
      currentStreak++;
    }
    
    // Average jackpot size when won
    const avgJackpotWon = jackpotWins.length > 0 
      ? jackpotWins.reduce((sum, d) => sum + (d.jackpotAmount || 0), 0) / jackpotWins.length 
      : currentJackpot;
    
    // "Luck score" - how overdue is a jackpot? (current streak vs expected)
    const expectedDrawsBetweenJackpots = networkProbability > 0 ? 1 / networkProbability : 10;
    const luckScore = expectedDrawsBetweenJackpots > 0 
      ? (currentStreak / expectedDrawsBetweenJackpots) * 100 
      : 0;

    return {
      ticketProbability,
      userProbability,
      networkProbability,
      expectedDrawsToWin,
      userShareIfWon,
      expectedShareValue,
      jackpotEVPerTicket,
      userJackpotEV,
      jackpotFrequency,
      currentStreak,
      avgJackpotWon,
      luckScore,
    };
  }, [userTickets, totalTickets, currentJackpot, historicalDraws]);

  // Format probability as odds
  const formatOdds = (prob: number) => {
    if (prob <= 0) return "∞:1";
    if (prob >= 1) return "1:1";
    const odds = Math.round(1 / prob);
    if (odds >= 1000000) return `${(odds / 1000000).toFixed(1)}M:1`;
    if (odds >= 1000) return `${(odds / 1000).toFixed(0)}K:1`;
    return `${odds}:1`;
  };

  const formatDraws = (draws: number) => {
    if (draws === Infinity) return "∞";
    if (draws >= 52 * 10) return `${Math.round(draws / 52)}+ years`;
    if (draws >= 52) {
      const years = Math.floor(draws / 52);
      const weeks = Math.round(draws % 52);
      return weeks > 0 ? `${years}y ${weeks}w` : `${years} years`;
    }
    return `${Math.round(draws)} weeks`;
  };

  // Luck meter color
  const getLuckColor = (score: number) => {
    if (score >= 150) return "text-terminal-negative"; // Very overdue
    if (score >= 100) return "text-yellow-400"; // Overdue
    return "text-terminal-positive"; // Normal
  };

  return (
    <div ref={panelRef} className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded bg-yellow-500/10 border border-yellow-500/20 flex-shrink-0">
              <Crosshair className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  <span className="lg:hidden">Jackpot Hunter</span>
                  <span className="hidden lg:inline">Jackpot Hunter Mode</span>
                </h3>
                <InfoTooltip 
                  content="Your personal jackpot statistics based on your staked tickets. Remember: the jackpot is extremely unlikely to hit. This is for entertainment only, not investment advice."
                  title="Jackpot Statistics"
                />
              </div>
              <p className="text-[10px] text-terminal-textMuted">
                {formatNumber(userTickets)} tickets • {formatNumber(totalTickets)} total
              </p>
            </div>
          </div>
          
          {/* Current Jackpot Badge and Screenshot */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">
                <CurrencyAmount amount={currentJackpot} />
              </span>
            </div>
            <ScreenshotButton targetRef={panelRef} filename="shfl-jackpot-hunter" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1">
        <div className="space-y-4">
          {/* Main Stats - Your Odds */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                  Your Odds
                </div>
                <div className="text-xl lg:text-2xl font-bold text-yellow-400 tabular-nums">
                  {formatOdds(jackpotStats.userProbability)}
                </div>
                <div className="text-[10px] text-terminal-textMuted">
                  per draw
                </div>
              </div>
              <div>
                <div className="text-[10px] text-terminal-textMuted uppercase tracking-wider mb-1">
                  Expected Wait
                </div>
                <div className="text-xl lg:text-2xl font-bold text-terminal-text tabular-nums">
                  {formatDraws(jackpotStats.expectedDrawsToWin)}
                </div>
                <div className="text-[10px] text-terminal-textMuted">
                  until you win
                </div>
              </div>
            </div>
          </div>

          {/* EV and Share Stats */}
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-terminal-accent" />
                <span className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider">Your EV</span>
              </div>
              <div className="text-sm lg:text-base font-bold text-terminal-accent tabular-nums">
                <CurrencyAmount amount={jackpotStats.userJackpotEV} />
              </div>
              <div className="text-[9px] text-terminal-textMuted">
                per draw
              </div>
            </div>
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-2.5 lg:p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3 h-3 text-terminal-positive" />
                <span className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase tracking-wider">Your Ticket %</span>
                <InfoTooltip 
                  content="Your percentage of total tickets this draw. If multiple people match the jackpot, it splits among all winners based on their ticket count."
                  title="Ticket Share"
                />
              </div>
              <div className="text-sm lg:text-base font-bold text-terminal-positive tabular-nums">
                {(jackpotStats.userShareIfWon * 100).toFixed(4)}%
              </div>
              <div className="text-[9px] text-terminal-textMuted">
                of {formatNumber(totalTickets)} total
              </div>
            </div>
          </div>

          {/* Desktop: Additional Stats */}
          <div className="hidden lg:grid grid-cols-3 gap-3">
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Dice1 className="w-3.5 h-3.5 text-terminal-textMuted" />
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Network Odds</span>
              </div>
              <div className="text-sm font-bold text-terminal-text tabular-nums">
                {(jackpotStats.networkProbability * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                chance someone wins
              </div>
            </div>
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-terminal-textMuted" />
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Current Streak</span>
              </div>
              <div className="text-sm font-bold text-terminal-text tabular-nums">
                {jackpotStats.currentStreak} draws
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                without jackpot
              </div>
            </div>
            <div className="bg-terminal-dark/50 border border-terminal-border/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-terminal-textMuted" />
                <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider">Overdue Score</span>
              </div>
              <div className={cn("text-sm font-bold tabular-nums", getLuckColor(jackpotStats.luckScore))}>
                {jackpotStats.luckScore.toFixed(0)}%
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                {jackpotStats.luckScore >= 100 ? "overdue" : "normal range"}
              </div>
            </div>
          </div>

          {/* Mobile: Compact Additional Info */}
          <div className="lg:hidden flex items-center justify-between text-[10px] p-2 bg-terminal-dark/50 rounded-lg">
            <span className="text-terminal-textMuted">
              Network: {(jackpotStats.networkProbability * 100).toFixed(1)}% chance
            </span>
            <span className="text-terminal-textMuted">
              Streak: {jackpotStats.currentStreak} draws
            </span>
          </div>

          {/* Staked Amount Reminder */}
          <div className="flex items-center justify-between text-[10px] text-terminal-textMuted p-2 bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg">
            <span>Using <span className="text-terminal-accent font-medium">{stakedLabel} SHFL</span> ({formatNumber(userTickets)} tickets)</span>
            <button
              onClick={() => {
                const el = document.getElementById("yield-calculator");
                if (el) {
                  const isMobile = window.innerWidth < 1024;
                  const yOffset = isMobile ? -70 : -220;
                  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className="flex items-center gap-1 px-2 py-1 text-terminal-accent hover:text-terminal-text hover:bg-terminal-accent/20 rounded transition-colors"
            >
              <Settings2 className="w-3 h-3" />
              <span>Change</span>
            </button>
          </div>

          {/* Disclaimer */}
          <div className="text-[9px] text-terminal-textMuted/70 text-center">
            ⚠️ Jackpot is extremely unlikely. For entertainment only.
          </div>
        </div>
      </div>
    </div>
  );
}

