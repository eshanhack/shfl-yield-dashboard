"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Scale, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/calculations";
import InfoTooltip from "./InfoTooltip";
import ScreenshotButton from "./ScreenshotButton";

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

// Fallback data for immediate render
const getFallbackTokens = (viewMode: ViewMode): TokenWithCalculations[] => {
  const fallbackData = [
    { symbol: "SHFL", marketCap: 108000000, annualRevenue: 275206896, annualEarnings: 20640517, revenueAccrualPct: 0.15 },
    { symbol: "HYPE", marketCap: 9000000000, annualRevenue: 1040000000, annualEarnings: 1029600000, revenueAccrualPct: 0.99 },
    { symbol: "PUMP", marketCap: 1100000000, annualRevenue: 396000000, annualEarnings: 396000000, revenueAccrualPct: 1.0 },
    { symbol: "RLB", marketCap: 120000000, annualRevenue: 277489012, annualEarnings: 37604979, revenueAccrualPct: 0.1355 },
  ];
  
  return fallbackData.map(d => {
    const info = TOKEN_INFO.find(t => t.symbol === d.symbol)!;
    return {
      ...info,
      marketCap: d.marketCap,
      weeklyRevenue: d.annualRevenue / 52,
      weeklyEarnings: d.annualEarnings / 52,
      annualRevenue: d.annualRevenue,
      annualEarnings: d.annualEarnings,
      revenueAccrualPct: d.revenueAccrualPct,
      psRatio: d.marketCap / d.annualRevenue,
      peRatio: d.marketCap / d.annualEarnings,
      revenueSource: "estimated" as const,
    };
  }).sort((a, b) => {
    const ratioA = viewMode === "revenue" ? a.psRatio : a.peRatio;
    const ratioB = viewMode === "revenue" ? b.psRatio : b.peRatio;
    return ratioA - ratioB;
  });
};

interface TokenValuationTableProps {
  prefetchedMarketCaps?: any;
  prefetchedRevenue?: any;
}

