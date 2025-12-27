"use client";

import { useMemo } from "react";
import { 
  Ticket, 
  Zap, 
  Coins, 
  TrendingUp,
  Clock,
  Info
} from "lucide-react";
import { 
  calculateStandardTicketEV,
  calculatePowerplayTicketEV,
  calculateStakedTicketEV,
  formatUSD,
  formatNumber,
  EVResult
} from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface TicketEVPanelProps {
  totalPool: number;
  prizeSplit: string;
  totalTickets: number;
  shflPrice: number;
}

export default function TicketEVPanel({
  totalPool,
  prizeSplit,
  totalTickets,
  shflPrice,
}: TicketEVPanelProps) {
  const standardEV = useMemo(() => {
    return calculateStandardTicketEV(totalPool, prizeSplit, totalTickets);
  }, [totalPool, prizeSplit, totalTickets]);

  const powerplayEV = useMemo(() => {
    return calculatePowerplayTicketEV(totalPool, prizeSplit, totalTickets);
  }, [totalPool, prizeSplit, totalTickets]);

  const stakedEV = useMemo(() => {
    return calculateStakedTicketEV(totalPool, prizeSplit, totalTickets, shflPrice);
  }, [totalPool, prizeSplit, totalTickets, shflPrice]);

  const getEVColor = (ev: number, cost: number) => {
    const ratio = ev / cost;
    if (ratio >= 0) return "text-terminal-positive";
    if (ratio >= -0.5) return "text-yellow-400";
    return "text-terminal-negative";
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
          <TrendingUp className="w-4 h-4 text-terminal-accent" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-terminal-text">
            Ticket Expected Value
          </h3>
          <p className="text-[10px] text-terminal-textMuted">
            EV analysis for this draw • Pool: {formatUSD(totalPool)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Standard Ticket */}
        <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-terminal-text">Standard Ticket</span>
            </div>
            <span className="text-xs text-terminal-textMuted">${standardEV.cost.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-terminal-textMuted">Expected Prize</div>
              <div className="text-sm font-bold text-terminal-text tabular-nums">
                ${standardEV.expectedPrize.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-terminal-textMuted">EV</div>
              <div className={cn("text-sm font-bold tabular-nums", getEVColor(standardEV.ev, standardEV.cost))}>
                {standardEV.ev >= 0 ? "+" : ""}{standardEV.ev.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-terminal-textMuted">EV %</div>
              <div className={cn("text-sm font-bold tabular-nums", getEVColor(standardEV.ev, standardEV.cost))}>
                {standardEV.evPercent >= 0 ? "+" : ""}{standardEV.evPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Powerplay Ticket */}
        <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-terminal-text">Powerplay Ticket</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                Guaranteed PB
              </span>
            </div>
            <span className="text-xs text-terminal-textMuted">${powerplayEV.cost.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-terminal-textMuted">Expected Prize</div>
              <div className="text-sm font-bold text-terminal-text tabular-nums">
                ${powerplayEV.expectedPrize.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-terminal-textMuted">EV</div>
              <div className={cn("text-sm font-bold tabular-nums", getEVColor(powerplayEV.ev, powerplayEV.cost))}>
                {powerplayEV.ev >= 0 ? "+" : ""}{powerplayEV.ev.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-terminal-textMuted">EV %</div>
              <div className={cn("text-sm font-bold tabular-nums", getEVColor(powerplayEV.ev, powerplayEV.cost))}>
                {powerplayEV.evPercent >= 0 ? "+" : ""}{powerplayEV.evPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Staked Ticket */}
        <div className="bg-gradient-to-r from-terminal-accent/10 to-purple-900/10 border border-terminal-accent/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-terminal-accent" />
              <span className="text-xs font-medium text-terminal-text">Staked Ticket</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent">
                50 SHFL
              </span>
            </div>
            <span className="text-xs text-terminal-textMuted">{formatUSD(stakedEV.cost)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-[10px] text-terminal-textMuted">EV per Draw</div>
              <div className="text-sm font-bold text-terminal-accent tabular-nums">
                ${stakedEV.expectedPrize.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-terminal-textMuted">Annual ROI</div>
              <div className="text-sm font-bold text-terminal-positive tabular-nums">
                {stakedEV.annualROI.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-terminal-border/50">
            <Clock className="w-3 h-3 text-terminal-textMuted" />
            <span className="text-[10px] text-terminal-textMuted">
              Break-even: <span className="text-terminal-accent font-medium">
                {stakedEV.weeksToBreakeven === Infinity 
                  ? "N/A" 
                  : `~${Math.ceil(stakedEV.weeksToBreakeven)} weeks`}
              </span>
              {stakedEV.weeksToBreakeven < Infinity && (
                <span className="text-terminal-textMuted"> ({(stakedEV.weeksToBreakeven / 52).toFixed(1)} years)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-3 pt-3 border-t border-terminal-border">
        <div className="flex items-start gap-2">
          <Info className="w-3 h-3 text-terminal-textMuted mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-terminal-textMuted leading-relaxed">
            EV calculated using prize pool distribution and lottery probabilities. 
            Staked tickets are permanent and generate returns every draw.
            Standard: $0.25 | Powerplay: $4 (guarantees powerball) | Staked: 50 × ${shflPrice.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
}

