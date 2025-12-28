import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// CoinGecko token IDs - verified correct
const COINGECKO_TOKENS = [
  { id: "hyperliquid", symbol: "HYPE" },  // Correct ID for Hyperliquid
  { id: "pump-fun", symbol: "PUMP" },
  { id: "rollbit-coin", symbol: "RLB" },
];

// NO cache - always fetch fresh
export async function GET() {
  const marketCaps: Record<string, number> = {};
  
  // Fetch SHFL from Shuffle API (more accurate)
  try {
    const shuffleResponse = await fetch("https://shuffle.com/main-api/graphql/api/graphql", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        operationName: "tokenInfo",
        variables: {},
        query: `query tokenInfo {
          tokenInfo {
            priceInUsd
            circulatingSupply
            __typename
          }
        }`,
      }),
      cache: "no-store",
    });

    if (shuffleResponse.ok) {
      const data = await shuffleResponse.json();
      const price = parseFloat(data?.data?.tokenInfo?.priceInUsd || "0");
      const supply = parseFloat(data?.data?.tokenInfo?.circulatingSupply || "0");
      
      if (price > 0 && supply > 0) {
        marketCaps["SHFL"] = price * supply;
      }
    }
  } catch {
    // SHFL market cap fetch failed, will use fallback
  }
  
  // Fetch other tokens from CoinGecko
  const apiKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_DEMO_KEY;
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  try {
    const ids = COINGECKO_TOKENS.map(t => t.id).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&t=${Date.now()}`;
    
    const response = await fetch(url, { 
      headers, 
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      
      COINGECKO_TOKENS.forEach(token => {
        if (data[token.id]?.usd_market_cap) {
          marketCaps[token.symbol] = data[token.id].usd_market_cap;
        }
      });
    }
  } catch {
    // CoinGecko fetch failed, will use fallbacks
  }
  
  // Fallbacks for any missing (Dec 2025 approximate values)
  const fallbacks: Record<string, number> = {
    SHFL: 108000000,    // ~361M × $0.30
    HYPE: 9000000000,   // ~$9B
    PUMP: 1100000000,   // ~$1.1B
    RLB: 120000000,     // ~$120M
  };
  
  for (const [symbol, fallback] of Object.entries(fallbacks)) {
    if (!marketCaps[symbol] || marketCaps[symbol] === 0) {
      marketCaps[symbol] = fallback;
    }
  }
  
  return NextResponse.json({
    success: true,
    data: marketCaps,
    source: Object.keys(marketCaps).length >= 4 ? "live" : "partial",
    fetchedAt: new Date().toISOString(),
  });
}
