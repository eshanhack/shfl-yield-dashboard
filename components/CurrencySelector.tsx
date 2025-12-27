"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

export default function CurrencySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
          "bg-terminal-dark border border-terminal-border",
          "hover:border-terminal-accent hover:text-terminal-accent",
          isOpen && "border-terminal-accent text-terminal-accent"
        )}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{selectedCurrency.code}</span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] max-h-[340px] overflow-y-auto bg-terminal-card border border-terminal-border rounded-lg shadow-lg">
          {/* Info header */}
          <div className="px-3 py-2 border-b border-terminal-border/50 bg-terminal-dark/50">
            <p className="text-[10px] text-terminal-textMuted leading-relaxed">
              Select a currency. Hover over any USDC amount to see it converted.
            </p>
          </div>
          <div className="p-1">
            {CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  setSelectedCurrency(currency);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left",
                  selectedCurrency.code === currency.code
                    ? "bg-terminal-accent/20 text-terminal-accent"
                    : "text-terminal-text hover:bg-terminal-border/50"
                )}
              >
                <span className="w-8 font-mono text-terminal-textMuted">{currency.symbol}</span>
                <span className="font-medium">{currency.code}</span>
                <span className="text-terminal-textMuted text-[10px] ml-auto">{currency.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

