"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  title?: string;
  variant?: "icon" | "text" | "inline";
  position?: "top" | "bottom" | "left" | "auto";
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
  const [tooltipPosition, setTooltipPosition] = useState<{ vertical: "top" | "bottom"; horizontal: "center" | "left" | "right" }>({
    vertical: "bottom",
    horizontal: "center"
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 = 16rem = 256px
      
      // Vertical position
      let vertical: "top" | "bottom" = "bottom";
      if (position === "top") {
        vertical = "top";
      } else if (position === "bottom") {
        vertical = "bottom";
      } else if (position === "auto") {
        vertical = rect.top < 150 ? "bottom" : "top";
      }
      
      // Horizontal position - check if tooltip would be cut off
      let horizontal: "center" | "left" | "right" = "center";
      const spaceOnRight = window.innerWidth - rect.right;
      const spaceOnLeft = rect.left;
      
      if (spaceOnRight < tooltipWidth / 2 + 20) {
        // Not enough space on right, align to right edge
        horizontal = "right";
      } else if (spaceOnLeft < tooltipWidth / 2 + 20) {
        // Not enough space on left, align to left edge
        horizontal = "left";
      }
      
      setTooltipPosition({ vertical, horizontal });
    }
  }, [isVisible, position]);

  const getTooltipClasses = () => {
    const classes = ["absolute z-[100] w-64 pointer-events-none"];
    
    // Vertical positioning
    if (tooltipPosition.vertical === "bottom") {
      classes.push("top-full mt-2");
    } else {
      classes.push("bottom-full mb-2");
    }
    
    // Horizontal positioning
    if (tooltipPosition.horizontal === "center") {
      classes.push("left-1/2 -translate-x-1/2");
    } else if (tooltipPosition.horizontal === "right") {
      classes.push("right-0");
    } else {
      classes.push("left-0");
    }
    
    return classes.join(" ");
  };

  const getArrowClasses = () => {
    const classes = ["absolute w-3 h-3 bg-terminal-dark border-terminal-accent/30"];
    
    if (tooltipPosition.vertical === "bottom") {
      classes.push("-top-1.5 border-l border-t rotate-45");
    } else {
      classes.push("-bottom-1.5 border-r border-b rotate-45");
    }
    
    // Arrow horizontal position
    if (tooltipPosition.horizontal === "center") {
      classes.push("left-1/2 -translate-x-1/2");
    } else if (tooltipPosition.horizontal === "right") {
      classes.push("right-4");
    } else {
      classes.push("left-4");
    }
    
    return classes.join(" ");
  };

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
        <div ref={tooltipRef} className={getTooltipClasses()}>
          <div className="bg-terminal-dark border border-terminal-accent/30 rounded-lg p-3 shadow-xl shadow-terminal-accent/10">
            {title && (
              <div className="text-xs font-medium text-terminal-accent mb-1">{title}</div>
            )}
            <p className="text-[11px] text-terminal-textSecondary leading-relaxed">
              {content}
            </p>
          </div>
          {/* Arrow */}
          <div className={getArrowClasses()} />
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
