import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface CurrentLotteryStats {
  totalTickets: number;
  totalSHFLStaked: number;
  currentPrizePool: number;
  nextDrawTimestamp: number;
  jackpotAmount: number;
  ticketPrice: number;
  powerplayPrice: number;
  drawStatus: string;
  drawNumber: number;
}

const LOTTERY_GRAPHQL_ENDPOINT = "https://shuffle.com/main-api/graphql/lottery/graphql-lottery";

const GET_LATEST_LOTTERY_DRAW_QUERY = `query getLatestLotteryDraw {
  getLatestLotteryDraw {
    id
    prizePoolAmount
    totalPrizesWon
    status
    drawAt
    powerBall
    primaryBall1
    primaryBall2
    primaryBall3
    primaryBall4
    primaryBall5
    csvHash
    hashedSeed
    seed
    provablyFair {
      blockNumber
      blockHash
      __typename
    }
    __typename
  }
}`;

interface LotteryDrawResponse {
  data: {
    getLatestLotteryDraw: {
      id: number; // This is the draw number
      prizePoolAmount: string; // String like "1402348.021875"
      totalPrizesWon: string | null;
      status: string;
      drawAt: string;
      powerBall: number | null;
      primaryBall1: number | null;
      primaryBall2: number | null;
      primaryBall3: number | null;
      primaryBall4: number | null;
      primaryBall5: number | null;
    };
  };
}

async function fetchLotteryData(): Promise<LotteryDrawResponse["data"]["getLatestLotteryDraw"] | null> {
  try {
    const response = await fetch(LOTTERY_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://shuffle.com",
        "Referer": "https://shuffle.com/lottery",
      },
      body: JSON.stringify({
        operationName: "getLatestLotteryDraw",
        query: GET_LATEST_LOTTERY_DRAW_QUERY,
        variables: {},
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("GraphQL request failed:", response.status, response.statusText);
      return null;
    }

    const data: LotteryDrawResponse = await response.json();
    
    if (data.data?.getLatestLotteryDraw) {
      return data.data.getLatestLotteryDraw;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching lottery data:", error);
    return null;
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

export async function GET() {
  try {
    // Fetch live data from Shuffle GraphQL API
    const lotteryData = await fetchLotteryData();
    
    // Parse prizePoolAmount as float (it's a string like "1402348.021875")
    let prizePool = lotteryData?.prizePoolAmount ? parseFloat(lotteryData.prizePoolAmount) : 0;
    let drawStatus = lotteryData?.status || "unknown";
    let drawNumber = lotteryData?.id || 0; // id IS the draw number
    let nextDrawTime = getNextDrawTimestamp();
    
    // If we have a drawAt from the API, use it
    if (lotteryData?.drawAt) {
      const drawAtTime = new Date(lotteryData.drawAt).getTime();
      // If the draw is in the future, use it as next draw time
      if (drawAtTime > Date.now()) {
        nextDrawTime = drawAtTime;
      }
    }
    
    // Fallback if API didn't return data
    if (prizePool === 0) {
      prizePool = 1_402_348; // Latest known value
    }
    if (drawNumber === 0) {
      drawNumber = 64; // Latest known draw number
    }

    const stats: CurrentLotteryStats = {
      totalTickets: 1_000_000, // Estimate - not available in this query
      totalSHFLStaked: 50_000_000,
      currentPrizePool: prizePool,
      nextDrawTimestamp: nextDrawTime,
      jackpotAmount: prizePool * 0.30, // ~30% based on prize split
      ticketPrice: 0.25,
      powerplayPrice: 4.00,
      drawStatus,
      drawNumber,
    };

    return NextResponse.json({
      success: true,
      stats,
      source: lotteryData ? "shuffle.com GraphQL API (live)" : "fallback",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching lottery stats:", error);

    return NextResponse.json({
      success: false,
      error: "Failed to fetch current stats",
      stats: {
        totalTickets: 1_000_000,
        totalSHFLStaked: 50_000_000,
        currentPrizePool: 1_402_348,
        nextDrawTimestamp: getNextDrawTimestamp(),
        jackpotAmount: 420_000,
        ticketPrice: 0.25,
        powerplayPrice: 4.00,
        drawStatus: "unknown",
        drawNumber: 64,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
