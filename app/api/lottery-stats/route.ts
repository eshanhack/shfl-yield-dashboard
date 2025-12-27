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
}

const LOTTERY_GRAPHQL_ENDPOINT = "https://shuffle.com/main-api/graphql/lottery/graphql-lottery";

// Common GraphQL queries to try
const QUERIES = [
  // Query 1: Get current lottery info
  {
    query: `query GetLotteryInfo {
      lottery {
        prizePool
        jackpot
        totalTickets
        nextDraw
      }
    }`
  },
  // Query 2: Alternative structure
  {
    query: `query {
      currentLottery {
        prizePool
        jackpot
        ticketCount
      }
    }`
  },
  // Query 3: Get lottery stats
  {
    query: `query GetLotteryStats {
      lotteryStats {
        currentPrizePool
        jackpotAmount
        totalEntries
      }
    }`
  },
  // Query 4: Simple lottery query
  {
    query: `query {
      lottery {
        pool
        jackpot
      }
    }`
  },
  // Query 5: Introspection to discover schema
  {
    query: `query IntrospectionQuery {
      __schema {
        queryType {
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    }`
  }
];

async function fetchFromGraphQL(): Promise<{ prizePool: number; jackpot: number; tickets: number } | null> {
  for (const queryObj of QUERIES) {
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
        body: JSON.stringify(queryObj),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("GraphQL response:", JSON.stringify(data));
        
        // Try to extract prize pool from various response structures
        if (data.data) {
          const lottery = data.data.lottery || data.data.currentLottery || data.data.lotteryStats || {};
          const prizePool = lottery.prizePool || lottery.currentPrizePool || lottery.pool || 0;
          const jackpot = lottery.jackpot || lottery.jackpotAmount || 0;
          const tickets = lottery.totalTickets || lottery.ticketCount || lottery.totalEntries || 0;
          
          if (prizePool > 0 || jackpot > 0) {
            return { prizePool, jackpot, tickets };
          }
        }
        
        // Log schema info if we got introspection data
        if (data.data?.__schema) {
          console.log("GraphQL Schema fields:", data.data.__schema.queryType?.fields?.map((f: any) => f.name));
        }
      }
    } catch (error) {
      console.log("GraphQL query failed:", error);
      continue;
    }
  }
  
  return null;
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
    // Try to fetch from GraphQL API
    const graphqlData = await fetchFromGraphQL();
    
    let prizePool = graphqlData?.prizePool || 0;
    let jackpot = graphqlData?.jackpot || 0;
    let tickets = graphqlData?.tickets || 0;
    
    // Fallback values based on latest known data
    if (prizePool === 0) {
      prizePool = 1_402_348; // Latest known value from user
    }
    if (jackpot === 0) {
      jackpot = prizePool * 0.30; // ~30% based on prize split
    }
    if (tickets === 0) {
      tickets = 1_000_000; // Estimate
    }

    const stats: CurrentLotteryStats = {
      totalTickets: tickets,
      totalSHFLStaked: tickets * 50,
      currentPrizePool: prizePool,
      nextDrawTimestamp: getNextDrawTimestamp(),
      jackpotAmount: jackpot,
      ticketPrice: 0.25,
      powerplayPrice: 4.00,
    };

    return NextResponse.json({
      success: true,
      stats,
      source: graphqlData ? "shuffle.com GraphQL API" : "fallback",
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
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
