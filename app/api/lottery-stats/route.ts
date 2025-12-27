import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30 seconds for Puppeteer

export interface CurrentLotteryStats {
  totalTickets: number;
  totalSHFLStaked: number;
  currentPrizePool: number;
  nextDrawTimestamp: number;
  jackpotAmount: number;
  ticketPrice: number;
  powerplayPrice: number;
}

function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

async function scrapeLotteryPage(): Promise<Partial<CurrentLotteryStats>> {
  let browser = null;
  
  try {
    // Configure browser for Vercel serverless
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(15000);
    
    // Navigate to the lottery page
    await page.goto("https://shuffle.com/lottery", {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(3000);

    // Get the page content
    const content = await page.content();
    
    // Try to extract prize pool from the rendered page
    // Look for large dollar amounts that could be the jackpot/prize pool
    const prizePoolData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      // Look for patterns like "$1,234,567" or amounts with M/K suffix
      const dollarMatches = bodyText.match(/\$\s*([\d,]+(?:\.\d{2})?)/g) || [];
      
      // Filter and find the largest amount (likely the prize pool)
      const amounts = dollarMatches
        .map(match => {
          const numStr = match.replace(/[$,\s]/g, "");
          return parseFloat(numStr) || 0;
        })
        .filter(amt => amt > 1000); // Only consider amounts > $1000
      
      // Get the largest amount (most likely the jackpot)
      const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
      
      // Also try to find ticket-related info
      const ticketMatch = bodyText.match(/([\d,]+)\s*tickets?/i);
      const tickets = ticketMatch ? parseInt(ticketMatch[1].replace(/,/g, "")) : 0;
      
      return {
        prizePool: maxAmount,
        tickets: tickets,
      };
    });

    await browser.close();
    
    return {
      currentPrizePool: prizePoolData.prizePool,
      totalTickets: prizePoolData.tickets,
      totalSHFLStaked: prizePoolData.tickets * 50,
      jackpotAmount: prizePoolData.prizePool * 0.30,
    };
  } catch (error) {
    console.error("Puppeteer scraping error:", error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

export async function GET() {
  try {
    // Try to scrape the live data
    const scrapedData = await scrapeLotteryPage();
    
    const stats: CurrentLotteryStats = {
      totalTickets: scrapedData.totalTickets || 1_000_000,
      totalSHFLStaked: scrapedData.totalSHFLStaked || 50_000_000,
      currentPrizePool: scrapedData.currentPrizePool || 1_500_000,
      nextDrawTimestamp: getNextDrawTimestamp(),
      jackpotAmount: scrapedData.jackpotAmount || 450_000,
      ticketPrice: 0.25,
      powerplayPrice: 4.00,
    };

    return NextResponse.json({
      success: true,
      stats,
      source: "shuffle.com/lottery (live scrape)",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching lottery stats:", error);

    // Return fallback data based on recent draw history
    return NextResponse.json({
      success: false,
      error: "Failed to fetch current stats - using estimates",
      stats: {
        totalTickets: 1_000_000,
        totalSHFLStaked: 50_000_000,
        currentPrizePool: 1_500_000,
        nextDrawTimestamp: getNextDrawTimestamp(),
        jackpotAmount: 450_000,
        ticketPrice: 0.25,
        powerplayPrice: 4.00,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}

/**
 * Get next draw timestamp - Friday 6pm AEDT (7am UTC)
 */
function getNextDrawTimestamp(): number {
  const now = new Date();
  const nextFriday = new Date(now);
  
  const currentDay = now.getUTCDay();
  let daysUntilFriday = (5 - currentDay + 7) % 7;
  
  if (daysUntilFriday === 0) {
    const drawTimeToday = new Date(now);
    drawTimeToday.setUTCHours(7, 0, 0, 0);
    if (now >= drawTimeToday) {
      daysUntilFriday = 7;
    }
  }
  
  nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday);
  nextFriday.setUTCHours(7, 0, 0, 0);
  
  return nextFriday.getTime();
}
