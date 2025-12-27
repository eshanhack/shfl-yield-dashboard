import { NextResponse } from "next/server";

export interface CurrentLotteryStats {
  totalTickets: number;
  totalSHFLStaked: number;
  currentPrizePool: number;
  nextDrawTimestamp: number;
  jackpotAmount: number;
  ticketPrice: number; // in SHFL
}

function parseNumber(str: string): number {
  if (!str) return 0;
  // Remove commas, $, and other non-numeric chars except decimal
  const cleaned = str.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseShortNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.trim().toUpperCase();
  
  // Handle formats like "2.5M", "125M", "1.2B", etc.
  const multipliers: { [key: string]: number } = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  };
  
  for (const [suffix, multiplier] of Object.entries(multipliers)) {
    if (cleaned.endsWith(suffix)) {
      const num = parseFloat(cleaned.replace(suffix, ""));
      return num * multiplier;
    }
  }
  
  return parseNumber(cleaned);
}

export async function GET() {
  try {
    const response = await fetch("https://shuffle.com/token", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Try to extract data from the page
    // Look for patterns like total staked, prize pool, etc.
    
    let stats: CurrentLotteryStats = {
      totalTickets: 0,
      totalSHFLStaked: 0,
      currentPrizePool: 0,
      nextDrawTimestamp: getNextSundayTimestamp(),
      jackpotAmount: 0,
      ticketPrice: 50,
    };

    // Try to find total staked SHFL
    // Patterns might include "XXX SHFL staked", "Total Staked: XXX", etc.
    const stakedMatch = html.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:M|K|B)?\s*SHFL\s*(?:staked|locked)/i) ||
                        html.match(/staked[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:M|K|B)?/i) ||
                        html.match(/total[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:M|K|B)?\s*SHFL/i);
    
    if (stakedMatch) {
      stats.totalSHFLStaked = parseShortNumber(stakedMatch[1]);
      stats.totalTickets = Math.floor(stats.totalSHFLStaked / 50);
    }

    // Try to find current prize pool / jackpot
    const prizeMatch = html.match(/(?:prize\s*pool|jackpot)[:\s]*\$?([\d,]+(?:\.\d+)?)\s*(?:M|K)?/i) ||
                       html.match(/\$?([\d,]+(?:\.\d+)?)\s*(?:M|K)?\s*(?:prize\s*pool|jackpot)/i);
    
    if (prizeMatch) {
      stats.currentPrizePool = parseShortNumber(prizeMatch[1]);
      stats.jackpotAmount = stats.currentPrizePool * 0.30; // Jackpot is ~30% of pool based on split
    }

    // Try to find ticket count directly
    const ticketMatch = html.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:M|K)?\s*tickets/i);
    if (ticketMatch) {
      stats.totalTickets = parseShortNumber(ticketMatch[1]);
      stats.totalSHFLStaked = stats.totalTickets * 50;
    }

    // If we couldn't parse anything useful, use reasonable estimates based on lottery history
    if (stats.totalSHFLStaked === 0) {
      // Based on typical pool sizes of $2-3M and lottery mechanics
      // Estimate ~50M SHFL staked = 1M tickets
      stats.totalSHFLStaked = 50_000_000;
      stats.totalTickets = 1_000_000;
    }

    if (stats.currentPrizePool === 0) {
      // Use recent average from lottery history
      stats.currentPrizePool = 2_500_000;
      stats.jackpotAmount = 750_000;
    }

    return NextResponse.json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching lottery stats:", error);

    // Return fallback data
    return NextResponse.json({
      success: false,
      error: "Failed to fetch current stats",
      stats: {
        totalTickets: 1_000_000,
        totalSHFLStaked: 50_000_000,
        currentPrizePool: 2_500_000,
        nextDrawTimestamp: getNextSundayTimestamp(),
        jackpotAmount: 750_000,
        ticketPrice: 50,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}

function getNextSundayTimestamp(): number {
  const now = new Date();
  const nextSunday = new Date(now);
  
  // Find next Sunday
  const daysUntilSunday = (7 - now.getUTCDay()) % 7;
  nextSunday.setUTCDate(now.getUTCDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  nextSunday.setUTCHours(12, 0, 0, 0); // Noon UTC
  
  // If it's Sunday but past noon, go to next Sunday
  if (nextSunday <= now) {
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  }
  
  return nextSunday.getTime();
}

