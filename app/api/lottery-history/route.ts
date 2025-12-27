import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LOTTERY_GRAPHQL_ENDPOINT = "https://shuffle.com/main-api/graphql/lottery/graphql-lottery";

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

export interface PrizeData {
  category: string;
  amount: number;
  winCount: number;
  win: number;
}

export interface LotteryDrawData {
  drawNumber: number;
  date: string;
  prizePool: number;
  jackpotted: number;
  ngrAdded: number;
  singlesAdded: number;
  prizepoolSplit: string;
  totalNGRContribution: number;
  prizes?: PrizeData[];
  jackpotAmount?: number;
  totalWinners?: number;
  totalPaidOut?: number;
  jackpotWon?: boolean;
}

/**
 * Determine if jackpot was won based on jackpotted amount
 * If jackpotted is very low compared to prize pool, jackpot was likely won
 */
function wasJackpotWon(jackpotted: number, prizePool: number): boolean {
  // If jackpotted is less than 5% of prize pool, jackpot was won
  // Normal jackpot rollover is typically 80-90% of the pool
  const ratio = jackpotted / prizePool;
  return ratio < 0.1; // Less than 10% means jackpot was won
}

// Real lottery history data from https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history
const LOTTERY_HISTORY_DATA: Omit<LotteryDrawData, 'totalNGRContribution' | 'prizes'>[] = [
  { drawNumber: 62, date: "2025-12-19", prizePool: 1263612, jackpotted: 1064670, ngrAdded: 173555, singlesAdded: 29042, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
  { drawNumber: 61, date: "2025-12-12", prizePool: 3103837, jackpotted: 33626, ngrAdded: 1201151, singlesAdded: 53543, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
  { drawNumber: 60, date: "2025-12-05", prizePool: 3333438, jackpotted: 2845173, ngrAdded: 205120, singlesAdded: 55062, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 59, date: "2025-11-28", prizePool: 3259985, jackpotted: 2846781, ngrAdded: 431594, singlesAdded: 48357, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 58, date: "2025-11-21", prizePool: 3187332, jackpotted: 2686090, ngrAdded: 525537, singlesAdded: 59884, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 57, date: "2025-11-14", prizePool: 4474708, jackpotted: 2597636, ngrAdded: 529812, singlesAdded: 728536, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 56, date: "2025-11-07", prizePool: 2985268, jackpotted: 2392337, ngrAdded: 1515179, singlesAdded: 66133, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 55, date: "2025-10-31", prizePool: 2862620, jackpotted: 2161753, ngrAdded: 757382, singlesAdded: 30608, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 54, date: "2025-10-24", prizePool: 2715131, jackpotted: 2156693, ngrAdded: 675318, singlesAdded: 28717, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 53, date: "2025-10-17", prizePool: 2921000, jackpotted: 1939523, ngrAdded: 746891, singlesAdded: 30564, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 52, date: "2025-10-10", prizePool: 2349206, jackpotted: 1766321, ngrAdded: 1124115, singlesAdded: 25551, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 51, date: "2025-10-03", prizePool: 2285434, jackpotted: 1772430, ngrAdded: 551224, singlesAdded: 27957, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 50, date: "2025-09-26", prizePool: 2218722, jackpotted: 1572929, ngrAdded: 684209, singlesAdded: 21593, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 49, date: "2025-09-19", prizePool: 1762270, jackpotted: 1458965, ngrAdded: 738163, singlesAdded: 31651, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 48, date: "2025-09-12", prizePool: 2139778, jackpotted: 1405441, ngrAdded: 325178, singlesAdded: 28020, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 47, date: "2025-09-05", prizePool: 2038851, jackpotted: 1340232, ngrAdded: 771526, singlesAdded: 31859, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
  { drawNumber: 46, date: "2025-08-29", prizePool: 978220, jackpotted: 791317, ngrAdded: 1215675, singlesAdded: 22493, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
  { drawNumber: 45, date: "2025-08-22", prizePool: 965329, jackpotted: 711215, ngrAdded: 244512, singlesAdded: 10931, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
  { drawNumber: 44, date: "2025-08-15", prizePool: 780653, jackpotted: 649242, ngrAdded: 305156, singlesAdded: 17382, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
  { drawNumber: 43, date: "2025-08-08", prizePool: 802680, jackpotted: 545990, ngrAdded: 217282, singlesAdded: 17988, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
];

async function fetchPrizesForDraw(drawId: number): Promise<PrizeData[] | null> {
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

    const data = await response.json();
    if (!data.data?.prizesAndResults) {
      return null;
    }

    return data.data.prizesAndResults.map((p: any) => ({
      category: p.category,
      amount: parseFloat(p.amount) || 0,
      winCount: p.winCount || 0,
      win: p.win || 0,
    }));
  } catch (error) {
    console.error(`Error fetching prizes for draw ${drawId}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fetchPrizes = searchParams.get("fetchPrizes") === "true";
  const drawId = searchParams.get("drawId");

  // If requesting specific draw details
  if (drawId) {
    const prizes = await fetchPrizesForDraw(parseInt(drawId));
    const draw = LOTTERY_HISTORY_DATA.find(d => d.drawNumber === parseInt(drawId));
    
    // Check if jackpot was won from prize data (winCount > 0) or from jackpotted ratio
    const jackpotPrize = prizes?.find(p => p.category === "JACKPOT");
    const jackpotWonFromPrizes = jackpotPrize ? jackpotPrize.winCount > 0 : false;
    const jackpotWonFromRatio = draw ? wasJackpotWon(draw.jackpotted, draw.prizePool) : false;
    
    return NextResponse.json({
      success: true,
      draw: draw ? {
        ...draw,
        totalNGRContribution: draw.ngrAdded + (draw.singlesAdded * 0.85),
        prizes,
        jackpotAmount: jackpotPrize?.amount || 0,
        jackpotWon: jackpotWonFromPrizes || jackpotWonFromRatio,
        totalWinners: prizes?.reduce((sum, p) => sum + p.winCount, 0) || 0,
        totalPaidOut: prizes?.reduce((sum, p) => sum + (p.win || 0), 0) || 0,
      } : null,
      lastUpdated: new Date().toISOString(),
    });
  }

  // Calculate totalNGRContribution for each draw and determine jackpot status
  let drawsWithNGR: LotteryDrawData[] = LOTTERY_HISTORY_DATA.map(draw => ({
    ...draw,
    totalNGRContribution: draw.ngrAdded + (draw.singlesAdded * 0.85),
    jackpotWon: wasJackpotWon(draw.jackpotted, draw.prizePool),
  }));

  // Optionally fetch prize data for recent draws (limit to avoid rate limiting)
  if (fetchPrizes) {
    const recentDraws = drawsWithNGR.slice(0, 8); // Fetch for last 8 draws
    
    const prizesPromises = recentDraws.map(draw => 
      fetchPrizesForDraw(draw.drawNumber)
    );
    
    const prizesResults = await Promise.all(prizesPromises);
    
    drawsWithNGR = drawsWithNGR.map((draw, index) => {
      if (index < prizesResults.length && prizesResults[index]) {
        const prizes = prizesResults[index]!;
        return {
          ...draw,
          prizes,
          jackpotAmount: prizes.find(p => p.category === "JACKPOT")?.amount || 0,
          totalWinners: prizes.reduce((sum, p) => sum + p.winCount, 0),
          totalPaidOut: prizes.reduce((sum, p) => sum + (p.win || 0), 0),
        };
      }
      return draw;
    });
  }

  // Calculate 4-week average NGR (from the latest 4 draws)
  const last4Draws = drawsWithNGR.slice(0, 4);
  const avgWeeklyNGR = last4Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / last4Draws.length;

  // Calculate 12-week average for longer-term view
  const last12Draws = drawsWithNGR.slice(0, 12);
  const avg12WeekNGR = last12Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / last12Draws.length;

  return NextResponse.json({
    success: true,
    draws: drawsWithNGR,
    stats: {
      avgWeeklyNGR_4week: avgWeeklyNGR,
      avgWeeklyNGR_12week: avg12WeekNGR,
      last4DrawsNGR: last4Draws.map(d => ({
        drawNumber: d.drawNumber,
        ngrAdded: d.ngrAdded,
        singlesAdded: d.singlesAdded,
        totalNGRContribution: d.totalNGRContribution,
      })),
    },
    lastUpdated: new Date().toISOString(),
    source: "https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history",
  });
}
