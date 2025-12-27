"use client";

import { useState, useRef, useEffect } from "react";
import { Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  title?: string;
  variant?: "icon" | "text" | "inline";
  position?: "top" | "bottom" | "auto";
  className?: string;
  children?: React.ReactNode;
}

export default function InfoTooltip({ 
  content, 
  title,
  variant = "icon",
  position = "auto",
  className,
  children 
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showBelow, setShowBelow] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && position === "auto") {
      const rect = triggerRef.current.getBoundingClientRect();
      // If there's less than 150px above, show below
      setShowBelow(rect.top < 150);
    }
  }, [isVisible, position]);

  const shouldShowBelow = position === "bottom" || (position === "auto" && showBelow);

  return (
    <span 
      ref={triggerRef}
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
        <div 
          className={cn(
            "absolute z-50 left-1/2 -translate-x-1/2 w-64 pointer-events-none",
            shouldShowBelow ? "top-full mt-2" : "bottom-full mb-2"
          )}
        >
          <div className="bg-terminal-dark border border-terminal-accent/30 rounded-lg p-3 shadow-xl shadow-terminal-accent/10">
            {title && (
              <div className="text-xs font-medium text-terminal-accent mb-1">{title}</div>
            )}
            <p className="text-[11px] text-terminal-textSecondary leading-relaxed">
              {content}
            </p>
          </div>
          {/* Arrow */}
          <div 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-terminal-dark border-terminal-accent/30",
              shouldShowBelow 
                ? "-top-1.5 border-l border-t rotate-45" 
                : "-bottom-1.5 border-r border-b rotate-45"
            )} 
          />
        </div>
      )}
    </span>
  );
}

// Educational content constants
export const TOOLTIPS = {
  shfl: "SHFL is the native token of Shuffle.com, a cryptocurrency casino. Holding SHFL lets you participate in the weekly lottery and earn passive yield.",
  staking: "Staking means locking your SHFL tokens to receive lottery tickets. You can unstake anytime, but must wait until the next draw to receive your tokens back. If you unstake, you won't participate in that draw.",
  ticket: "Each ticket costs 50 SHFL to stake. Tickets automatically enter every weekly lottery draw and can win prizes across 9 divisions. You can unstake anytime (tokens returned after next draw).",
  apy: "Annual Percentage Yield - the estimated yearly return on your staked SHFL based on historical lottery payouts. This excludes jackpot winnings.",
  ngr: "Net Gaming Revenue - the casino's profit after paying out winnings. 15% of Shuffle.com's NGR goes to the lottery prize pool each week.",
  ggr: "Gross Gaming Revenue - total amount wagered minus winnings paid. NGR is roughly half of GGR after operating costs.",
  prizePool: "The total prize pool for this week's lottery. Built from 15% of Shuffle.com's weekly NGR plus accumulated jackpot from previous weeks.",
  jackpot: "The Division 1 prize, won by matching all 5 numbers + the powerball. If no one wins, it rolls over to next week, growing larger.",
  lottery: "Every Friday, 5 numbers (1-55) and 1 powerball (1-18) are drawn. Your tickets are checked against 9 prize divisions automatically.",
  yield: "Expected winnings from divisions 2-9 (excluding jackpot). Based on your share of total tickets and the prize pool distribution.",
  shuffle: "Shuffle.com is a licensed cryptocurrency casino. The SHFL lottery is funded by 15% of the casino's weekly profits.",
  sensitivity: "Shows how your yield changes if NGR (casino revenue) or SHFL price moves up or down from current levels.",
  ev: "Expected Value - the average return per ticket. For purchased tickets, 85% of sales go to the prize pool (15% house edge). Negative EV is expected. Staked tickets have no ongoing cost, so EV represents pure expected winnings.",
  unstaking: "You can unstake your SHFL anytime. Your tokens will be returned after the next lottery draw completes. Note: unstaked tokens won't participate in the upcoming draw.",
};

