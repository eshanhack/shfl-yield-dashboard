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
  priorWeekTickets?: number;
  priorWeekSHFLStaked?: number;
  circulatingSupply?: number;
  burnedTokens?: number;
  totalSupply?: number;
}

const LOTTERY_GRAPHQL_ENDPOINT = "https://shuffle.com/main-api/graphql/lottery/graphql-lottery";
const API_GRAPHQL_ENDPOINT = "https://shuffle.com/main-api/graphql/api/graphql";

// Query 0: Get prizes and results (for jackpot amount)
const GET_PRIZES_AND_RESULTS_QUERY = `query getPrizesAndResults($drawId: Float) {
  prizesAndResults(drawId: $drawId) {
    category
    currency
    amount
    winCount
    win
    __typename
  }
}`;

// Query for token info (circulating supply, burned tokens)
const GET_TOKEN_INFO_QUERY = `query tokenInfo {
  tokenInfo {
    priceInUsd
    twentyFourHourPercentageChange
    burnedTokens
    circulatingSupply
    airdrop2StartDate
    __typename
  }
}`;

interface TokenInfoResponse {
  data: {
    tokenInfo: {
      priceInUsd: string;
      twentyFourHourPercentageChange: string;
      burnedTokens: string;
      circulatingSupply: string;
      airdrop2StartDate: string;
    };
  };
}

