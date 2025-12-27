import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// All tokens use CoinGecko
const TOKENS = [
  { id: "shuffle-2", symbol: "SHFL" },
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "solana", symbol: "SOL" },
  { id: "rollbit-coin", symbol: "RLB" },
  { id: "hyperliquid", symbol: "HYPE" },
];

interface PriceData {
  symbol: string;
  prices: [number, number][];
}

// Simple in-memory cache
const cache: Record<string, { data: PriceData[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        // Rate limited, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error("Max retries reached");
}

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
  const apiKey = process.env.COINGECKO_API_KEY;
  
  // Build base URL - use pro API if key available
  const baseUrl = apiKey 
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";

  // Fetch tokens sequentially to avoid rate limits
  for (const token of TOKENS) {
    try {
      const url = `${baseUrl}/coins/${token.id}/market_chart?vs_currency=usd&days=${days}`;
      const headers: Record<string, string> = {
        "Accept": "application/json",
      };
      
      if (apiKey) {
        headers["x-cg-pro-api-key"] = apiKey;
      }

      const response = await fetchWithRetry(url, { headers, cache: "no-store" });

      if (response.ok) {
        const data = await response.json();
        if (data.prices && data.prices.length > 0) {
          results.push({
            symbol: token.symbol,
            prices: data.prices,
          });
          console.log(`✓ Fetched ${token.symbol}: ${data.prices.length} points`);
        } else {
          console.log(`✗ No price data for ${token.symbol}`);
          results.push({ symbol: token.symbol, prices: [] });
        }
      } else {
        console.log(`✗ Failed ${token.symbol}: ${response.status}`);
        results.push({ symbol: token.symbol, prices: [] });
      }
    } catch (error) {
      console.error(`✗ Error fetching ${token.symbol}:`, error);
      results.push({ symbol: token.symbol, prices: [] });
    }

    // Delay between requests to avoid rate limiting (unless we have API key)
    if (!apiKey) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Sort by preferred order
  const order = ["SHFL", "BTC", "ETH", "SOL", "RLB", "HYPE"];
  results.sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol));

  // Cache the results
  cache[cacheKey] = { data: results, timestamp: Date.now() };

  const hasData = results.some(r => r.prices.length > 0);

  return NextResponse.json({
    success: true,
    data: results,
    source: hasData ? "live" : "error",
    cached: false,
    tokensWithData: results.filter(r => r.prices.length > 0).map(r => r.symbol),
    lastUpdated: new Date().toISOString(),
  });
}
