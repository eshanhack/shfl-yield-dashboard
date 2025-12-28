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

// Fetch from dedicated scraper server
async function fetchFromScraper(): Promise<TokenRevenue[] | null> {
  const scraperUrl = process.env.SCRAPER_URL;
  
  if (!scraperUrl) {
    console.log("No SCRAPER_URL configured, using estimates");
    return null;
  }
  
  try {
    console.log("Fetching from scraper:", scraperUrl);
    
    const response = await fetch(`${scraperUrl}/api/revenue`, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Scraper response not ok:", response.status);
      return null;
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      console.log("Scraper returned data:", result.data.length, "tokens");
      return result.data;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching from scraper:", error);
    return null;
  }
}

// Estimated data for other tokens based on verified Dec 2025 data
function getEstimatedRevenues(): TokenRevenue[] {
  // User verified: PUMP $33M/month, RLB $19.14M/month
  return [
    {
      // HYPE - Hyperliquid (Dec 2025)
      // ~$20M/week from DeFi revenue reports
      // 54% accrues to token through buybacks/assistance fund
      symbol: "HYPE",
      weeklyRevenue: 20000000,
      annualRevenue: 1040000000,
      weeklyEarnings: 20000000 * 0.54,
      annualEarnings: 1040000000 * 0.54,
      revenueAccrualPct: 0.54,
      source: "estimated",
    },
    {
      // PUMP - Pump.fun (Dec 2025)
      // User verified: $33M last 30 days from fees.pump.fun
      // 100% accrues to token through buybacks
      symbol: "PUMP",
      weeklyRevenue: 33000000 / 4.33,
      annualRevenue: 33000000 * 12, // $396M
      weeklyEarnings: 33000000 / 4.33,
      annualEarnings: 33000000 * 12,
      revenueAccrualPct: 1.0,
      source: "estimated",
    },
    {
      // RLB - Rollbit (Dec 2025)
      // User verified: $19.14M last 30 days from rollbit.com/rlb/buy-and-burn
      // Earnings: 10% casino + 30% futures + 20% sports ≈ 17% average
      symbol: "RLB",
      weeklyRevenue: 19137445 / 4.33,
      annualRevenue: 19137445 * 12, // $229.6M
      weeklyEarnings: 19137445 / 4.33 * 0.17,
      annualEarnings: 19137445 * 12 * 0.17, // ~$39M
      revenueAccrualPct: 0.17,
      source: "estimated",
    },
  ];
}

export async function GET(request: Request) {
  // Check cache first
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    const liveCount = cache.data.filter(t => t.source === "live").length;
    return NextResponse.json({
      success: true,
      data: cache.data,
      source: liveCount > 0 ? "live" : "estimated",
      liveCount: `${liveCount}/${cache.data.length}`,
      cached: true,
      cacheAge: Math.round((Date.now() - cache.timestamp) / 1000 / 60) + " minutes",
    });
  }

  try {
    // Fetch SHFL revenue (live from our own API)
    const shflData = await fetchSHFLRevenue(request);
    
    // Try to get live data from scraper for other tokens
    const scraperData = await fetchFromScraper();
    
    let revenues: TokenRevenue[];
    
    if (scraperData && scraperData.length > 0) {
      // Use scraper data for PUMP, RLB, HYPE
      revenues = [
        shflData,
        ...scraperData.filter(t => t.symbol !== "SHFL"),
      ];
    } else {
      // Fall back to estimates
      revenues = [shflData, ...getEstimatedRevenues()];
    }
    
    // Cache results
    cache = { data: revenues, timestamp: Date.now() };
    
    const liveCount = revenues.filter(t => t.source === "live").length;
    
    return NextResponse.json({
      success: true,
      data: revenues,
      source: liveCount > 0 ? "live" : "estimated",
      liveCount: `${liveCount}/${revenues.length}`,
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
      liveCount: "0/4",
      cached: false,
      error: String(error),
    });
  }
}