export default function TokenValuationTable({ prefetchedMarketCaps, prefetchedRevenue }: TokenValuationTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue");
  const [tokens, setTokens] = useState<TokenWithCalculations[]>(() => getFallbackTokens("revenue"));
  const [dataSource, setDataSource] = useState<"live" | "demo">("live");
  const [hasProcessedPrefetch, setHasProcessedPrefetch] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const processData = useCallback((mcJson: any, revJson: any, mode: ViewMode) => {
    const marketCaps = mcJson?.data || {};
    const revenues = revJson?.data || [];
    
    const hasLiveMarketCap = mcJson?.source === "live" || mcJson?.source === "partial";
    const hasLiveRevenue = revJson?.source === "live" || revenues.some((r: any) => r.source === "live");
    setDataSource(hasLiveMarketCap || hasLiveRevenue ? "live" : "demo");
    
    const tokensWithCalcs: TokenWithCalculations[] = TOKEN_INFO.map(token => {
      const marketCap = marketCaps[token.symbol] || 100000000;
      const revData = revenues.find((r: any) => r.symbol === token.symbol);
      
      let weeklyRevenue = revData?.weeklyRevenue || 1000000;
      let annualRevenue = revData?.annualRevenue || weeklyRevenue * 52;
      let revenueAccrualPct = revData?.revenueAccrualPct || 0.15;
      const revenueSource = revData?.source || "estimated";
      
      let annualEarnings = revData?.annualEarnings || annualRevenue * revenueAccrualPct;
      let weeklyEarnings = revData?.weeklyEarnings || weeklyRevenue * revenueAccrualPct;
      
      if (token.symbol === "SHFL" && annualRevenue < 200000000) {
        annualRevenue = 275206896;
        weeklyRevenue = annualRevenue / 52;
        annualEarnings = 20640517;
        weeklyEarnings = annualEarnings / 52;
        revenueAccrualPct = 0.15;
      }
      
      if (token.symbol === "RLB" && (revenueAccrualPct < 0.10 || revenueAccrualPct > 0.20)) {
        revenueAccrualPct = 0.1355;
        annualEarnings = annualRevenue * revenueAccrualPct;
        weeklyEarnings = annualEarnings / 52;
      }
      
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
    
    tokensWithCalcs.sort((a, b) => {
      const ratioA = mode === "revenue" ? a.psRatio : a.peRatio;
      const ratioB = mode === "revenue" ? b.psRatio : b.peRatio;
      return ratioA - ratioB;
    });
    
    setTokens(tokensWithCalcs);
  }, []);

  // Process prefetched data immediately on mount
  useEffect(() => {
    if (prefetchedMarketCaps && prefetchedRevenue && !hasProcessedPrefetch) {
      processData(prefetchedMarketCaps, prefetchedRevenue, viewMode);
      setHasProcessedPrefetch(true);
    }
  }, [prefetchedMarketCaps, prefetchedRevenue, hasProcessedPrefetch, viewMode, processData]);

  // Re-sort when viewMode changes
  useEffect(() => {
    setTokens(prev => {
      const sorted = [...prev].sort((a, b) => {
        const ratioA = viewMode === "revenue" ? a.psRatio : a.peRatio;
        const ratioB = viewMode === "revenue" ? b.psRatio : b.peRatio;
        return ratioA - ratioB;
      });
      return sorted;
    });
  }, [viewMode]);

  // Only fetch if no prefetched data
  useEffect(() => {
    if (hasProcessedPrefetch) return;

    const fetchData = async () => {
      try {
        const [mcResponse, revResponse] = await Promise.all([
          fetch("/api/market-caps"),
          fetch("/api/token-revenue"),
        ]);
        
        if (mcResponse.ok && revResponse.ok) {
          const mcJson = await mcResponse.json();
          const revJson = await revResponse.json();
          processData(mcJson, revJson, viewMode);
        }
      } catch {
        setDataSource("demo");
        setTokens(getFallbackTokens(viewMode));
      }
    };

    fetchData();
  }, [hasProcessedPrefetch, viewMode, processData]);

  // Get color based on ratio thresholds
  // < 1x = Cheap (green), 1-10x = Fair (yellow), > 10x = Expensive (red)
  const getRatioColor = (ratio: number) => {
    if (ratio < 1) return "text-green-400 bg-green-500/20";
    if (ratio <= 10) return "text-yellow-400 bg-yellow-500/20";
    return "text-red-400 bg-red-500/20";
  };

  return (
    <div ref={panelRef} className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full flex flex-col">
      {/* Header - Stacked on mobile */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex flex-col max-lg:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-terminal-text">
                  Token Valuation
                </h3>
                <InfoTooltip 
                  content="Compares how much revenue/earnings accrue to token holders relative to market cap. Lower ratios = potentially better value."
                  title="Valuation Metrics"
                />
                <span className={cn(
                  "px-1.5 py-0.5 text-[9px] font-bold uppercase rounded flex-shrink-0",
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
          
          {/* View Mode Tabs and Screenshot */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-terminal-dark rounded-lg p-0.5 max-lg:flex-1">
              <button
                onClick={() => setViewMode("revenue")}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-medium rounded-md transition-all max-lg:flex-1",
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
                  "px-3 py-1.5 text-[10px] font-medium rounded-md transition-all max-lg:flex-1",
                  viewMode === "earnings"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-terminal-textMuted hover:text-terminal-text"
                )}
              >
                Earnings (P/E)
              </button>
            </div>
            <ScreenshotButton targetRef={panelRef} filename="shfl-token-valuation" />
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        {/* Always render - show fallback data immediately */}
        <>
          {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                <span className="text-terminal-textMuted">Cheap (&lt;1x)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
                <span className="text-terminal-textMuted">Fair (1-10x)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                <span className="text-terminal-textMuted">Expensive (&gt;10x)</span>
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
                    {/* Market Cap - hidden on mobile */}
                    <th className="hidden lg:table-cell px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      Market Cap
                    </th>
                    {/* Annual Rev/Earnings - hidden on mobile */}
                    <th className="hidden lg:table-cell px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
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
                    {/* Accrual % - hidden on mobile */}
                    <th className="hidden lg:table-cell px-4 py-3 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        Accrual %
                        <InfoTooltip 
                          content="Percentage of revenue that goes to token holders"
                          position="bottom"
                        />
                      </div>
                    </th>
                    {/* P/S or P/E Ratio - always visible */}
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
                  {tokens.map((token) => {
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
                        {/* Market Cap - hidden on mobile */}
                        <td className="hidden lg:table-cell px-4 py-4 text-right">
                          <span className="text-sm text-terminal-text tabular-nums font-medium">
                            ${token.marketCap >= 1000000000 
                              ? (token.marketCap / 1000000000).toFixed(1) + "B"
                              : Math.round(token.marketCap / 1000000) + "M"
                            }
                          </span>
                        </td>
                        {/* Annual Rev/Earnings - hidden on mobile */}
                        <td className="hidden lg:table-cell px-4 py-4 text-right">
                          <span className="text-sm text-terminal-textSecondary tabular-nums">
                            ${formatNumber(Math.round(annualValue / 1000000))}M
                          </span>
                        </td>
                        {/* Accrual % - hidden on mobile */}
                        <td className="hidden lg:table-cell px-4 py-4 text-right">
                          <span className={cn(
                            "text-xs font-medium tabular-nums",
                            token.revenueAccrualPct >= 0.5 ? "text-green-400" : 
                            token.revenueAccrualPct >= 0.2 ? "text-yellow-400" : "text-terminal-textSecondary"
                          )}>
                            {(token.revenueAccrualPct * 100).toFixed(0)}%
                          </span>
                        </td>
                        {/* P/S or P/E Ratio - always visible */}
                        <td className="px-4 py-4 text-right">
                          <span className={cn(
                            "text-sm font-bold tabular-nums px-2.5 py-1 rounded-md",
                            getRatioColor(ratio)
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
                    ? "P/S compares market cap to total platform revenue."
                    : "P/E compares market cap to earnings accrued to holders."
                  }
                </p>
              </div>
            </div>
          </>
      </div>
    </div>
  );
}
