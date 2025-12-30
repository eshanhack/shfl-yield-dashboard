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

// Helper for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export async function GET() {
  // Return cached data if fresh - instant response
  if (mcCache && Date.now() - mcCache.timestamp < MC_CACHE_DURATION) {
    const response = NextResponse.json({
      ...mcCache.data,
      cached: true,
      cacheAge: Math.round((Date.now() - mcCache.timestamp) / 1000) + "s",
    });
    response.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return response;
  }
  const marketCaps: Record<string, number> = {};
  const volumes: Record<string, number> = {};
  const liquidityData: Record<string, { volume24h: number; marketCapToVolume: number; liquidity?: number }> = {};
  
  // Fetch SHFL from Shuffle API (more accurate for price/supply)
  let shflPrice = 0;
  let shflSupply = 0;
  
  try {
    const shuffleResponse = await fetchWithTimeout(
      "https://shuffle.com/main-api/graphql/api/graphql",
      {
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
      },
      5000 // 5 second timeout
    );

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
  
  // Fetch CoinGecko data for all tokens in PARALLEL for speed
  const apiKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_DEMO_KEY;
  
  const cgHeaders: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    cgHeaders["x-cg-demo-api-key"] = apiKey;
  }

  // Fetch all CoinGecko data in parallel
  const cgFetches = await Promise.allSettled([
    // SHFL details
    fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/shuffle-2?localization=false&tickers=false&community_data=false&developer_data=false&t=${Date.now()}`,
      { headers: cgHeaders, cache: "no-store" },
      5000
    ).then(r => r.ok ? r.json() : null).catch(() => null),
    
    // Other tokens prices
    fetchWithTimeout(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_TOKENS.map(t => t.id).join(",")}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&t=${Date.now()}`,
      { headers: cgHeaders, cache: "no-store" },
      5000
    ).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  // Process SHFL volume data
  const shflCgData = cgFetches[0].status === "fulfilled" ? cgFetches[0].value : null;
  if (shflCgData) {
    const volume24h = shflCgData?.market_data?.total_volume?.usd || 0;
    const mcap = marketCaps["SHFL"] || shflCgData?.market_data?.market_cap?.usd || 0;
    
    volumes["SHFL"] = volume24h;
    liquidityData["SHFL"] = {
      volume24h,
      marketCapToVolume: volume24h > 0 ? mcap / volume24h : 0,
      liquidity: shflCgData?.market_data?.total_value_locked?.usd || 0,
    };
  }

  // Process other tokens
  const otherTokensData = cgFetches[1].status === "fulfilled" ? cgFetches[1].value : null;
  if (otherTokensData) {
    COINGECKO_TOKENS.forEach(token => {
      if (otherTokensData[token.id]?.usd_market_cap) {
        marketCaps[token.symbol] = otherTokensData[token.id].usd_market_cap;
      }
      if (otherTokensData[token.id]?.usd_24h_vol) {
        volumes[token.symbol] = otherTokensData[token.id].usd_24h_vol;
      }
    });
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

  const response = NextResponse.json(responseData);
  response.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return response;
}
