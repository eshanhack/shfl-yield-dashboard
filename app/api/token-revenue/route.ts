import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TokenRevenue {
  symbol: string;
  weeklyRevenue: number;
  annualRevenue: number;
  weeklyEarnings: number;
  annualEarnings: number;
  revenueAccrualPct: number;
  source: "live" | "estimated";
}

// Cache results
let cache: { data: TokenRevenue[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Fetch SHFL revenue from lottery history API
async function fetchSHFLRevenue(request: Request): Promise<TokenRevenue> {
  try {
    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    console.log("Fetching SHFL from:", `${baseUrl}/api/lottery-history`);
    
    const response = await fetch(`${baseUrl}/api/lottery-history`, {
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Lottery history response:", JSON.stringify(data.stats));
      
      if (data.stats?.avgWeeklyNGR_4week) {
        const weeklyEarnings = data.stats.avgWeeklyNGR_4week;
        const weeklyRevenue = weeklyEarnings / 0.15;
        
        return {
          symbol: "SHFL",
          weeklyRevenue,
          annualRevenue: weeklyRevenue * 52,
          weeklyEarnings,
          annualEarnings: weeklyEarnings * 52,
          revenueAccrualPct: 0.15,
          source: "live",
        };
      }
    } else {
      console.error("Lottery history failed:", response.status);
    }
  } catch (error) {
    console.error("Error fetching SHFL revenue:", error);
  }
  
  // Fallback estimate
  return {
    symbol: "SHFL",
    weeklyRevenue: 3100000,
    annualRevenue: 161200000,
    weeklyEarnings: 465000,
    annualEarnings: 24180000,
    revenueAccrualPct: 0.15,
    source: "estimated",
  };
}

// Estimated data for other tokens based on public information
function getEstimatedRevenues(): TokenRevenue[] {
  return [
    {
      // HYPE - Hyperliquid
      // Based on ~$130M annualized fees from Artemis Analytics
      // 100% accrues to token through buybacks/assistance fund
      symbol: "HYPE",
      weeklyRevenue: 2500000,
      annualRevenue: 130000000,
      weeklyEarnings: 2500000,
      annualEarnings: 130000000,
      revenueAccrualPct: 1.0,
      source: "estimated",
    },
    {
      // PUMP - Pump.fun
      // Based on ~$3M/week in token launch fees
      // 100% accrues to token through buybacks
      symbol: "PUMP",
      weeklyRevenue: 3000000,
      annualRevenue: 156000000,
      weeklyEarnings: 3000000,
      annualEarnings: 156000000,
      revenueAccrualPct: 1.0,
      source: "estimated",
    },
    {
      // RLB - Rollbit
      // Based on ~$6M/month total revenue
      // Earnings: 10% casino + 30% futures + 20% sports ≈ 17% average
      symbol: "RLB",
      weeklyRevenue: 1500000,
      annualRevenue: 78000000,
      weeklyEarnings: 255000,
      annualEarnings: 13260000,
      revenueAccrualPct: 0.17,
      source: "estimated",
    },
  ];
}

export async function GET(request: Request) {
  // Check cache first
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    const hasLive = cache.data.some(t => t.source === "live");
    return NextResponse.json({
      success: true,
      data: cache.data,
      source: hasLive ? "live" : "estimated",
      cached: true,
      cacheAge: Math.round((Date.now() - cache.timestamp) / 1000 / 60) + " minutes",
    });
  }

  try {
    // Fetch SHFL revenue (live from our own API)
    const shflData = await fetchSHFLRevenue(request);
    
    // Get estimated data for other tokens
    const otherTokens = getEstimatedRevenues();
    
    const revenues: TokenRevenue[] = [shflData, ...otherTokens];
    
    // Cache results
    cache = { data: revenues, timestamp: Date.now() };
    
    const hasLive = revenues.some(t => t.source === "live");
    
    return NextResponse.json({
      success: true,
      data: revenues,
      source: hasLive ? "live" : "estimated",
      cached: false,
      details: revenues.map(r => ({ symbol: r.symbol, source: r.source })),
    });
  } catch (error) {
    console.error("Token revenue error:", error);
    
    // Return all estimated data on error
    const fallbackData: TokenRevenue[] = [
      {
        symbol: "SHFL",
        weeklyRevenue: 3100000,
        annualRevenue: 161200000,
        weeklyEarnings: 465000,
        annualEarnings: 24180000,
        revenueAccrualPct: 0.15,
        source: "estimated",
      },
      ...getEstimatedRevenues(),
    ];
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: "estimated",
      cached: false,
      error: String(error),
    });
  }
}
