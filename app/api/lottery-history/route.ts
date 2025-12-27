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

const GET_LOTTERY_DRAW_QUERY = `query getLotteryDraw($id: Float) {
  lotteryDraw(drawId: $id) {
    id
    prizePoolAmount
    totalStaked
    status
    drawAt
  }
}`;

interface DrawApiData {
  id: number;
  prizePoolAmount: number;
  totalStaked: number;
  status: string;
  drawAt: string;
}

async function fetchDrawFromApi(drawId: number): Promise<DrawApiData | null> {
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
        variables: { id: drawId },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.data?.lotteryDraw) {
      return null;
    }

    const draw = data.data.lotteryDraw;
    return {
      id: draw.id,
      prizePoolAmount: parseFloat(draw.prizePoolAmount) || 0,
      totalStaked: parseFloat(draw.totalStaked) || 0,
      status: draw.status,
      drawAt: draw.drawAt,
    };
  } catch (error) {
    console.error(`Error fetching draw ${drawId}:`, error);
    return null;
  }
}

// Legacy function for backwards compatibility
async function fetchTotalStakedForDraw(drawId: number): Promise<number | null> {
  const draw = await fetchDrawFromApi(drawId);
  return draw?.totalStaked || null;
}

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
  totalStaked?: number;
  totalTickets?: number;
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
  // 2025 Draws (newest first)
  { drawNumber: 63, date: "2025-12-26", prizePool: 1376659, jackpotted: 1090160, ngrAdded: 260000, singlesAdded: 31175, prizepoolSplit: "30-14-8-9-7-6-5-10-11" },
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
  { drawNumber: 42, date: "2025-08-01", prizePool: 668791, jackpotted: 500692, ngrAdded: 284000, singlesAdded: 13831, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 41, date: "2025-07-25", prizePool: 2902553, jackpotted: 0, ngrAdded: 205672, singlesAdded: 35583, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 40, date: "2025-07-18", prizePool: 2820005, jackpotted: 2535746, ngrAdded: 331224, singlesAdded: 47513, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 39, date: "2025-07-11", prizePool: 2833794, jackpotted: 2473348, ngrAdded: 299144, singlesAdded: 26343, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 38, date: "2025-07-04", prizePool: 2751679, jackpotted: 2496895, ngrAdded: 310556, singlesAdded: 37576, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 37, date: "2025-06-27", prizePool: 2756108, jackpotted: 2440967, ngrAdded: 273135, singlesAdded: 19726, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 36, date: "2025-06-20", prizePool: 2727721, jackpotted: 2424381, ngrAdded: 312001, singlesAdded: 33795, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 35, date: "2025-06-13", prizePool: 2734011, jackpotted: 2408416, ngrAdded: 285511, singlesAdded: 42539, prizepoolSplit: "5-13-9-10-10-10-15-13-15" },
  { drawNumber: 34, date: "2025-06-06", prizePool: 2688982, jackpotted: 2410180, ngrAdded: 281291, singlesAdded: 28009, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 33, date: "2025-05-30", prizePool: 2507473, jackpotted: 2301757, ngrAdded: 359216, singlesAdded: 20031, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 32, date: "2025-05-23", prizePool: 2582343, jackpotted: 2265454, ngrAdded: 221987, singlesAdded: 18323, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 31, date: "2025-05-16", prizePool: 2514187, jackpotted: 2262909, ngrAdded: 301111, singlesAdded: 43086, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 30, date: "2025-05-09", prizePool: 2535255, jackpotted: 2165189, ngrAdded: 305912, singlesAdded: 49750, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 29, date: "2025-05-02", prizePool: 2499821, jackpotted: 2099884, ngrAdded: 385621, singlesAdded: 43280, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 28, date: "2025-04-25", prizePool: 2348843, jackpotted: 2085290, ngrAdded: 371251, singlesAdded: 84755, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 27, date: "2025-04-18", prizePool: 2405146, jackpotted: 2025330, ngrAdded: 281290, singlesAdded: 77615, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 26, date: "2025-04-11", prizePool: 2322857, jackpotted: 2148029, ngrAdded: 249556, singlesAdded: 98587, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 25, date: "2025-04-04", prizePool: 2285978, jackpotted: 1982708, ngrAdded: 241563, singlesAdded: 48948, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 24, date: "2025-03-28", prizePool: 2260507, jackpotted: 1922025, ngrAdded: 323021, singlesAdded: 15461, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 23, date: "2025-03-21", prizePool: 2058671, jackpotted: 1825632, ngrAdded: 194039, singlesAdded: 0, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 22, date: "2025-03-14", prizePool: 2019671, jackpotted: 1788516, ngrAdded: 231155, singlesAdded: 0, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 21, date: "2025-03-07", prizePool: 1968436, jackpotted: 1767296, ngrAdded: 101520, singlesAdded: 0, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 20, date: "2025-02-28", prizePool: 1817839, jackpotted: 1746875, ngrAdded: 221561, singlesAdded: 0, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 19, date: "2025-02-21", prizePool: 1860261, jackpotted: 1719277, ngrAdded: 98562, singlesAdded: 0, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 18, date: "2025-02-14", prizePool: 1805807, jackpotted: 1694398, ngrAdded: 165863, singlesAdded: 0, prizepoolSplit: "15-13-9-9-9-9-15-11-10" },
  { drawNumber: 17, date: "2025-02-07", prizePool: 1742995, jackpotted: 1674738, ngrAdded: 131069, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 16, date: "2025-01-31", prizePool: 1750639, jackpotted: 1629233, ngrAdded: 113762, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 15, date: "2025-01-24", prizePool: 1654383, jackpotted: 1548295, ngrAdded: 202344, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 14, date: "2025-01-17", prizePool: 1608779, jackpotted: 1521727, ngrAdded: 132656, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 13, date: "2025-01-10", prizePool: 1592488, jackpotted: 1419536, ngrAdded: 189243, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 12, date: "2025-01-03", prizePool: 1607021, jackpotted: 1406134, ngrAdded: 186354, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  // 2024 Draws
  { drawNumber: 11, date: "2024-12-27", prizePool: 1335953, jackpotted: 1170309, ngrAdded: 436711, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 10, date: "2024-12-20", prizePool: 1309212, jackpotted: 1143789, ngrAdded: 192163, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 9, date: "2024-12-13", prizePool: 1113841, jackpotted: 949598, ngrAdded: 359615, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 8, date: "2024-12-06", prizePool: 1062675, jackpotted: 946703, ngrAdded: 167138, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 7, date: "2024-11-29", prizePool: 904742, jackpotted: 810561, ngrAdded: 252114, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 6, date: "2024-11-22", prizePool: 858049, jackpotted: 700000, ngrAdded: 204741, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 5, date: "2024-11-15", prizePool: 734525, jackpotted: 664529, ngrAdded: 193520, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 4, date: "2024-11-08", prizePool: 650156, jackpotted: 582360, ngrAdded: 152165, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 3, date: "2024-11-01", prizePool: 750935, jackpotted: 502774, ngrAdded: 147382, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 2, date: "2024-10-25", prizePool: 640000, jackpotted: 594000, ngrAdded: 156935, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
  { drawNumber: 1, date: "2024-10-18", prizePool: 1000000, jackpotted: 540000, ngrAdded: 100000, singlesAdded: 0, prizepoolSplit: "40-14-8-8-6-5-4-7-8" },
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

// Get latest draw number
async function getLatestDrawNumber(): Promise<number> {
  try {
    const response = await fetch(LOTTERY_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        operationName: "getLatestLotteryDraw",
        query: `query getLatestLotteryDraw { getLatestLotteryDraw { id } }`,
        variables: {},
      }),
      cache: "no-store",
    });
    const data = await response.json();
    return data.data?.getLatestLotteryDraw?.id || 64;
  } catch {
    return 64;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fetchPrizes = searchParams.get("fetchPrizes") === "true";
  const drawId = searchParams.get("drawId");
  const fetchAll = searchParams.get("fetchAll") === "true";

  // If requesting specific draw details
  if (drawId) {
    const drawNum = parseInt(drawId);
    const [apiData, prizes] = await Promise.all([
      fetchDrawFromApi(drawNum),
      fetchPrizesForDraw(drawNum),
    ]);
    
    const staticData = LOTTERY_HISTORY_DATA.find(d => d.drawNumber === drawNum);
    
    // Check if jackpot was won from prize data (winCount > 0)
    const jackpotPrize = prizes?.find(p => p.category === "JACKPOT");
    const jackpotWonFromPrizes = jackpotPrize ? jackpotPrize.winCount > 0 : false;
    const jackpotWonFromRatio = staticData ? wasJackpotWon(staticData.jackpotted, staticData.prizePool) : false;
    
    // Calculate total NGR from prize data if no static data
    const totalPool = apiData?.prizePoolAmount || staticData?.prizePool || 0;
    const ngrAdded = staticData?.ngrAdded || totalPool * 0.15; // Estimate 15% if no data
    const singlesAdded = staticData?.singlesAdded || 0;
    
    return NextResponse.json({
      success: true,
      draw: {
        drawNumber: drawNum,
        date: apiData?.drawAt || staticData?.date || "",
        prizePool: totalPool,
        jackpotted: staticData?.jackpotted || 0,
        ngrAdded,
        singlesAdded,
        prizepoolSplit: staticData?.prizepoolSplit || "30-14-8-9-7-6-5-10-11",
        totalNGRContribution: ngrAdded + (singlesAdded * 0.85),
        totalStaked: apiData?.totalStaked || 0,
        totalTickets: apiData?.totalStaked ? Math.floor(apiData.totalStaked / 50) : 0,
        prizes,
        jackpotAmount: jackpotPrize?.amount || 0,
        jackpotWon: jackpotWonFromPrizes || jackpotWonFromRatio,
        totalWinners: prizes?.reduce((sum, p) => sum + p.winCount, 0) || 0,
        totalPaidOut: prizes?.reduce((sum, p) => sum + (p.win || 0), 0) || 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  }

  // Get the latest draw number
  const latestDrawNum = await getLatestDrawNumber();
  
  // Fetch all draws from API (1 to latest) - limit concurrent requests
  const allDrawNumbers = Array.from({ length: latestDrawNum }, (_, i) => latestDrawNum - i);
  
  // Fetch draw data in batches to avoid overwhelming the API
  const batchSize = 10;
  const allDrawsData: (DrawApiData | null)[] = [];
  
  for (let i = 0; i < allDrawNumbers.length; i += batchSize) {
    const batch = allDrawNumbers.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(num => fetchDrawFromApi(num)));
    allDrawsData.push(...batchResults);
  }

  // Build draws list combining API data with static data
  let drawsWithData: LotteryDrawData[] = allDrawNumbers.map((drawNum, index) => {
    const apiData = allDrawsData[index];
    const staticData = LOTTERY_HISTORY_DATA.find(d => d.drawNumber === drawNum);
    
    const prizePool = apiData?.prizePoolAmount || staticData?.prizePool || 0;
    const ngrAdded = staticData?.ngrAdded || prizePool * 0.15;
    const singlesAdded = staticData?.singlesAdded || 0;
    const jackpotted = staticData?.jackpotted || prizePool * 0.85;
    
    return {
      drawNumber: drawNum,
      date: apiData?.drawAt?.split('T')[0] || staticData?.date || "",
      prizePool,
      jackpotted,
      ngrAdded,
      singlesAdded,
      prizepoolSplit: staticData?.prizepoolSplit || "30-14-8-9-7-6-5-10-11",
      totalNGRContribution: ngrAdded + (singlesAdded * 0.85),
      totalStaked: apiData?.totalStaked || 0,
      totalTickets: apiData?.totalStaked ? Math.floor(apiData.totalStaked / 50) : 0,
      jackpotWon: staticData ? wasJackpotWon(staticData.jackpotted, staticData.prizePool) : false,
    };
  }).filter(d => d.prizePool > 0); // Filter out draws with no data

  // Optionally fetch prize data for recent draws
  if (fetchPrizes) {
    const recentDraws = drawsWithData.slice(0, 8);
    const prizesPromises = recentDraws.map(draw => fetchPrizesForDraw(draw.drawNumber));
    const prizesResults = await Promise.all(prizesPromises);
    
    drawsWithData = drawsWithData.map((draw, index) => {
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

  // Calculate 4-week average NGR (from the latest 4 draws: weeks 1-4)
  const last4Draws = drawsWithData.slice(0, 4);
  const avgWeeklyNGR = last4Draws.length > 0 
    ? last4Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / last4Draws.length
    : 0;

  // Calculate prior 4-week average NGR (weeks 5-8)
  const prior4Draws = drawsWithData.slice(4, 8);
  const priorAvgWeeklyNGR = prior4Draws.length > 0 
    ? prior4Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / prior4Draws.length
    : avgWeeklyNGR;

  // Calculate 12-week average for longer-term view
  const last12Draws = drawsWithData.slice(0, 12);
  const avg12WeekNGR = last12Draws.length > 0
    ? last12Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / last12Draws.length
    : 0;

  return NextResponse.json({
    success: true,
    draws: drawsWithData,
    stats: {
      avgWeeklyNGR_4week: avgWeeklyNGR,
      avgWeeklyNGR_prior4week: priorAvgWeeklyNGR,
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
