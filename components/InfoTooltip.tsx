"use client";

import { useState } from "react";
import { Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  title?: string;
  variant?: "icon" | "text" | "inline";
  className?: string;
  children?: React.ReactNode;
}

export default function InfoTooltip({ 
  content, 
  title,
  variant = "icon",
  className,
  children 
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span 
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {variant === "icon" && (
        <Info className="w-3.5 h-3.5 text-terminal-textMuted hover:text-terminal-accent cursor-help transition-colors" />
      )}
      {variant === "text" && children}
      {variant === "inline" && (
        <span className="border-b border-dotted border-terminal-textMuted cursor-help">
          {children}
        </span>
      )}
      
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 pointer-events-none">
          <div className="bg-terminal-dark border border-terminal-accent/30 rounded-lg p-3 shadow-xl shadow-terminal-accent/10">
            {title && (
              <div className="text-xs font-medium text-terminal-accent mb-1">{title}</div>
            )}
            <p className="text-[11px] text-terminal-textSecondary leading-relaxed">
              {content}
            </p>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-terminal-dark border-r border-b border-terminal-accent/30 rotate-45" />
        </div>
      )}
    </span>
  );
}

// Educational content constants
export const TOOLTIPS = {
  shfl: "SHFL is the native token of Shuffle.com, a cryptocurrency casino. Holding SHFL lets you participate in the weekly lottery and earn passive yield.",
  staking: "Staking means locking up your SHFL tokens permanently. In return, you receive lottery tickets that enter you into every weekly draw forever.",
  ticket: "Each ticket costs 50 SHFL to create (permanently locked). Tickets automatically enter every weekly lottery draw and can win prizes across 9 divisions.",
  apy: "Annual Percentage Yield - the estimated yearly return on your staked SHFL based on historical lottery payouts. This excludes jackpot winnings.",
  ngr: "Net Gaming Revenue - the casino's profit after paying out winnings. 15% of Shuffle.com's NGR goes to the lottery prize pool each week.",
  ggr: "Gross Gaming Revenue - total amount wagered minus winnings paid. NGR is roughly half of GGR after operating costs.",
  prizePool: "The total prize pool for this week's lottery. Built from 15% of Shuffle.com's weekly NGR plus accumulated jackpot from previous weeks.",
  jackpot: "The Division 1 prize, won by matching all 5 numbers + the powerball. If no one wins, it rolls over to next week, growing larger.",
  lottery: "Every Friday, 5 numbers (1-55) and 1 powerball (1-18) are drawn. Your tickets are checked against 9 prize divisions automatically.",
  yield: "Expected winnings from divisions 2-9 (excluding jackpot). Based on your share of total tickets and the prize pool distribution.",
  shuffle: "Shuffle.com is a licensed cryptocurrency casino. The SHFL lottery is funded by 15% of the casino's weekly profits.",
  sensitivity: "Shows how your yield changes if NGR (casino revenue) or SHFL price moves up or down from current levels.",
  ev: "Expected Value - the average amount you'd win per ticket over many draws. Negative EV means the lottery favors the house on average.",
  permanent: "Unlike traditional staking, SHFL staking is one-way. Your tokens are locked forever, but your tickets generate returns indefinitely.",
};

