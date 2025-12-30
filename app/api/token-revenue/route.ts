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

// In-memory cache for revenue data
let cache: { data: TokenRevenue[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - revenue doesn't change often

// Fetch SHFL revenue from lottery history API
// EXACT SAME calculation as ShuffleRevenueCard for consistency
// Revenue = GGR (Gross Gaming Revenue) = NGR × 2
// Earnings = Lottery NGR = 15% of Shuffle NGR
async function fetchSHFLRevenue(request: Request): Promise<TokenRevenue> {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    const response = await fetch(`${baseUrl}/api/lottery-history`, {
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.draws && data.draws.length > 0) {
        // EXACT same calculation as ShuffleRevenueCard.tsx:
        // Sum: d.ngrUSD + (d.singlesAdded || 0) * 0.85
        const draws = data.draws.filter((d: any) => d.ngrUSD > 0);
        
        const totalLotteryNGR = draws.reduce((sum: number, d: any) => {
          return sum + (d.ngrUSD || 0) + (d.singlesAdded || 0) * 0.85;
        }, 0);
        
        // Average weekly lottery NGR
        const avgWeeklyLotteryNGR = draws.length > 0 ? totalLotteryNGR / draws.length : 0;
        
        // Annual values
        const annualLotteryNGR = avgWeeklyLotteryNGR * 52;
        const annualShuffleNGR = annualLotteryNGR / 0.15;  // Lottery is 15% of NGR
        const annualGGR = annualShuffleNGR * 2;  // GGR = NGR × 2
        
        return {
          symbol: "SHFL",
          weeklyRevenue: annualGGR / 52,
          annualRevenue: annualGGR,  // GGR as revenue
          weeklyEarnings: avgWeeklyLotteryNGR,
          annualEarnings: annualLotteryNGR,  // Lottery NGR as earnings
          revenueAccrualPct: 0.15,  // 15% of NGR goes to lottery
          source: "live",
        };
      }
    }
  } catch {
    // SHFL revenue fetch failed, using fallback
  }
  
  // Fallback - EXACT values from Shuffle.com Revenue modal
  return {
    symbol: "SHFL",
    weeklyRevenue: 275206896 / 52,
    annualRevenue: 275206896,  // GGR from modal
    weeklyEarnings: 20640517 / 52,
    annualEarnings: 20640517,  // Lottery NGR from modal
    revenueAccrualPct: 0.15,
    source: "estimated",
  };
}

// Fetch from dedicated scraper server with timeout
async function fetchFromScraper(): Promise<TokenRevenue[] | null> {
  const scraperUrl = process.env.SCRAPER_URL;
  
  if (!scraperUrl) {
    return null;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout - don't block
    
    const response = await fetch(`${scraperUrl}/api/revenue`, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    
    return null;
  } catch {
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
      // 99% accrues to token holders
      symbol: "HYPE",
      weeklyRevenue: 20000000,
      annualRevenue: 1040000000,
      weeklyEarnings: 20000000 * 0.99,
      annualEarnings: 1040000000 * 0.99,
      revenueAccrualPct: 0.99,
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
      // RLB - Rollbit (Dec 2025 from rollshare.io)
      // Total Annual Revenue: $277,489,012
      // - Casino: $213,546,804 × 10% = $21,354,680
      // - Trading: $34,618,572 × 30% = $10,385,572
      // - Sports: $29,323,636 × 20% = $5,864,727
      // Total Annual Earnings: $37,604,979
      symbol: "RLB",
      weeklyRevenue: 277489012 / 52,
      annualRevenue: 277489012,
      weeklyEarnings: 37604979 / 52,
      annualEarnings: 37604979,
      revenueAccrualPct: 0.1355, // 37.6M / 277.5M = 13.55%
      source: "estimated",
    },
  ];
}

export async function GET(request: Request) {
  // Check cache first - instant response
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    const liveCount = cache.data.filter(t => t.source === "live").length;
    const response = NextResponse.json({
      success: true,
      data: cache.data,
      source: liveCount > 0 ? "live" : "estimated",
      liveCount: `${liveCount}/${cache.data.length}`,
      cached: true,
      cacheAge: Math.round((Date.now() - cache.timestamp) / 1000 / 60) + " minutes",
    });
    response.headers.set("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
    return response;
  }

  try {
    // Fetch SHFL and scraper data in PARALLEL for speed
    const [shflData, scraperData] = await Promise.all([
      fetchSHFLRevenue(request),
      fetchFromScraper(), // Has 5s timeout, won't block long
    ]);
    
    const estimates = getEstimatedRevenues();
    let revenues: TokenRevenue[] = [shflData];
    
    // For each token, use scraper data ONLY if it looks valid
    for (const estimate of estimates) {
      const scraped = scraperData?.find(s => s.symbol === estimate.symbol);
      
      // For RLB: Use scraped revenue but ALWAYS use our calculated accrual (13.55%)
      if (estimate.symbol === "RLB" && scraped && scraped.annualRevenue > 100000000) {
        const annualRevenue = scraped.annualRevenue;
        const accrualPct = 0.1355;
        const annualEarnings = annualRevenue * accrualPct;
        
        revenues.push({
          ...scraped,
          annualEarnings,
          weeklyEarnings: annualEarnings / 52,
          revenueAccrualPct: accrualPct,
        });
      }
      // For HYPE: Use scraped but override accrual to 99%
      else if (estimate.symbol === "HYPE" && scraped && scraped.annualRevenue > 100000000) {
        const accrualPct = 0.99;
        revenues.push({
          ...scraped,
          annualEarnings: scraped.annualRevenue * accrualPct,
          weeklyEarnings: scraped.weeklyRevenue * accrualPct,
          revenueAccrualPct: accrualPct,
        });
      }
      // For PUMP: Use scraped data if looks valid
      else if (scraped && 
          scraped.annualRevenue > 10000000 && 
          scraped.revenueAccrualPct >= 0.50 &&
          scraped.revenueAccrualPct <= 1.0) {
        revenues.push(scraped);
      } else {
        revenues.push(estimate);
      }
    }
    
    // Cache results
    cache = { data: revenues, timestamp: Date.now() };
    
    // SHFL is always live from our own API - that's what matters
    // Mark as live if SHFL is live (the primary data we care about)
    const shflIsLive = shflData.source === "live";
    
    const response = NextResponse.json({
      success: true,
      data: revenues,
      source: shflIsLive ? "live" : "estimated", // SHFL determines overall status
      liveCount: `${revenues.filter(t => t.source === "live").length}/${revenues.length}`,
      cached: false,
      details: revenues.map(r => ({ symbol: r.symbol, source: r.source })),
    });
    response.headers.set("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
    return response;
  } catch (error) {
    // Return estimated data on error
    const fallbackData: TokenRevenue[] = [
      {
        symbol: "SHFL",
        weeklyRevenue: 275206896 / 52,
        annualRevenue: 275206896,
        weeklyEarnings: 20640517 / 52,
        annualEarnings: 20640517,
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
