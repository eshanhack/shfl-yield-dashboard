"use client";

import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/calculations";

type TimePeriod = "1d" | "7d" | "30d" | "365d";

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  color: string;
}

const TOKENS: TokenData[] = [
  { id: "shuffle-2", symbol: "SHFL", name: "Shuffle", color: "#8A2BE2" },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { id: "solana", symbol: "SOL", name: "Solana", color: "#00FFA3" },
  { id: "rollbit-coin", symbol: "RLB", name: "Rollbit", color: "#FFD700" },
  { id: "hyperliquid", symbol: "HYPE", name: "Hyperliquid", color: "#00D4AA" },
  { id: "pump-fun", symbol: "PUMP", name: "Pump.fun", color: "#FF6B6B" },
];

interface PricePoint {
  timestamp: number;
  date: string;
  [key: string]: number | string;
}

// Generate placeholder returns for immediate render
const generatePlaceholderReturns = (): Record<string, number> => ({
  SHFL: 5.2, BTC: 2.1, ETH: 3.5, SOL: 8.3, RLB: -2.1, HYPE: 12.5, PUMP: 15.2
});

export default function TokenReturnsChart() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d");
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  // Start with placeholder returns for immediate render
  const [returns, setReturns] = useState<Record<string, number>>(generatePlaceholderReturns());
  const [isLoading, setIsLoading] = useState(true);
  // Default to "live" - only show "demo" on actual failure
  const [dataSource, setDataSource] = useState<"live" | "demo">("live");
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(
    new Set(TOKENS.map(t => t.symbol))
  );

  const periodDays: Record<TimePeriod, number> = {
    "1d": 1,
    "7d": 7,
    "30d": 30,
    "365d": 365,
  };

  const periodLabels: Record<TimePeriod, string> = {
    "1d": "24H",
    "7d": "7D",
    "30d": "30D",
    "365d": "1Y",
  };

  // Process data outside of useEffect for reuse
  const processData = (
    results: { token: TokenData; prices: [number, number][] }[],
    period: TimePeriod
  ) => {
    if (results.length === 0) return { chartData: [], returns: {} };
    
    const normalizedData: PricePoint[] = [];
    const startPrices: Record<string, number> = {};
    const endPrices: Record<string, number> = {};
    
    const maxLength = Math.max(...results.map(r => r.prices.length));
    const step = Math.max(1, Math.floor(maxLength / 100));
    
    for (let i = 0; i < maxLength; i += step) {
      const point: PricePoint = { timestamp: 0, date: "" };
      
      results.forEach(({ token, prices }) => {
        const scaledIndex = Math.min(
          Math.floor((i / maxLength) * prices.length),
          prices.length - 1
        );
        
        if (prices[scaledIndex]) {
          const [timestamp, price] = prices[scaledIndex];
          if (!point.timestamp) {
            point.timestamp = timestamp;
            point.date = new Date(timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: period === "1d" ? "numeric" : undefined,
            });
          }
          
          if (i === 0) startPrices[token.symbol] = price;
          if (i >= maxLength - step) endPrices[token.symbol] = price;
          
          const startPrice = startPrices[token.symbol] || price;
          point[token.symbol] = ((price - startPrice) / startPrice) * 100;
        }
      });
      
      if (point.timestamp) normalizedData.push(point);
    }
    
    const finalReturns: Record<string, number> = {};
    TOKENS.forEach(token => {
      const start = startPrices[token.symbol];
      const end = endPrices[token.symbol];
      if (start && end) finalReturns[token.symbol] = ((end - start) / start) * 100;
    });
    
    return { chartData: normalizedData, returns: finalReturns };
  };

  useEffect(() => {
    const fetchPriceData = async () => {
      setIsLoading(true);
      
      // Retry helper with timeout
      const fetchWithRetry = async (url: string, retries = 2, timeout = 30000) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) return response;
          } catch {
            if (attempt === retries) throw new Error(`Failed after ${retries + 1} attempts`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        throw new Error("All retries failed");
      };

      try {
        const days = periodDays[timePeriod];
        const response = await fetchWithRetry(`/api/token-prices?days=${days}`, 2, 30000);
        
        const json = await response.json();
        if (!json.success) throw new Error("API returned error");
        
        // Consider live if any token has data
        const hasAnyData = json.data?.some((item: any) => item.prices?.length > 0);
        setDataSource(hasAnyData ? "live" : "demo");
        
        const results = json.data
          .map((item: { symbol: string; prices: [number, number][] }) => {
            const token = TOKENS.find(t => t.symbol === item.symbol) || TOKENS[0];
            return { token, prices: item.prices };
          })
          .filter((r: { token: TokenData; prices: [number, number][] }) => r.prices.length > 0);
        
        const { chartData: newChartData, returns: newReturns } = processData(results, timePeriod);
        setChartData(newChartData);
        if (Object.keys(newReturns).length > 0) setReturns(newReturns);
      } catch {
        // Only show "demo" on actual failure
        setDataSource("demo");
      }
      setIsLoading(false);
    };

    fetchPriceData();
  }, [timePeriod]);

  const toggleToken = (symbol: string) => {
    setVisibleTokens(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3 shadow-xl">
        <div className="text-xs text-terminal-textMuted mb-2">{label}</div>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
              <span style={{ color: entry.color }}>{entry.dataKey}</span>
              <span className={cn(
                "font-medium",
                entry.value >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {entry.value >= 0 ? "+" : ""}{entry.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Sort tokens by return for the legend
  const sortedTokens = useMemo(() => {
    return [...TOKENS].sort((a, b) => (returns[b.symbol] || 0) - (returns[a.symbol] || 0));
  }, [returns]);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow h-full">
      {/* Header - Stacked on mobile */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex flex-col max-lg:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
              <LineChart className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-terminal-text">
                  Token Returns Comparison
                </h3>
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
                SHFL vs major tokens performance
              </p>
            </div>
          </div>
          
          {/* Time Period Selector - Full width on mobile, wrap buttons */}
          <div className="flex items-center gap-1 bg-terminal-dark rounded-lg p-0.5 max-lg:w-full max-lg:justify-center">
            {(["1d", "7d", "30d", "365d"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={cn(
                  "px-2.5 max-lg:px-3 max-lg:flex-1 py-1 text-[10px] font-medium rounded-md transition-all",
                  timePeriod === period
                    ? "bg-terminal-accent/20 text-terminal-accent"
                    : "text-terminal-textMuted hover:text-terminal-text"
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Returns Summary */}
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
          {sortedTokens.map((token, index) => {
            const returnVal = returns[token.symbol] || 0;
            const isVisible = visibleTokens.has(token.symbol);
            // Medal for top 3 performers
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
            return (
              <button
                key={token.symbol}
                onClick={() => toggleToken(token.symbol)}
                className={cn(
                  "p-2 rounded-lg border transition-all text-left relative",
                  token.symbol === "SHFL" 
                    ? isVisible
                      ? "bg-terminal-accent/10 border-terminal-accent"
                      : "bg-terminal-accent/5 border-terminal-accent/30 opacity-50"
                    : isVisible 
                      ? "bg-terminal-dark border-terminal-border" 
                      : "bg-terminal-dark/50 border-terminal-border/50 opacity-50"
                )}
              >
                {/* Medal badge */}
                {medal && (
                  <span className="absolute -top-1 -right-1 text-xs">
                    {medal}
                  </span>
                )}
                <div className="flex items-center gap-1.5 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: token.color }}
                  />
                  <span className="text-[10px] font-medium text-terminal-text">
                    {token.symbol}
                  </span>
                </div>
                <div className={cn(
                  "text-sm font-bold tabular-nums flex items-center gap-1",
                  returnVal >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                )}>
                  {returnVal >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {returnVal >= 0 ? "+" : ""}{returnVal.toFixed(1)}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-[260px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(0)}%`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                {TOKENS.filter(t => visibleTokens.has(t.symbol)).map((token) => (
                  <Line
                    key={token.symbol}
                    type="monotone"
                    dataKey={token.symbol}
                    stroke={token.color}
                    strokeWidth={token.symbol === "SHFL" ? 3 : 1.5}
                    dot={false}
                    activeDot={{ r: 4, fill: token.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

