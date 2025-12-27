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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") || "30";

  try {
    // Fetch all token prices in parallel with delays to avoid rate limits
    const results: PriceData[] = [];
    
    for (const token of TOKENS) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${token.id}/market_chart?vs_currency=usd&days=${days}`,
          {
            headers: {
              "Accept": "application/json",
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.push({
            symbol: token.symbol,
            prices: data.prices || [],
          });
        } else {
          console.error(`Failed to fetch ${token.symbol}: ${response.status}`);
          results.push({ symbol: token.symbol, prices: [] });
        }
      } catch (error) {
        console.error(`Error fetching ${token.symbol}:`, error);
        results.push({ symbol: token.symbol, prices: [] });
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      data: results,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch token prices",
      data: [],
    });
  }
}

