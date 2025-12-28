import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKENS = [
  { id: "shuffle-2", symbol: "SHFL" },
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "solana", symbol: "SOL" },
  { id: "rollbit-coin", symbol: "RLB" },
  { id: "hyperliquid", symbol: "HYPE" },
  { id: "pump-fun", symbol: "PUMP" },
];

interface PriceData {
  symbol: string;
  prices: [number, number][];
}

// Simple in-memory cache
const cache: Record<string, { data: PriceData[]; timestamp: number }> = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)

// Fetch a single token with timeout
async function fetchTokenWithTimeout(
  token: { id: string; symbol: string },
  baseUrl: string,
  days: string,
  apiKeyHeader: Record<string, string>,
  timeoutMs: number = 5000
): Promise<PriceData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const url = `${baseUrl}/coins/${token.id}/market_chart?vs_currency=usd&days=${days}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json", ...apiKeyHeader },
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.prices?.length > 0) {
        return { symbol: token.symbol, prices: data.prices };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return { symbol: token.symbol, prices: [] };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") || "30";
  const cacheKey = `prices_${days}`;

  // Check cache first - return immediately if valid
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      data: cached.data,
      source: "live",
      cached: true,
      lastUpdated: new Date(cached.timestamp).toISOString(),
    });
  }

  // Check for API keys
  const demoKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_DEMO_KEY;
  const proKey = process.env.COINGECKO_PRO_KEY;
  
  let baseUrl = "https://api.coingecko.com/api/v3";
  let apiKeyHeader: Record<string, string> = {};
  
  if (proKey) {
    baseUrl = "https://pro-api.coingecko.com/api/v3";
    apiKeyHeader = { "x-cg-pro-api-key": proKey };
  } else if (demoKey) {
    apiKeyHeader = { "x-cg-demo-api-key": demoKey };
  }

  // OPTIMIZATION: Fetch ALL tokens in PARALLEL with timeout
  const results = await Promise.all(
    TOKENS.map(token => fetchTokenWithTimeout(token, baseUrl, days, apiKeyHeader, 8000))
  );

  // Sort by preferred order
  const order = ["SHFL", "PUMP", "BTC", "ETH", "SOL", "RLB", "HYPE"];
  results.sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol));

  // Cache the results
  const hasData = results.some(r => r.prices.length > 0);
  if (hasData) {
    cache[cacheKey] = { data: results, timestamp: Date.now() };
  }

  return NextResponse.json({
    success: true,
    data: results,
    source: hasData ? "live" : "error",
    cached: false,
    tokensWithData: results.filter(r => r.prices.length > 0).map(r => r.symbol),
    hasApiKey: !!(demoKey || proKey),
    lastUpdated: new Date().toISOString(),
  });
}
