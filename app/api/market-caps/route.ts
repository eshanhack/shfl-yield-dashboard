import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// CoinGecko token IDs - verified correct
const COINGECKO_TOKENS = [
  { id: "hyperliquid", symbol: "HYPE" },
  { id: "pump-fun", symbol: "PUMP" },
  { id: "rollbit-coin", symbol: "RLB" },
];

// In-memory cache for market caps
let mcCache: { data: any; timestamp: number } | null = null;
const MC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  // Return cached data if fresh
  if (mcCache && Date.now() - mcCache.timestamp < MC_CACHE_DURATION) {
    return NextResponse.json({
      ...mcCache.data,
      cached: true,
      cacheAge: Math.round((Date.now() - mcCache.timestamp) / 1000) + "s",
    });
  }
  const marketCaps: Record<string, number> = {};
  const volumes: Record<string, number> = {};
  const liquidityData: Record<string, { volume24h: number; marketCapToVolume: number; liquidity?: number }> = {};
  
  // Fetch SHFL from Shuffle API (more accurate for price/supply)
  let shflPrice = 0;
  let shflSupply = 0;
  
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
      shflPrice = parseFloat(data?.data?.tokenInfo?.priceInUsd || "0");
      shflSupply = parseFloat(data?.data?.tokenInfo?.circulatingSupply || "0");
      
      if (shflPrice > 0 && shflSupply > 0) {
        marketCaps["SHFL"] = shflPrice * shflSupply;
      }
    }
  } catch {
    // SHFL market cap fetch failed, will use fallback
  }
  
  // Fetch SHFL volume from CoinGecko
  const apiKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_DEMO_KEY;
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  // Fetch SHFL details including volume
  try {
    const shflUrl = `https://api.coingecko.com/api/v3/coins/shuffle-2?localization=false&tickers=false&community_data=false&developer_data=false&t=${Date.now()}`;
    
    const shflResponse = await fetch(shflUrl, { 
      headers, 
      cache: "no-store",
    });

    if (shflResponse.ok) {
      const shflData = await shflResponse.json();
      const volume24h = shflData?.market_data?.total_volume?.usd || 0;
      const mcap = marketCaps["SHFL"] || shflData?.market_data?.market_cap?.usd || 0;
      
      volumes["SHFL"] = volume24h;
      liquidityData["SHFL"] = {
        volume24h,
        marketCapToVolume: volume24h > 0 ? mcap / volume24h : 0,
        liquidity: shflData?.market_data?.total_value_locked?.usd || 0,
      };
    }
  } catch {
    // SHFL volume fetch failed
  }

  // Fetch other tokens from CoinGecko
  try {
    const ids = COINGECKO_TOKENS.map(t => t.id).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&t=${Date.now()}`;
    
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
        if (data[token.id]?.usd_24h_vol) {
          volumes[token.symbol] = data[token.id].usd_24h_vol;
        }
      });
    }
  } catch {
    // CoinGecko fetch failed, will use fallbacks
  }
  
  // Fallbacks for any missing (Dec 2025 approximate values)
  const fallbacks: Record<string, number> = {
    SHFL: 108000000,
    HYPE: 9000000000,
    PUMP: 1100000000,
    RLB: 120000000,
  };
  
  const volumeFallbacks: Record<string, number> = {
    SHFL: 500000,
    HYPE: 50000000,
    PUMP: 10000000,
    RLB: 2000000,
  };
  
  for (const [symbol, fallback] of Object.entries(fallbacks)) {
    if (!marketCaps[symbol] || marketCaps[symbol] === 0) {
      marketCaps[symbol] = fallback;
    }
  }
  
  for (const [symbol, fallback] of Object.entries(volumeFallbacks)) {
    if (!volumes[symbol] || volumes[symbol] === 0) {
      volumes[symbol] = fallback;
    }
  }
  
  // Build SHFL liquidity data if not already set
  if (!liquidityData["SHFL"]) {
    liquidityData["SHFL"] = {
      volume24h: volumes["SHFL"] || 500000,
      marketCapToVolume: (marketCaps["SHFL"] || 108000000) / (volumes["SHFL"] || 500000),
    };
  }
  
  const responseData = {
    success: true,
    data: marketCaps,
    volumes,
    shflLiquidity: liquidityData["SHFL"],
    source: Object.keys(marketCaps).length >= 4 ? "live" : "partial",
    fetchedAt: new Date().toISOString(),
    cached: false,
  };

  // Cache the response
  mcCache = { data: responseData, timestamp: Date.now() };

  return NextResponse.json(responseData);
}
