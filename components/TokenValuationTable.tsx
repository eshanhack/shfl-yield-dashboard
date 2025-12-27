"use client";

import { useState, useEffect, useMemo } from "react";
import { Scale, TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/calculations";
import InfoTooltip from "./InfoTooltip";
import CurrencyAmount from "./CurrencyAmount";

type TimePeriod = "7d" | "30d" | "90d" | "365d";

interface TokenMetrics {
  id: string;
  symbol: string;
  name: string;
  color: string;
  marketCap: number;
  weeklyRevenue: number; // Revenue that accrues to token per week
  weeklyEarnings: number; // Earnings (profit) that accrues to token per week
  fdv?: number;
}

// Token data with estimated revenue/earnings accrual
// These are estimates based on public information about tokenomics
const TOKEN_DATA: TokenMetrics[] = [
  {
    id: "shuffle-2",
    symbol: "SHFL",
    name: "Shuffle",
    color: "#8A2BE2",
    marketCap: 0, // Will be fetched
    weeklyRevenue: 600000, // ~15% of NGR goes to lottery (stakers)
    weeklyEarnings: 600000, // Most revenue = earnings for stakers
  },
  {
    id: "hyperliquid",
    symbol: "HYPE",
    name: "Hyperliquid",
    color: "#00D4AA",
    marketCap: 0,
    weeklyRevenue: 2000000, // Estimated weekly fees
    weeklyEarnings: 1500000, // After costs
  },
  {
    id: "pump-fun",
    symbol: "PUMP",
    name: "Pump.fun",
    color: "#FF6B6B",
    marketCap: 0,
    weeklyRevenue: 3000000, // Estimated from token launches
    weeklyEarnings: 2500000,
  },
  {
    id: "rollbit-coin",
    symbol: "RLB",
    name: "Rollbit",
    color: "#FFD700",
    marketCap: 0,
    weeklyRevenue: 800000, // Estimated lottery/buybacks
    weeklyEarnings: 600000,
  },
];

interface TokenWithRatios extends TokenMetrics {
  revToMcap: number;
  earningsToMcap: number;
  annualizedRev: number;
  annualizedEarnings: number;
  peRatio: number;
  psRatio: number;
}

export default function TokenValuationTable() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("365d");
  const [tokens, setTokens] = useState<TokenWithRatios[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const periodMultiplier: Record<TimePeriod, number> = {
    "7d": 1,
    "30d": 4.33,
    "90d": 13,
    "365d": 52,
  };

  const periodLabels: Record<TimePeriod, string> = {
    "7d": "Weekly",
    "30d": "Monthly",
    "90d": "Quarterly",
    "365d": "Annual",
  };

  useEffect(() => {
    const fetchMarketCaps = async () => {
      setIsLoading(true);
      try {
        // Fetch market caps from CoinGecko
        const ids = TOKEN_DATA.map(t => t.id).join(",");
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currency=usd&include_market_cap=true`
        );
        
        let marketCaps: Record<string, number> = {};
        
        if (response.ok) {
          const data = await response.json();
          TOKEN_DATA.forEach(token => {
            if (data[token.id]) {
              marketCaps[token.symbol] = data[token.id].usd_market_cap || 0;
            }
          });
        }
        
        // Calculate ratios
        const multiplier = periodMultiplier[timePeriod];
        const tokensWithRatios: TokenWithRatios[] = TOKEN_DATA.map(token => {
          const mcap = marketCaps[token.symbol] || token.marketCap || 100000000; // Fallback
          const periodRevenue = token.weeklyRevenue * multiplier;
          const periodEarnings = token.weeklyEarnings * multiplier;
          const annualizedRev = token.weeklyRevenue * 52;
          const annualizedEarnings = token.weeklyEarnings * 52;
          
          return {
            ...token,
            marketCap: mcap,
            revToMcap: mcap > 0 ? mcap / periodRevenue : 0,
            earningsToMcap: mcap > 0 ? mcap / periodEarnings : 0,
            annualizedRev,
            annualizedEarnings,
            peRatio: mcap > 0 ? mcap / annualizedEarnings : 0, // P/E
            psRatio: mcap > 0 ? mcap / annualizedRev : 0, // P/S
          };
        });
        
        // Sort by P/E ratio (lower = better)
        tokensWithRatios.sort((a, b) => a.peRatio - b.peRatio);
        
        setTokens(tokensWithRatios);
      } catch (error) {
        console.error("Error fetching market caps:", error);
      }
      setIsLoading(false);
    };

    fetchMarketCaps();
  }, [timePeriod]);

  // Get color based on ratio (lower = greener = cheaper)
  const getRatioColor = (ratio: number, allRatios: number[]) => {
    const min = Math.min(...allRatios);
    const max = Math.max(...allRatios);
    const normalized = (ratio - min) / (max - min || 1);
    
    if (normalized <= 0.25) return "text-green-400 bg-green-500/20";
    if (normalized <= 0.5) return "text-emerald-400 bg-emerald-500/20";
    if (normalized <= 0.75) return "text-yellow-400 bg-yellow-500/20";
    return "text-red-400 bg-red-500/20";
  };

  const peRatios = tokens.map(t => t.peRatio);
  const psRatios = tokens.map(t => t.psRatio);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-terminal-text">
                  Token Valuation Comparison
                </h3>
                <InfoTooltip 
                  content="Compares how much revenue and earnings accrue to token holders relative to market cap. Lower ratios = potentially undervalued."
                  title="Valuation Metrics"
                />
              </div>
              <p className="text-[10px] text-terminal-textMuted">
                Revenue & earnings accrual to token holders
              </p>
            </div>
          </div>
          
          {/* Time Period Selector */}
          <div className="flex items-center gap-1 bg-terminal-dark rounded-lg p-0.5">
            {(["7d", "30d", "90d", "365d"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                  timePeriod === period
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-terminal-textMuted hover:text-terminal-text"
                )}
              >
                {period === "365d" ? "1Y" : period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="h-[250px] flex items-center justify-center">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="px-3 py-2 text-left text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      Token
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      Market Cap
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        {periodLabels[timePeriod]} Rev
                        <InfoTooltip 
                          content="Estimated revenue that accrues to token holders in the selected period"
                          position="top"
                        />
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        P/S Ratio
                        <InfoTooltip 
                          content="Price to Sales - Market Cap divided by annualized revenue. Lower = potentially undervalued."
                          position="top"
                        />
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] text-terminal-textSecondary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1 justify-end">
                        P/E Ratio
                        <InfoTooltip 
                          content="Price to Earnings - Market Cap divided by annualized earnings accrued to token. Lower = potentially undervalued."
                          position="top"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token, index) => (
                    <tr 
                      key={token.symbol}
                      className={cn(
                        "border-b border-terminal-border/50 transition-colors",
                        token.symbol === "SHFL" && "bg-terminal-accent/5",
                        "hover:bg-terminal-accent/10"
                      )}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: token.color }}
                          />
                          <div>
                            <span className="text-sm font-medium text-terminal-text">
                              {token.symbol}
                            </span>
                            {token.symbol === "SHFL" && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-terminal-accent/20 text-terminal-accent">
                                YOU
                              </span>
                            )}
                            {index === 0 && (
                              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                BEST VALUE
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-terminal-text tabular-nums">
                          ${formatNumber(Math.round(token.marketCap / 1000000))}M
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-terminal-textSecondary tabular-nums">
                          ${formatNumber(Math.round(token.weeklyRevenue * periodMultiplier[timePeriod]))}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn(
                          "text-sm font-medium tabular-nums px-2 py-0.5 rounded",
                          getRatioColor(token.psRatio, psRatios)
                        )}>
                          {token.psRatio.toFixed(1)}x
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn(
                          "text-sm font-medium tabular-nums px-2 py-0.5 rounded",
                          getRatioColor(token.peRatio, peRatios)
                        )}>
                          {token.peRatio.toFixed(1)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Info Note */}
            <div className="mt-4 pt-3 border-t border-terminal-border">
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-terminal-textMuted mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-terminal-textMuted leading-relaxed">
                  Revenue estimates based on public tokenomics and on-chain data. 
                  Lower P/E and P/S ratios indicate potentially better value relative to earnings/revenue accrual.
                  SHFL stakers receive 15% of Shuffle.com NGR through the lottery.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

