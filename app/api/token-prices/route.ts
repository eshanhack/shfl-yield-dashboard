import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

// Generate mock price data for fallback
function generateMockPrices(days: number, symbol: string): [number, number][] {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const points: [number, number][] = [];
  
  // Different base prices and volatility for each token
  const config: Record<string, { base: number; volatility: number; trend: number }> = {
    SHFL: { base: 0.30, volatility: 0.08, trend: 0.02 },
    BTC: { base: 95000, volatility: 0.04, trend: 0.01 },
    ETH: { base: 3400, volatility: 0.05, trend: 0.005 },
    SOL: { base: 190, volatility: 0.07, trend: 0.015 },
    RLB: { base: 0.10, volatility: 0.10, trend: -0.01 },
    HYPE: { base: 25, volatility: 0.12, trend: 0.03 },
  };
  
  const { base, volatility, trend } = config[symbol] || { base: 1, volatility: 0.05, trend: 0 };
  
  // Generate hourly data points
  const totalPoints = Math.min(days * 24, 720); // Max 720 points (30 days hourly)
  const interval = (days * msPerDay) / totalPoints;
  
  let price = base * (1 - trend * days / 30); // Start price based on trend
  
  for (let i = 0; i <= totalPoints; i++) {
    const timestamp = now - (totalPoints - i) * interval;
    // Random walk with trend
    const change = (Math.random() - 0.48) * volatility * base / 10;
    price = Math.max(price * 0.5, price + change + (trend * base / totalPoints));
    points.push([timestamp, price]);
  }
  
  return points;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const results: PriceData[] = [];
  let usedMock = false;

  // Try to fetch real data first
  for (const token of TOKENS) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${token.id}/market_chart?vs_currency=usd&days=${days}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "SHFLPro Dashboard",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.prices && data.prices.length > 0) {
          results.push({
            symbol: token.symbol,
            prices: data.prices,
          });
          continue;
        }
      }
      
      // If API fails, use mock data
      console.log(`Using mock data for ${token.symbol} (API status: ${response.status})`);
      results.push({
        symbol: token.symbol,
        prices: generateMockPrices(days, token.symbol),
      });
      usedMock = true;
      
    } catch (error) {
      console.error(`Error fetching ${token.symbol}:`, error);
      results.push({
        symbol: token.symbol,
        prices: generateMockPrices(days, token.symbol),
      });
      usedMock = true;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // If all failed, generate all mock data
  if (results.every(r => r.prices.length === 0)) {
    console.log("All API calls failed, using full mock data");
    for (const token of TOKENS) {
      const existing = results.find(r => r.symbol === token.symbol);
      if (existing) {
        existing.prices = generateMockPrices(days, token.symbol);
      }
    }
    usedMock = true;
  }

  return NextResponse.json({
    success: true,
    data: results,
    source: usedMock ? "mock" : "coingecko",
    lastUpdated: new Date().toISOString(),
  });
}
