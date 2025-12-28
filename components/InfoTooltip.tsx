"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && triggerRef.current && mounted) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 256;
      const tooltipHeight = 100; // Approximate height
      const padding = 12;
      
      // Calculate vertical position
      let top: number;
      let arrowTop: number;
      let arrowRotation: string;
      
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const preferTop = position === "top" || (position === "auto" && spaceAbove > tooltipHeight + padding);
      const preferBottom = position === "bottom" || (position === "auto" && spaceBelow > spaceAbove);
      
      if (preferTop && spaceAbove > tooltipHeight + padding) {
        top = rect.top - tooltipHeight - padding;
        arrowTop = rect.top - padding - 6;
        arrowRotation = "rotate(225deg)";
      } else {
        top = rect.bottom + padding;
        arrowTop = rect.bottom + padding - 6;
        arrowRotation = "rotate(45deg)";
      }
      
      // Calculate horizontal position
      let left: number;
      let arrowLeft: number;
      
      const centerX = rect.left + rect.width / 2;
      const spaceOnRight = window.innerWidth - centerX;
      const spaceOnLeft = centerX;
      
      if (spaceOnRight < tooltipWidth / 2 + padding) {
        // Align to right edge
        left = window.innerWidth - tooltipWidth - padding;
        arrowLeft = rect.left + rect.width / 2 - 6;
      } else if (spaceOnLeft < tooltipWidth / 2 + padding) {
        // Align to left edge
        left = padding;
        arrowLeft = rect.left + rect.width / 2 - 6;
      } else {
        // Center
        left = centerX - tooltipWidth / 2;
        arrowLeft = centerX - 6;
      }
      
      setTooltipStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        zIndex: 9999,
      });
      
      setArrowStyle({
        position: "fixed",
        top: `${arrowTop}px`,
        left: `${arrowLeft}px`,
        width: "12px",
        height: "12px",
        transform: arrowRotation,
        zIndex: 9999,
      });
    }
  }, [isVisible, position, mounted]);

  const tooltipContent = isVisible && mounted ? (
    <>
      <div style={tooltipStyle} className="pointer-events-none">
        <div className="bg-terminal-dark border border-terminal-accent/30 rounded-lg p-3 shadow-xl shadow-terminal-accent/10">
          {title && (
            <div className="text-xs font-medium text-terminal-accent mb-1">{title}</div>
          )}
          <p className="text-[11px] text-terminal-textSecondary leading-relaxed">
            {content}
          </p>
        </div>
      </div>
      <div 
        style={arrowStyle} 
        className="bg-terminal-dark border-l border-t border-terminal-accent/30 pointer-events-none"
      />
    </>
  ) : null;

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
      
      {mounted && typeof document !== "undefined" && createPortal(tooltipContent, document.body)}
    </span>
  );
}

// Educational content constants with source citations
export const TOOLTIPS = {
  shfl: "SHFL is the native token of Shuffle.com, a cryptocurrency casino. Holding SHFL lets you participate in the weekly lottery and earn passive yield. [Source: Shuffle.com]",
  staking: "Staking means locking your SHFL tokens to receive lottery tickets. You can unstake anytime, but must wait until the next draw to receive your tokens back. If you unstake, you won't participate in that draw. [Source: Shuffle.com]",
  ticket: "Each ticket costs 50 SHFL to stake. Tickets automatically enter every weekly lottery draw and can win prizes across 9 divisions. You can unstake anytime (tokens returned after next draw). [Source: Shuffle.com]",
  apy: "Annual Percentage Yield - ESTIMATED yearly return based on historical lottery payouts. Excludes jackpot winnings. Past performance does not guarantee future results. [Calculated from: Historical draw data]",
  ngr: "Net Gaming Revenue - LIVE data showing casino profit after paying out winnings. 15% of Shuffle.com's NGR goes to the lottery prize pool each week. [Source: Shuffle.com API]",
  ggr: "Gross Gaming Revenue - ESTIMATED value (NGR × 2). Total amount wagered minus winnings paid. NGR is roughly half of GGR after operating costs. [Calculated]",
  prizePool: "The total prize pool for this week's lottery. LIVE data from Shuffle API. Built from 15% of weekly NGR plus accumulated jackpot. [Source: Shuffle.com API]",
  jackpot: "The Division 1 prize, won by matching all 5 numbers + the powerball. If no one wins, it rolls over to next week. LIVE data. [Source: Shuffle.com API]",
  lottery: "Every Friday at 6pm AEDT, 5 numbers (1-55) and 1 powerball (1-18) are drawn. Your tickets are checked against 9 prize divisions automatically. [Source: Shuffle.com]",
  yield: "ESTIMATED winnings from divisions 2-9 (excluding jackpot). Based on your share of total tickets and the prize pool distribution. [Calculated from: Draw data]",
  shuffle: "Shuffle.com is a licensed cryptocurrency casino. Note: This dashboard is NOT affiliated with Shuffle.com. [Disclaimer]",
  sensitivity: "PROJECTED yield if NGR (casino revenue) or SHFL price moves up or down from current levels. For informational purposes only. [Calculated]",
  ev: "Expected Value - CALCULATED average return per ticket based on probabilities. For purchased tickets, 85% of sales go to prize pool (15% house edge). Negative EV expected. [Calculated]",
  unstaking: "You can unstake your SHFL anytime. Tokens returned after next draw completes. Unstaked tokens won't participate in upcoming draw. [Source: Shuffle.com]",
  jackpotReplenishment: "🎰 JP Badge - This week's NGR was adjusted because the previous week's jackpot was won. Most of the NGR went to replenishing the jackpot (insurance), not staker yield. The expected yield shown is adjusted to reflect only the non-jackpot portion. [Calculated]",
};
