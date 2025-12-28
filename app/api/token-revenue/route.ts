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

// Disable cache temporarily to ensure fresh data
let cache: { data: TokenRevenue[]; timestamp: number } | null = null;
const CACHE_DURATION = 0; // Disabled - always fetch fresh

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
        
        console.log("SHFL revenue (matching ShuffleRevenueCard):", {
          draws: draws.length,
          avgWeeklyLotteryNGR,
          annualLotteryNGR,
          annualShuffleNGR,
          annualGGR,
        });
        
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
  } catch (error) {
    console.error("Error fetching SHFL revenue:", error);
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
    const estimates = getEstimatedRevenues();
    
    let revenues: TokenRevenue[] = [shflData];
    
    // For each token, use scraper data ONLY if it looks valid
    // SPECIAL HANDLING: Always use estimates for correct accrual rates
    for (const estimate of estimates) {
      const scraped = scraperData?.find(s => s.symbol === estimate.symbol);
      
      // For RLB: Use scraped revenue but ALWAYS use our calculated accrual (13.55%)
      // because the scraper doesn't reliably get the breakdown
      if (estimate.symbol === "RLB" && scraped && scraped.annualRevenue > 100000000) {
        const annualRevenue = scraped.annualRevenue;
        // Known accrual breakdown: Casino 10%, Trading 30%, Sports 20%
        // Based on Dec 2025 data: ~77% Casino, 12.5% Trading, 10.5% Sports
        // Weighted average: 0.77*0.10 + 0.125*0.30 + 0.105*0.20 = 0.1355
        const accrualPct = 0.1355;
        const annualEarnings = annualRevenue * accrualPct;
        
        revenues.push({
          ...scraped,
          annualEarnings,
          weeklyEarnings: annualEarnings / 52,
          revenueAccrualPct: accrualPct,
        });
        console.log(`RLB: Using scraped revenue $${(annualRevenue/1e6).toFixed(0)}M with calculated accrual 13.55%`);
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
        console.log(`HYPE: Using scraped revenue with 99% accrual`);
      }
      // For PUMP: Use scraped data if looks valid
      else if (scraped && 
          scraped.annualRevenue > 10000000 && 
          scraped.revenueAccrualPct >= 0.50 && // PUMP should be close to 100%
          scraped.revenueAccrualPct <= 1.0) {
        revenues.push(scraped);
        console.log(`${estimate.symbol}: Using scraped data - accrual ${(scraped.revenueAccrualPct * 100).toFixed(1)}%`);
      } else {
        revenues.push(estimate);
        console.log(`${estimate.symbol}: Using estimate - scraped accrual was ${scraped ? (scraped.revenueAccrualPct * 100).toFixed(1) + '%' : 'N/A'}`);
      }
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
    
    // Return all estimated data on error - use exact values from Shuffle.com Revenue modal
    const fallbackData: TokenRevenue[] = [
      {
        symbol: "SHFL",
        weeklyRevenue: 275206896 / 52,
        annualRevenue: 275206896,  // GGR
        weeklyEarnings: 20640517 / 52,
        annualEarnings: 20640517,  // Lottery NGR
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
