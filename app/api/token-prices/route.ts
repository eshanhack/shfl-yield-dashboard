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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") || "30";
  const cacheKey = `prices_${days}`;

  // Check cache first
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

  const results: PriceData[] = [];
  
  // Check for API keys (support both Demo and Pro)
  const demoKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_DEMO_KEY;
  const proKey = process.env.COINGECKO_PRO_KEY;
  
  // Determine which API to use
  let baseUrl = "https://api.coingecko.com/api/v3";
  let apiKeyHeader: Record<string, string> = {};
  
  if (proKey) {
    baseUrl = "https://pro-api.coingecko.com/api/v3";
    apiKeyHeader = { "x-cg-pro-api-key": proKey };
    console.log("Using CoinGecko Pro API");
  } else if (demoKey) {
    baseUrl = "https://api.coingecko.com/api/v3";
    apiKeyHeader = { "x-cg-demo-api-key": demoKey };
    console.log("Using CoinGecko Demo API with key");
  } else {
    console.log("Using CoinGecko public API (no key)");
  }

  // Fetch tokens sequentially to avoid rate limits
  for (const token of TOKENS) {
    try {
      const url = `${baseUrl}/coins/${token.id}/market_chart?vs_currency=usd&days=${days}`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          ...apiKeyHeader,
        },
        cache: "no-store",
      });

      console.log(`${token.symbol}: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        if (data.prices && data.prices.length > 0) {
          results.push({
            symbol: token.symbol,
            prices: data.prices,
          });
        } else {
          results.push({ symbol: token.symbol, prices: [] });
        }
      } else {
        const errorText = await response.text();
        console.error(`Failed ${token.symbol}: ${response.status} - ${errorText}`);
        results.push({ symbol: token.symbol, prices: [] });
      }
    } catch (error) {
      console.error(`Error fetching ${token.symbol}:`, error);
      results.push({ symbol: token.symbol, prices: [] });
    }

    // Small delay between requests (shorter if we have API key)
    const delay = (demoKey || proKey) ? 100 : 400;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

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
