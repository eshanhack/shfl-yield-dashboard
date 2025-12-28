"use client";

import { useMemo, useState, useEffect } from "react";
import { SensitivityCell, generateSensitivityTable, formatNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";

interface SensitivityTableProps {
  baseNGR: number;
  basePrice: number;
  totalTickets: number;
  prizeSplit?: string;
}

export default function SensitivityTable({
  baseNGR,
  basePrice,
  totalTickets,
  prizeSplit = "30-14-8-9-7-6-5-10-11",
}: SensitivityTableProps) {
  const [stakedAmount, setStakedAmount] = useState<number>(1000);
  
  // Load saved staked amount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shfl-staked-amount");
    if (saved) {
      const amount = parseFloat(saved);
      if (amount > 0) {
        setStakedAmount(amount);
      }
    }
    
    // Listen for custom event when staked amount changes
    const handleStakedChange = (e: CustomEvent<number>) => {
      if (e.detail > 0) {
        setStakedAmount(e.detail);
      }
    };
    
    // Listen for storage changes (cross-tab)
    const handleStorageChange = () => {
      const updated = localStorage.getItem("shfl-staked-amount");
      if (updated) {
        const amount = parseFloat(updated);
        if (amount > 0) {
          setStakedAmount(amount);
        }
      }
    };
    
    window.addEventListener("shfl-staked-changed" as any, handleStakedChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("shfl-staked-changed" as any, handleStakedChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
  
  // Format staked amount for display
  const stakedLabel = stakedAmount >= 1000000 
    ? `${(stakedAmount / 1000000).toFixed(1)}M` 
    : stakedAmount >= 1000 
    ? `${formatNumber(stakedAmount / 1000)}K` 
    : formatNumber(stakedAmount);

  const ngrMultipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const priceMultipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const table = useMemo(() => {
    return generateSensitivityTable(
      baseNGR,
      basePrice,
      totalTickets,
      prizeSplit,
      ngrMultipliers,
      priceMultipliers
    );
  }, [baseNGR, basePrice, totalTickets, prizeSplit]);

  const getApyColor = (apy: number) => {
    if (apy >= 100) return "text-terminal-positive bg-terminal-positive/10";
    if (apy >= 50) return "text-terminal-accent bg-terminal-accent/10";
    if (apy >= 25) return "text-terminal-text bg-terminal-border/50";
    if (apy >= 10) return "text-terminal-warning bg-terminal-warning/10";
    return "text-terminal-negative bg-terminal-negative/10";
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg xl:rounded-xl p-4 xl:p-6 card-glow overflow-x-auto">
      <div className="mb-4 xl:mb-6">
        <div className="flex items-center gap-2 xl:gap-3">
          <h3 className="text-sm xl:text-base font-medium text-terminal-text">
            Yield Sensitivity Matrix
          </h3>
          <InfoTooltip content={TOOLTIPS.sensitivity} title="What-If Analysis" />
        </div>
        <p className="text-xs xl:text-sm text-terminal-textMuted">
          How your APY changes with casino revenue and token price (per {stakedLabel} SHFL)
        </p>
      </div>

      <div className="overflow-x-auto xl:overflow-visible">
        <table className="w-full min-w-[600px] xl:min-w-0">
          <thead>
            <tr>
              <th className="p-3 xl:p-4 text-left text-[10px] xl:text-xs text-terminal-textMuted font-normal uppercase tracking-wider border-b border-terminal-border">
                NGR ↓ / Price →
              </th>
              {priceMultipliers.map((mult) => (
                <th
                  key={mult}
                  className="p-3 xl:p-4 text-center text-xs xl:text-sm text-terminal-textSecondary font-medium border-b border-terminal-border"
                >
                  <div>{mult}x</div>
                  <div className="text-[10px] xl:text-xs text-terminal-textMuted font-normal">
                    ${(basePrice * mult).toFixed(3)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="p-3 xl:p-4 text-xs xl:text-sm text-terminal-textSecondary font-medium border-b border-terminal-border/50">
                  <div>{ngrMultipliers[rowIndex]}x</div>
                  <div className="text-[10px] xl:text-xs text-terminal-textMuted font-normal">
                    ${((baseNGR * ngrMultipliers[rowIndex]) / 1_000_000).toFixed(2)}M
                  </div>
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      "p-3 xl:p-4 text-center text-sm xl:text-base font-bold border-b border-terminal-border/50",
                      getApyColor(cell.apy),
                      cell.ngrMultiplier === 1 &&
                        cell.priceMultiplier === 1 &&
                        "ring-2 ring-terminal-accent ring-inset"
                    )}
                  >
                    {cell.apy.toFixed(1)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 xl:gap-8 mt-4 xl:mt-6 pt-3 xl:pt-4 border-t border-terminal-border flex-wrap">
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="w-3 h-3 xl:w-4 xl:h-4 rounded bg-terminal-positive/30" />
          <span className="text-[10px] xl:text-xs text-terminal-textMuted">≥100% APY</span>
        </div>
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="w-3 h-3 xl:w-4 xl:h-4 rounded bg-terminal-accent/30" />
          <span className="text-[10px] xl:text-xs text-terminal-textMuted">≥50% APY</span>
        </div>
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="w-3 h-3 xl:w-4 xl:h-4 rounded bg-terminal-border" />
          <span className="text-[10px] xl:text-xs text-terminal-textMuted">≥25% APY</span>
        </div>
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="w-3 h-3 xl:w-4 xl:h-4 rounded bg-terminal-warning/30" />
          <span className="text-[10px] xl:text-xs text-terminal-textMuted">≥10% APY</span>
        </div>
        <div className="flex items-center gap-2 xl:gap-3">
          <div className="w-3 h-3 xl:w-4 xl:h-4 rounded ring-2 ring-terminal-accent" />
          <span className="text-[10px] xl:text-xs text-terminal-textMuted">Current</span>
        </div>
      </div>
    </div>
  );
}
