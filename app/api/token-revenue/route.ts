import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TokenRevenue {
  symbol: string;
  weeklyRevenue: number;
  revenueAccrualPct: number;
  source: "live" | "estimated";
}

// Cache
let cache: { data: TokenRevenue[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Fetch SHFL revenue from our lottery history
async function fetchSHFLRevenue(): Promise<{ revenue: number; source: "live" | "estimated" }> {
  try {
    const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/lottery-history`);
    if (response.ok) {
      const data = await response.json();
      if (data.stats?.avgWeeklyNGR_4week) {
        // This is the lottery NGR (15% of total)
        // Total Shuffle.com NGR = lottery NGR / 0.15
        const lotteryNGR = data.stats.avgWeeklyNGR_4week;
        const totalNGR = lotteryNGR / 0.15;
        return { revenue: totalNGR, source: "live" };
      }
    }
  } catch (error) {
    console.error("Error fetching SHFL revenue:", error);
  }
  return { revenue: 2000000, source: "estimated" };
}

// Fetch PUMP revenue from fees.pump.fun
async function fetchPUMPRevenue(): Promise<{ revenue: number; source: "live" | "estimated" }> {
  try {
    // Try to fetch from pump.fun API (they may have a public endpoint)
    const response = await fetch("https://frontend-api-v3.pump.fun/stats", {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      // Check if there's revenue data in the response
      if (data.total_revenue || data.weekly_revenue) {
        const weeklyRev = data.weekly_revenue || data.total_revenue / 52;
        return { revenue: weeklyRev, source: "live" };
      }
    }
  } catch (error) {
    console.log("PUMP API not available, using estimate");
  }
  
  // Estimate based on public data: ~$3M/week in fees
  return { revenue: 3000000, source: "estimated" };
}

// Fetch RLB revenue
async function fetchRLBRevenue(): Promise<{ revenue: number; source: "live" | "estimated" }> {
  try {
    // Try Rollbit API
    const response = await fetch("https://rollbit.com/api/rlb/stats", {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.weeklyBurn || data.totalBurn) {
        // Estimate revenue from burn rate (burns ~30% of revenue)
        const weeklyRev = (data.weeklyBurn || data.totalBurn / 100) / 0.30;
        return { revenue: weeklyRev, source: "live" };
      }
    }
  } catch (error) {
    console.log("RLB API not available, using estimate");
  }
  
  // Estimate: ~$1.5M/week
  return { revenue: 1500000, source: "estimated" };
}

// Fetch HYPE revenue
async function fetchHYPERevenue(): Promise<{ revenue: number; source: "live" | "estimated" }> {
  try {
    // Try Hyperliquid stats API
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      // Extract fee data if available
      if (data[0]?.universe) {
        // Estimate from trading volume (fees are ~0.025% maker, 0.05% taker)
        // This would need more specific data
      }
    }
  } catch (error) {
    console.log("HYPE API not available, using estimate");
  }
  
  // Estimate based on Artemis data: ~$2.5M/week in fees
  return { revenue: 2500000, source: "estimated" };
}

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    const hasLive = cache.data.some(t => t.source === "live");
    return NextResponse.json({
      success: true,
      data: cache.data,
      source: hasLive ? "live" : "estimated",
      cached: true,
    });
  }

  // Fetch all revenue data in parallel
  const [shfl, pump, rlb, hype] = await Promise.all([
    fetchSHFLRevenue(),
    fetchPUMPRevenue(),
    fetchRLBRevenue(),
    fetchHYPERevenue(),
  ]);

  const revenues: TokenRevenue[] = [
    {
      symbol: "SHFL",
      weeklyRevenue: shfl.revenue,
      revenueAccrualPct: 0.15,
      source: shfl.source,
    },
    {
      symbol: "HYPE",
      weeklyRevenue: hype.revenue,
      revenueAccrualPct: 0.54,
      source: hype.source,
    },
    {
      symbol: "PUMP",
      weeklyRevenue: pump.revenue,
      revenueAccrualPct: 0.50,
      source: pump.source,
    },
    {
      symbol: "RLB",
      weeklyRevenue: rlb.revenue,
      revenueAccrualPct: 0.30,
      source: rlb.source,
    },
  ];

  // Cache the results
  cache = { data: revenues, timestamp: Date.now() };

  const hasLive = revenues.some(t => t.source === "live");

  return NextResponse.json({
    success: true,
    data: revenues,
    source: hasLive ? "live" : "estimated",
    cached: false,
  });
}

