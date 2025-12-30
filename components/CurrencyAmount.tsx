"use client";

import { useState, useEffect } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertFromUSD, formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencyAmountProps {
  amount: number; // Amount in USD
  className?: string;
  compact?: boolean;
  compactOnMobile?: boolean; // Show compact format only on mobile (max-width: 1023px)
  showIcon?: boolean;
}

export default function CurrencyAmount({ 
  amount, 
  className = "",
  compact = false,
  compactOnMobile = false,
  showIcon = false,
}: CurrencyAmountProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { selectedCurrency } = useCurrency();
  
  // Detect mobile for conditional compact display
  useEffect(() => {
    if (!compactOnMobile) return;
    
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [compactOnMobile]);
  
  const isUSD = selectedCurrency.code === "USD";
  const convertedAmount = convertFromUSD(amount, selectedCurrency.code);
  
  // Use compact format if prop is true OR if compactOnMobile is true and we're on mobile
  const useCompact = compact || (compactOnMobile && isMobile);
  
  // Format the amounts
  const usdFormatted = useCompact 
    ? `$${amount >= 1_000_000 ? (amount / 1_000_000).toFixed(0) + "M" : amount >= 1_000 ? (amount / 1_000).toFixed(0) + "K" : amount.toFixed(0)}`
    : `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const convertedFormatted = useCompact
    ? formatCurrencyCompact(convertedAmount, selectedCurrency.code)
    : formatCurrency(convertedAmount, selectedCurrency.code);
  
  // If USD is selected, just show the amount without hover effect
  if (isUSD) {
    return (
      <span className={cn("tabular-nums", className)}>
        {showIcon && <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 inline mr-1" />}
        {usdFormatted}
      </span>
    );
  }
  
  return (
    <span
      className={cn(
        "tabular-nums cursor-pointer relative inline-block transition-all duration-200",
        isHovered && "scale-105",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* USD Amount (default) */}
      <span 
        className={cn(
          "transition-all duration-300",
          isHovered ? "opacity-0 absolute" : "opacity-100"
        )}
      >
        {showIcon && <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-4 h-4 inline mr-1" />}
        {usdFormatted}
      </span>
      
      {/* Converted Amount (on hover) */}
      <span 
        className={cn(
          "transition-all duration-300",
          isHovered 
            ? "opacity-100 text-terminal-accent animate-pulse" 
            : "opacity-0 absolute",
          isHovered && "drop-shadow-[0_0_8px_rgba(138,43,226,0.8)]"
        )}
        style={{
          textShadow: isHovered ? "0 0 10px rgba(255, 85, 0, 0.6), 0 0 20px rgba(255, 85, 0, 0.4)" : "none"
        }}
      >
        {convertedFormatted}
      </span>
    </span>
  );
}

