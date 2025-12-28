import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for scraping

interface TokenRevenue {
  symbol: string;
  weeklyRevenue: number;
  annualRevenue: number;
  weeklyEarnings: number;
  annualEarnings: number;
  revenueAccrualPct: number;
  source: "live" | "estimated";
}

// Cache results for 1 hour since scraping is expensive
let cache: { data: TokenRevenue[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getBrowser() {
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

// Fetch SHFL revenue from our lottery history
async function fetchSHFLRevenue(): Promise<TokenRevenue> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/lottery-history`, {
      cache: "no-store",
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.stats?.avgWeeklyNGR_4week) {
        // This is the lottery NGR (what stakers receive)
        const weeklyEarnings = data.stats.avgWeeklyNGR_4week;
        // Total Shuffle.com NGR = lottery NGR / 0.15
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
    }
  } catch (error) {
    console.error("Error fetching SHFL revenue:", error);
  }
  
  return {
    symbol: "SHFL",
    weeklyRevenue: 3100000,
    annualRevenue: 3100000 * 52,
    weeklyEarnings: 465000,
    annualEarnings: 465000 * 52,
    revenueAccrualPct: 0.15,
    source: "estimated",
  };
}

// Scrape PUMP revenue from fees.pump.fun
async function scrapePUMPRevenue(browser: any): Promise<TokenRevenue> {
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://fees.pump.fun/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Extract USD amounts from the Token Purchases table
    const amounts = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const usdAmounts: { amount: number; date: Date }[] = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          const text = cell.textContent || '';
          // Look for USD amounts (e.g., "$1,234.56")
          const match = text.match(/\$([0-9,]+\.?\d*)/);
          if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(amount)) {
              usdAmounts.push({ amount, date: new Date() });
            }
          }
        });
      });
      
      return usdAmounts.map(a => a.amount);
    });
    
    // Sum all amounts for estimate
    const totalVisible = amounts.reduce((sum: number, a: number) => sum + a, 0);
    
    // Estimate weekly from visible data (rough approximation)
    const weeklyRevenue = totalVisible > 0 ? totalVisible : 3000000;
    const annualRevenue = weeklyRevenue * 52;
    
    await page.close();
    
    return {
      symbol: "PUMP",
      weeklyRevenue,
      annualRevenue,
      weeklyEarnings: weeklyRevenue, // 100% accrues to token
      annualEarnings: annualRevenue,
      revenueAccrualPct: 1.0,
      source: totalVisible > 0 ? "live" : "estimated",
    };
  } catch (error) {
    console.error("Error scraping PUMP:", error);
    if (page) await page.close();
    
    return {
      symbol: "PUMP",
      weeklyRevenue: 3000000,
      annualRevenue: 156000000,
      weeklyEarnings: 3000000,
      annualEarnings: 156000000,
      revenueAccrualPct: 1.0,
      source: "estimated",
    };
  }
}

// Scrape RLB revenue from rollbit.com/rlb/buy-and-burn
async function scrapeRLBRevenue(browser: any): Promise<TokenRevenue> {
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://rollbit.com/rlb/buy-and-burn', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Try to click 30d filter if available
    try {
      await page.click('[data-period="30d"], button:contains("30D"), .filter-30d');
      await page.waitForTimeout(2000);
    } catch {
      // Filter might not exist or already selected
    }
    
    // Extract revenue data
    const revenueData = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Look for Casino, Crypto Futures, Sports revenue
      const casinoMatch = text.match(/Casino[:\s]*\$?([0-9,]+\.?\d*)/i);
      const futuresMatch = text.match(/(?:Crypto\s*)?Futures[:\s]*\$?([0-9,]+\.?\d*)/i);
      const sportsMatch = text.match(/Sports[:\s]*\$?([0-9,]+\.?\d*)/i);
      
      const casino = casinoMatch ? parseFloat(casinoMatch[1].replace(/,/g, '')) : 0;
      const futures = futuresMatch ? parseFloat(futuresMatch[1].replace(/,/g, '')) : 0;
      const sports = sportsMatch ? parseFloat(sportsMatch[1].replace(/,/g, '')) : 0;
      
      return { casino, futures, sports };
    });
    
    const totalRevenue = revenueData.casino + revenueData.futures + revenueData.sports;
    
    // Calculate earnings: 10% casino + 30% futures + 20% sports
    const totalEarnings = 
      (revenueData.casino * 0.10) + 
      (revenueData.futures * 0.30) + 
      (revenueData.sports * 0.20);
    
    await page.close();
    
    // Data was for 30 days, convert to weekly
    const weeklyRevenue = totalRevenue > 0 ? totalRevenue / 4.33 : 1500000;
    const weeklyEarnings = totalEarnings > 0 ? totalEarnings / 4.33 : 250000;
    
    const effectiveAccrual = totalRevenue > 0 ? totalEarnings / totalRevenue : 0.167;
    
    return {
      symbol: "RLB",
      weeklyRevenue,
      annualRevenue: weeklyRevenue * 52,
      weeklyEarnings,
      annualEarnings: weeklyEarnings * 52,
      revenueAccrualPct: effectiveAccrual,
      source: totalRevenue > 0 ? "live" : "estimated",
    };
  } catch (error) {
    console.error("Error scraping RLB:", error);
    if (page) await page.close();
    
    return {
      symbol: "RLB",
      weeklyRevenue: 1500000,
      annualRevenue: 78000000,
      weeklyEarnings: 250000,
      annualEarnings: 13000000,
      revenueAccrualPct: 0.167,
      source: "estimated",
    };
  }
}

// Scrape HYPE revenue from Artemis Analytics
async function scrapeHYPERevenue(browser: any): Promise<TokenRevenue> {
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://app.artemisanalytics.com/asset/hyperliquid?from=assets', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for data to load
    await page.waitForTimeout(5000);
    
    // Extract annualized revenue
    const revenueData = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Look for annualized revenue or fees
      const annualMatch = text.match(/(?:Annualized|Annual)\s*(?:Revenue|Fees)?[:\s]*\$?([0-9,]+\.?\d*)\s*[MB]?/i);
      const revenueMatch = text.match(/Revenue[:\s]*\$?([0-9,]+\.?\d*)\s*([MB])?/i);
      
      let annualRevenue = 0;
      
      if (annualMatch) {
        annualRevenue = parseFloat(annualMatch[1].replace(/,/g, ''));
        if (annualMatch[2]?.toUpperCase() === 'M') annualRevenue *= 1000000;
        if (annualMatch[2]?.toUpperCase() === 'B') annualRevenue *= 1000000000;
      } else if (revenueMatch) {
        annualRevenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
        if (revenueMatch[2]?.toUpperCase() === 'M') annualRevenue *= 1000000;
        if (revenueMatch[2]?.toUpperCase() === 'B') annualRevenue *= 1000000000;
      }
      
      return { annualRevenue };
    });
    
    await page.close();
    
    const annualRevenue = revenueData.annualRevenue > 0 ? revenueData.annualRevenue : 130000000;
    const weeklyRevenue = annualRevenue / 52;
    
    return {
      symbol: "HYPE",
      weeklyRevenue,
      annualRevenue,
      weeklyEarnings: weeklyRevenue, // 100% accrues to token
      annualEarnings: annualRevenue,
      revenueAccrualPct: 1.0,
      source: revenueData.annualRevenue > 0 ? "live" : "estimated",
    };
  } catch (error) {
    console.error("Error scraping HYPE:", error);
    if (page) await page.close();
    
    return {
      symbol: "HYPE",
      weeklyRevenue: 2500000,
      annualRevenue: 130000000,
      weeklyEarnings: 2500000,
      annualEarnings: 130000000,
      revenueAccrualPct: 1.0,
      source: "estimated",
    };
  }
}

export async function GET() {
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

  let browser;
  try {
    // Fetch SHFL first (doesn't need browser)
    const shflData = await fetchSHFLRevenue();
    
    // Launch browser for scraping
    browser = await getBrowser();
    
    // Scrape other tokens
    const [pumpData, rlbData, hypeData] = await Promise.all([
      scrapePUMPRevenue(browser),
      scrapeRLBRevenue(browser),
      scrapeHYPERevenue(browser),
    ]);
    
    await browser.close();
    
    const revenues: TokenRevenue[] = [shflData, hypeData, pumpData, rlbData];
    
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
    console.error("Scraping error:", error);
    if (browser) await browser.close();
    
    // Return fallback data
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
      {
        symbol: "HYPE",
        weeklyRevenue: 2500000,
        annualRevenue: 130000000,
        weeklyEarnings: 2500000,
        annualEarnings: 130000000,
        revenueAccrualPct: 1.0,
        source: "estimated",
      },
      {
        symbol: "PUMP",
        weeklyRevenue: 3000000,
        annualRevenue: 156000000,
        weeklyEarnings: 3000000,
        annualEarnings: 156000000,
        revenueAccrualPct: 1.0,
        source: "estimated",
      },
      {
        symbol: "RLB",
        weeklyRevenue: 1500000,
        annualRevenue: 78000000,
        weeklyEarnings: 250000,
        annualEarnings: 13000000,
        revenueAccrualPct: 0.167,
        source: "estimated",
      },
    ];
    
    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: "estimated",
      cached: false,
      error: "Scraping failed, using estimates",
    });
  }
}
