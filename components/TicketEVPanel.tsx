"use client";

import { useMemo, useState } from "react";
import { 
  Ticket, 
  Zap, 
  Coins, 
  TrendingUp,
  Clock,
  Info,
  ChevronDown
} from "lucide-react";
import { 
  calculateStandardTicketEV,
  calculatePowerplayTicketEV,
  calculateStakedTicketEV,
  formatUSD,
  formatNumber,
  HistoricalDraw,
  EVResult
} from "@/lib/calculations";
import { cn } from "@/lib/utils";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";

interface TicketEVPanelProps {
  totalPool: number;
  prizeSplit: string;
  totalTickets: number;
  shflPrice: number;
  historicalDraws?: HistoricalDraw[];
  currentDrawNumber?: number;
}

export default function TicketEVPanel({
  totalPool,
  prizeSplit,
  totalTickets,
  shflPrice,
  historicalDraws = [],
  currentDrawNumber = 64,
}: TicketEVPanelProps) {
  // "upcoming" means use the current/upcoming draw props, otherwise use historical draw number
  const [selectedDraw, setSelectedDraw] = useState<"upcoming" | number>("upcoming");
  
  // Get the draw data based on selection
  const drawData = useMemo(() => {
    if (selectedDraw === "upcoming") {
      return {
        pool: totalPool,
        split: prizeSplit,
        tickets: totalTickets,
        label: `Draw #${currentDrawNumber} (Upcoming)`,
      };
    }
    
    const draw = historicalDraws.find(d => d.drawNumber === selectedDraw);
    if (draw) {
      return {
        pool: draw.totalPoolUSD,
        split: draw.prizepoolSplit || prizeSplit,
        tickets: draw.totalTickets || totalTickets,
        label: `Draw #${draw.drawNumber}`,
      };
    }
    
    return {
      pool: totalPool,
      split: prizeSplit,
      tickets: totalTickets,
      label: `Draw #${currentDrawNumber} (Upcoming)`,
    };
  }, [selectedDraw, totalPool, prizeSplit, totalTickets, historicalDraws, currentDrawNumber]);

  const standardEV = useMemo(() => {
    return calculateStandardTicketEV(drawData.pool, drawData.split, drawData.tickets);
  }, [drawData]);

  const powerplayEV = useMemo(() => {
    return calculatePowerplayTicketEV(drawData.pool, drawData.split, drawData.tickets);
  }, [drawData]);

  const stakedEV = useMemo(() => {
    return calculateStakedTicketEV(drawData.pool, drawData.split, drawData.tickets, shflPrice);
  }, [drawData, shflPrice]);

  const getEVColor = (ev: number, cost: number) => {
    const ratio = ev / cost;
    if (ratio >= 0) return "text-terminal-positive";
    if (ratio >= -0.5) return "text-yellow-400";
    return "text-terminal-negative";
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg xl:rounded-xl p-4 xl:p-6 card-glow h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 xl:mb-6">
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="p-1.5 xl:p-2 rounded bg-terminal-accent/10 border border-terminal-accent/20">
            <TrendingUp className="w-4 h-4 xl:w-5 xl:h-5 text-terminal-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 xl:gap-2">
              <h3 className="text-sm xl:text-base font-medium text-terminal-text">
                Ticket Expected Value
              </h3>
              <InfoTooltip content={TOOLTIPS.ev} title="Expected Value (EV)" />
            </div>
            <p className="text-[10px] xl:text-xs text-terminal-textMuted">
              Pool: {formatUSD(drawData.pool)} • {drawData.tickets.toLocaleString()} tickets
            </p>
          </div>
        </div>
        
        {/* Draw Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedDraw}
            onChange={(e) => setSelectedDraw(e.target.value === "upcoming" ? "upcoming" : parseInt(e.target.value))}
            className="appearance-none bg-terminal-dark border border-terminal-border rounded-lg px-3 py-1.5 xl:px-4 xl:py-2 pr-8 xl:pr-10 text-xs xl:text-sm text-terminal-text focus:outline-none focus:border-terminal-accent cursor-pointer"
          >
            <option value="upcoming">Draw #{currentDrawNumber} (Upcoming)</option>
            {historicalDraws.slice(0, 20).map((draw) => (
              <option key={draw.drawNumber} value={draw.drawNumber}>
                Draw #{draw.drawNumber} - {new Date(draw.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 xl:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 xl:w-4 xl:h-4 text-terminal-textMuted pointer-events-none" />
        </div>
      </div>

      <div className="space-y-3 xl:space-y-4 flex-1">
        {/* Standard Ticket */}
        <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-3 xl:p-4">
          <div className="flex items-center justify-between mb-2 xl:mb-3">
            <div className="flex items-center gap-2 xl:gap-3">
              <Ticket className="w-4 h-4 xl:w-5 xl:h-5 text-blue-400" />
              <span className="text-xs xl:text-sm font-medium text-terminal-text">Standard Ticket</span>
            </div>
            <span className="text-xs xl:text-sm text-terminal-textMuted">${standardEV.cost.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:gap-4">
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">Expected Prize</div>
              <div className="text-sm xl:text-base font-bold text-terminal-text tabular-nums">
                ${standardEV.expectedPrize.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">EV</div>
              <div className={cn("text-sm xl:text-base font-bold tabular-nums", getEVColor(standardEV.ev, standardEV.cost))}>
                {standardEV.ev >= 0 ? "+" : ""}{standardEV.ev.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">EV %</div>
              <div className={cn("text-sm xl:text-base font-bold tabular-nums", getEVColor(standardEV.ev, standardEV.cost))}>
                {standardEV.evPercent >= 0 ? "+" : ""}{standardEV.evPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Powerplay Ticket */}
        <div className="bg-terminal-dark border border-terminal-border rounded-lg xl:rounded-xl p-3 xl:p-4">
          <div className="flex items-center justify-between mb-2 xl:mb-3">
            <div className="flex items-center gap-2 xl:gap-3">
              <Zap className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-400" />
              <span className="text-xs xl:text-sm font-medium text-terminal-text">Powerplay Ticket</span>
              <span className="text-[9px] xl:text-[10px] px-1.5 py-0.5 xl:px-2 xl:py-1 rounded bg-yellow-500/20 text-yellow-400">
                Guaranteed PB
              </span>
            </div>
            <span className="text-xs xl:text-sm text-terminal-textMuted">${powerplayEV.cost.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:gap-4">
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">Expected Prize</div>
              <div className="text-sm xl:text-base font-bold text-terminal-text tabular-nums">
                ${powerplayEV.expectedPrize.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">EV</div>
              <div className={cn("text-sm xl:text-base font-bold tabular-nums", getEVColor(powerplayEV.ev, powerplayEV.cost))}>
                {powerplayEV.ev >= 0 ? "+" : ""}{powerplayEV.ev.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">EV %</div>
              <div className={cn("text-sm xl:text-base font-bold tabular-nums", getEVColor(powerplayEV.ev, powerplayEV.cost))}>
                {powerplayEV.evPercent >= 0 ? "+" : ""}{powerplayEV.evPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Staked Ticket */}
        <div className="bg-gradient-to-r from-terminal-accent/10 to-purple-900/10 border border-terminal-accent/30 rounded-lg xl:rounded-xl p-3 xl:p-4">
          <div className="flex items-center justify-between mb-2 xl:mb-3">
            <div className="flex items-center gap-2 xl:gap-3">
              <Coins className="w-4 h-4 xl:w-5 xl:h-5 text-terminal-accent" />
              <span className="text-xs xl:text-sm font-medium text-terminal-text">Staked Ticket</span>
              <span className="text-[9px] xl:text-[10px] px-1.5 py-0.5 xl:px-2 xl:py-1 rounded bg-terminal-accent/20 text-terminal-accent">
                50 SHFL
              </span>
            </div>
            <span className="text-xs xl:text-sm text-terminal-textMuted">{formatUSD(stakedEV.cost)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:gap-4 mb-2 xl:mb-3">
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">EV per Draw</div>
              <div className="text-sm xl:text-lg font-bold text-terminal-accent tabular-nums">
                ${stakedEV.expectedPrize.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] xl:text-xs text-terminal-textMuted">Annual ROI</div>
              <div className="text-sm xl:text-lg font-bold text-terminal-positive tabular-nums">
                {stakedEV.annualROI.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 xl:gap-2 pt-2 xl:pt-3 border-t border-terminal-border/50">
            <Clock className="w-3 h-3 xl:w-4 xl:h-4 text-terminal-textMuted" />
            <span className="text-[10px] xl:text-xs text-terminal-textMuted">
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
      <div className="mt-3 xl:mt-4 pt-3 xl:pt-4 border-t border-terminal-border">
        <div className="flex items-start gap-2 xl:gap-3">
          <Info className="w-3 h-3 xl:w-4 xl:h-4 text-terminal-textMuted mt-0.5 flex-shrink-0" />
          <p className="text-[10px] xl:text-xs text-terminal-textMuted leading-relaxed">
            <span className="text-terminal-accent">85% of ticket sales</span> go to the prize pool (15% house edge).
            Staked tickets have no ongoing cost — you can unstake anytime (tokens returned after next draw).
            <br />
            Standard: $0.25 | Powerplay: $4 (guarantees powerball) | Staked: 50 SHFL × ${shflPrice.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
}

