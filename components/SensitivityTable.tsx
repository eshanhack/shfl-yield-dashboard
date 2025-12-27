"use client";

import { useMemo } from "react";
import { SensitivityCell, generateSensitivityTable } from "@/lib/calculations";
import { cn } from "@/lib/utils";

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
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow overflow-x-auto">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-terminal-text">
          Yield Sensitivity Matrix
        </h3>
        <p className="text-xs text-terminal-textMuted">
          APY % based on NGR and SHFL price fluctuations (per 1,000 SHFL staked)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="p-3 text-left text-[10px] text-terminal-textMuted font-normal uppercase tracking-wider border-b border-terminal-border">
                NGR ↓ / Price →
              </th>
              {priceMultipliers.map((mult) => (
                <th
                  key={mult}
                  className="p-3 text-center text-xs text-terminal-textSecondary font-medium border-b border-terminal-border"
                >
                  <div>{mult}x</div>
                  <div className="text-[10px] text-terminal-textMuted font-normal">
                    ${(basePrice * mult).toFixed(3)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="p-3 text-xs text-terminal-textSecondary font-medium border-b border-terminal-border/50">
                  <div>{ngrMultipliers[rowIndex]}x</div>
                  <div className="text-[10px] text-terminal-textMuted font-normal">
                    ${((baseNGR * ngrMultipliers[rowIndex]) / 1_000_000).toFixed(2)}M
                  </div>
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      "p-3 text-center text-sm font-bold border-b border-terminal-border/50",
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

      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-terminal-border flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-terminal-positive/30" />
          <span className="text-[10px] text-terminal-textMuted">≥100% APY</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-terminal-accent/30" />
          <span className="text-[10px] text-terminal-textMuted">≥50% APY</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-terminal-border" />
          <span className="text-[10px] text-terminal-textMuted">≥25% APY</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-terminal-warning/30" />
          <span className="text-[10px] text-terminal-textMuted">≥10% APY</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded ring-2 ring-terminal-accent" />
          <span className="text-[10px] text-terminal-textMuted">Current</span>
        </div>
      </div>
    </div>
  );
}
