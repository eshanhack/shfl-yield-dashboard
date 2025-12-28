"use client";

import { useState, useEffect } from "react";
import { Scale, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/calculations";
import InfoTooltip from "./InfoTooltip";

type ViewMode = "revenue" | "earnings";

interface TokenBase {
  symbol: string;
  name: string;
  color: string;
}

// Base token info (static)
const TOKEN_INFO: TokenBase[] = [
  { symbol: "SHFL", name: "Shuffle", color: "#8A2BE2" },
  { symbol: "HYPE", name: "Hyperliquid", color: "#00D4AA" },
  { symbol: "PUMP", name: "Pump.fun", color: "#FF6B6B" },
  { symbol: "RLB", name: "Rollbit", color: "#FFD700" },
];

interface TokenWithCalculations extends TokenBase {
  marketCap: number;
  weeklyRevenue: number;
  weeklyEarnings: number;
  annualRevenue: number;
  annualEarnings: number;
  revenueAccrualPct: number;
  psRatio: number;
  peRatio: number;
  revenueSource: "live" | "estimated";
}

export default function TokenValuationTable() {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue");
  const [tokens, setTokens] = useState<TokenWithCalculations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "demo">("live");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch both market caps and revenue data in parallel
        const [mcResponse, revResponse] = await Promise.all([
          fetch("/api/market-caps"),
          fetch("/api/token-revenue"),
        ]);
        
        const mcJson = await mcResponse.json();
        const revJson = await revResponse.json();
        
        const marketCaps = mcJson.data || {};
        const revenues = revJson.data || [];
        
        // Determine if we have live data
        const hasLiveMarketCap = mcJson.source === "live";
        const hasLiveRevenue = revJson.source === "live";
        setDataSource(hasLiveMarketCap || hasLiveRevenue ? "live" : "demo");
        
        const tokensWithCalcs: TokenWithCalculations[] = TOKEN_INFO.map(token => {
          const marketCap = marketCaps[token.symbol] || 100000000;
          const revData = revenues.find((r: any) => r.symbol === token.symbol);
          
          // Use pre-calculated values from API
          const weeklyRevenue = revData?.weeklyRevenue || 1000000;
          const weeklyEarnings = revData?.weeklyEarnings || weeklyRevenue * 0.15;
          const annualRevenue = revData?.annualRevenue || weeklyRevenue * 52;
          const annualEarnings = revData?.annualEarnings || weeklyEarnings * 52;
          const revenueAccrualPct = revData?.revenueAccrualPct || 0.15;
          const revenueSource = revData?.source || "estimated";
          
          return {
            ...token,
            marketCap,
            weeklyRevenue,
            weeklyEarnings,
            annualRevenue,
            annualEarnings,
            revenueAccrualPct,
            psRatio: marketCap / annualRevenue,
            peRatio: marketCap / annualEarnings,
            revenueSource,
          };
        });
        
        // Sort by the current view mode ratio
        tokensWithCalcs.sort((a, b) => {
          const ratioA = viewMode === "revenue" ? a.psRatio : a.peRatio;
          const ratioB = viewMode === "revenue" ? b.psRatio : b.peRatio;
          return ratioA - ratioB;
        });
        
        setTokens(tokensWithCalcs);
      } catch (error) {
        console.error("Error:", error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [viewMode]);

  // Get color based on ratio (lower = greener = cheaper)
  const getRatioColor = (ratio: number, allRatios: number[]) => {
    const sorted = [...allRatios].sort((a, b) => a - b);
    const rank = sorted.indexOf(ratio);
    
    if (rank === 0) return "text-green-400 bg-green-500/20";
    if (rank === 1) return "text-yellow-400 bg-yellow-500/20";
    return "text-red-400 bg-red-500/20";
  };

  const currentRatios = tokens.map(t => viewMode === "revenue" ? t.psRatio : t.peRatio);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-terminal-text">
                  Token Valuation
                </h3>
                <InfoTooltip 
                  content="Compares how much revenue/earnings accrue to token holders relative to market cap. Lower ratios = potentially better value."
                  title="Valuation Metrics"
                />
                <span className={cn(
                  "px-1.5 py-0.5 text-[9px] font-bold uppercase rounded",
                  dataSource === "live" 
                    ? "bg-terminal-positive/20 text-terminal-positive border border-terminal-positive/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                )}>
                  {dataSource === "live" ? "● LIVE" : "◉ DEMO"}
                </span>
              </div>
              <p className="text-[10px] text-terminal-textMuted">
                {viewMode === "revenue" ? "Platform revenue" : "Earnings accrued to holders"}
              </p>
            </div>
          </div>
          
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-terminal-dark rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("revenue")}
              className={cn(
                "px-3 py-1.5 text-[10px] font-medium rounded-md transition-all",
                viewMode === "revenue"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-terminal-textMuted hover:text-terminal-text"
              )}
            >
              Revenue (P/S)
            </button>
            <button
              onClick={() => setViewMode("earnings")}
              className={cn(
                "px-3 py-1.5 text-[10px] font-medium rounded-md transition-all",
                viewMode === "earnings"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-terminal-textMuted hover:text-terminal-text"
              )}
            >
              Earnings (P/E)
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                <span className="text-terminal-textMuted">Cheap</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
                <span className="text-terminal-textMuted">Fair</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                <span className="text-terminal-textMuted">Expensive</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="px-4 py-3 text-left text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      Token
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      Market Cap
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        Annual {viewMode === "revenue" ? "Rev" : "Earnings"}
                        <InfoTooltip 
                          content={viewMode === "revenue" 
                            ? "Total platform revenue annualized" 
                            : "Revenue accrued to token holders (varies by tokenomics)"
                          }
                          position="bottom"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        Accrual %
                        <InfoTooltip 
                          content="Percentage of revenue that goes to token holders"
                          position="bottom"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        {viewMode === "revenue" ? "P/S" : "P/E"} Ratio
                        <InfoTooltip 
                          content={viewMode === "revenue"
                            ? "Market Cap ÷ Annual Revenue. Lower = potentially undervalued."
                            : "Market Cap ÷ Annual Earnings. Lower = potentially undervalued."
                          }
                          position="bottom"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token, index) => {
                    const ratio = viewMode === "revenue" ? token.psRatio : token.peRatio;
                    const annualValue = viewMode === "revenue" ? token.annualRevenue : token.annualEarnings;
                    return (
                      <tr 
                        key={token.symbol}
                        className={cn(
                          "border-b border-terminal-border/50 transition-colors",
                          token.symbol === "SHFL" && "bg-terminal-accent/5",
                          "hover:bg-terminal-border/30"
                        )}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: token.color }}
                            />
                            <div>
                              <span className="text-sm font-medium text-terminal-text">
                                {token.symbol}
                              </span>
                              <span className="text-[10px] text-terminal-textMuted ml-2">
                                {token.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm text-terminal-text tabular-nums font-medium">
                            ${token.marketCap >= 1000000000 
                              ? (token.marketCap / 1000000000).toFixed(1) + "B"
                              : Math.round(token.marketCap / 1000000) + "M"
                            }
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm text-terminal-textSecondary tabular-nums">
                            ${formatNumber(Math.round(annualValue / 1000000))}M
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={cn(
                            "text-xs font-medium tabular-nums",
                            token.revenueAccrualPct >= 0.5 ? "text-green-400" : 
                            token.revenueAccrualPct >= 0.2 ? "text-yellow-400" : "text-terminal-textSecondary"
                          )}>
                            {(token.revenueAccrualPct * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={cn(
                            "text-sm font-bold tabular-nums px-2.5 py-1 rounded-md",
                            getRatioColor(ratio, currentRatios)
                          )}>
                            {ratio.toFixed(1)}x
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info Note */}
            <div className="mt-4 pt-4 border-t border-terminal-border">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-terminal-textMuted mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-terminal-textMuted leading-relaxed">
                  {viewMode === "revenue" 
                    ? "P/S compares market cap to total platform revenue. SHFL's revenue is Shuffle.com's full NGR."
                    : "P/E compares market cap to earnings accrued to holders. SHFL stakers receive 15% of NGR through the lottery. HYPE holders receive 54% through buybacks & assistance fund."
                  }
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