async function fetchTokenInfo(): Promise<TokenInfoResponse["data"]["tokenInfo"] | null> {
  try {
    const response = await fetch(API_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://shuffle.com",
        "Referer": "https://shuffle.com/token",
      },
      body: JSON.stringify({
        operationName: "tokenInfo",
        query: GET_TOKEN_INFO_QUERY,
        variables: {},
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data: TokenInfoResponse = await response.json();
    return data.data?.tokenInfo || null;
  } catch {
    return null;
  }
}

// Query 1: Get latest lottery draw info (prize pool, draw number, status)
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

// Query 2: Get lottery draw with totalStaked (for ticket count)
const GET_LOTTERY_DRAW_QUERY = `query getLotteryDraw($id: Float) {
  lotteryDraw(drawId: $id) {
    id
    prizePoolAmount
    totalPrizesWon
    totalStaked
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

interface PrizePool {
  category: string;
  currency: string;
  amount: string;
  winCount: number;
  win: number;
}

interface PrizesAndResultsResponse {
  data: {
    prizesAndResults: PrizePool[];
  };
}

interface LatestLotteryDrawResponse {
  data: {
    getLatestLotteryDraw: {
      id: number;
      prizePoolAmount: string;
      totalPrizesWon: string | null;
      status: string;
      drawAt: string;
    };
  };
}

interface LotteryDrawResponse {
  data: {
    lotteryDraw: {
      id: number;
      prizePoolAmount: string;
      totalPrizesWon: string | null;
      totalStaked: string; // This is what we need for ticket count
      status: string;
      drawAt: string;
    };
  };
}

async function fetchPrizesAndResults(drawId: number): Promise<PrizePool[] | null> {
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
        operationName: "getPrizesAndResults",
        query: GET_PRIZES_AND_RESULTS_QUERY,
        variables: { drawId },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data: PrizesAndResultsResponse = await response.json();
    return data.data?.prizesAndResults || null;
  } catch {
    return null;
  }
}

async function fetchLatestLotteryDraw(): Promise<LatestLotteryDrawResponse["data"]["getLatestLotteryDraw"] | null> {
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
      return null;
    }

    const data: LatestLotteryDrawResponse = await response.json();
    return data.data?.getLatestLotteryDraw || null;
  } catch {
    return null;
  }
}

async function fetchLotteryDrawWithStaked(drawId?: number): Promise<LotteryDrawResponse["data"]["lotteryDraw"] | null> {
  try {
    const response = await fetch(LOTTERY_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://shuffle.com",
        "Referer": "https://shuffle.com/token",
      },
      body: JSON.stringify({
        operationName: "getLotteryDraw",
        query: GET_LOTTERY_DRAW_QUERY,
        variables: drawId ? { id: drawId } : {},
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data: LotteryDrawResponse = await response.json();
    return data.data?.lotteryDraw || null;
  } catch {
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
    // Fetch all queries in parallel
    const [latestDrawData, drawWithStakedData, tokenInfo] = await Promise.all([
      fetchLatestLotteryDraw(),
      fetchLotteryDrawWithStaked(),
      fetchTokenInfo(),
    ]);
    
    // Use data from both responses
    const lotteryData = latestDrawData || drawWithStakedData;
    
    // Parse prizePoolAmount as float (it's a string like "1402348.021875")
    let prizePool = lotteryData?.prizePoolAmount ? parseFloat(lotteryData.prizePoolAmount) : 0;
    let drawStatus = lotteryData?.status || "unknown";
    let drawNumber = lotteryData?.id || 0;
    let nextDrawTime = getNextDrawTimestamp();
    
    // Get totalStaked from the second query and calculate tickets
    let totalStaked = drawWithStakedData?.totalStaked ? parseFloat(drawWithStakedData.totalStaked) : 0;
    let totalTickets = totalStaked > 0 ? Math.floor(totalStaked / 50) : 0;
    
    // Fetch prior week's staked data (previous draw)
    let priorWeekTickets = 0;
    let priorWeekSHFLStaked = 0;
    if (drawNumber > 1) {
      const priorDrawData = await fetchLotteryDrawWithStaked(drawNumber - 1);
      if (priorDrawData?.totalStaked) {
        priorWeekSHFLStaked = parseFloat(priorDrawData.totalStaked);
        priorWeekTickets = Math.floor(priorWeekSHFLStaked / 50);
      }
    }
    
    // Fetch prize divisions to get exact jackpot amount
    let jackpotAmount = prizePool * 0.30; // Default fallback
    if (drawNumber > 0) {
      const prizes = await fetchPrizesAndResults(drawNumber);
      if (prizes) {
        const jackpotPrize = prizes.find(p => p.category === "JACKPOT");
        if (jackpotPrize) {
          jackpotAmount = parseFloat(jackpotPrize.amount);
        }
      }
    }
    
    // If we have a drawAt from the API, use it
    if (lotteryData?.drawAt) {
      const drawAtTime = new Date(lotteryData.drawAt).getTime();
      // If the draw is in the future, use it as next draw time
      if (drawAtTime > Date.now()) {
        nextDrawTime = drawAtTime;
      }
    }
    
    // Fallbacks
    if (prizePool === 0) {
      prizePool = 1_402_348;
    }
    if (drawNumber === 0) {
      drawNumber = 64;
    }
    if (totalTickets === 0) {
      totalTickets = 1_000_000; // Fallback estimate
      totalStaked = 50_000_000;
    }

    // Parse token info
    const circulatingSupply = tokenInfo?.circulatingSupply ? parseFloat(tokenInfo.circulatingSupply) : 0;
    const burnedTokens = tokenInfo?.burnedTokens ? parseFloat(tokenInfo.burnedTokens) : 0;
    const totalSupplyRemaining = 1_000_000_000 - burnedTokens; // 1B total supply minus burned

    const stats: CurrentLotteryStats = {
      totalTickets,
      totalSHFLStaked: totalStaked,
      currentPrizePool: prizePool,
      nextDrawTimestamp: nextDrawTime,
      jackpotAmount,
      ticketPrice: 0.25,
      powerplayPrice: 4.00,
      drawStatus,
      drawNumber,
      priorWeekTickets,
      priorWeekSHFLStaked,
      circulatingSupply,
      burnedTokens,
      totalSupply: totalSupplyRemaining,
    };

    return NextResponse.json({
      success: true,
      stats,
      source: lotteryData ? "shuffle.com GraphQL API (live)" : "fallback",
      lastUpdated: new Date().toISOString(),
    });
  } catch {
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
        priorWeekTickets: 0,
        priorWeekSHFLStaked: 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
