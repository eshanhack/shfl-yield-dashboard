import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKENS = [
  { id: "shuffle-2", symbol: "SHFL" },
  { id: "hyperliquid", symbol: "HYPE" },
  { id: "pump-fun", symbol: "PUMP" },
  { id: "rollbit-coin", symbol: "RLB" },
];

// Cache
let cache: { data: Record<string, number>; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      data: cache.data,
      source: "live",
      cached: true,
    });
  }

  const marketCaps: Record<string, number> = {};
  
  const demoKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_DEMO_KEY;
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (demoKey) {
    headers["x-cg-demo-api-key"] = demoKey;
  }

  try {
    const ids = TOKENS.map(t => t.id).join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currency=usd&include_market_cap=true`,
      { headers, cache: "no-store" }
    );

    if (response.ok) {
      const data = await response.json();
      TOKENS.forEach(token => {
        if (data[token.id]) {
          marketCaps[token.symbol] = data[token.id].usd_market_cap || 0;
        }
      });
      
      // Cache successful response
      cache = { data: marketCaps, timestamp: Date.now() };
      
      return NextResponse.json({
        success: true,
        data: marketCaps,
        source: "live",
        cached: false,
      });
    }
  } catch (error) {
    console.error("Error fetching market caps:", error);
  }

  // Fallback data
  return NextResponse.json({
    success: true,
    data: {
      SHFL: 110000000,
      HYPE: 8500000000,
      PUMP: 500000000,
      RLB: 85000000,
    },
    source: "fallback",
    cached: false,
  });
}

