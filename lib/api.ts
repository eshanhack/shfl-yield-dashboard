/**
 * API utilities for fetching SHFL price and lottery data
 */

import { HistoricalDraw } from "./calculations";

// Event to signal that demo data was used as fallback
export const DEMO_DATA_FALLBACK_EVENT = "shfl-demo-data-fallback";

// Dispatch event when falling back to demo data (client-side only)
function signalDemoDataFallback(source: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEMO_DATA_FALLBACK_EVENT, { detail: { source } }));
  }
}

// Timeout wrapper for fetch calls to prevent hanging
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// CoinGecko API endpoint for SHFL token
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const SHFL_COIN_ID = "shuffle-2"; // SHFL token ID on CoinGecko

export interface SHFLPrice {
  usd: number;
  usd_24h_change: number;
  last_updated: string;
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export interface NGRHistoryPoint {
  timestamp: number;
  ngr: number;
}

export interface PrizeData {
  category: string;
  amount: number;
  winCount: number;
  win: number;
}

export interface LotteryDrawRaw {
  drawNumber: number;
  date: string;
  prizePool: number;
  jackpotted: number;
  // ngrAdded = the actual NGR that contributed to THIS draw (from previous draw's row)
  ngrAdded: number;
  singlesAdded: number;
  // postedNgrAdded = what's shown in this draw's row (goes to NEXT draw)
  postedNgrAdded?: number;
  postedSinglesAdded?: number;
  prizepoolSplit: string;
  totalNGRContribution: number; // ngrAdded + (singlesAdded * 0.85)
  totalStaked?: number;
  totalTickets?: number;
  prizes?: PrizeData[];
  jackpotAmount?: number;
  totalWinners?: number;
  totalPaidOut?: number;
  jackpotWon?: boolean;
  // Adjusted NGR fields for jackpot replenishment
  adjustedNGR?: number;
  jackpotReplenishment?: number;
  prevJackpotWon?: boolean;
}

// Shuffle.com API endpoint for token info (more reliable than CoinGecko)
const SHUFFLE_API_ENDPOINT = "https://shuffle.com/main-api/graphql/api/graphql";

const GET_TOKEN_INFO_QUERY = `query tokenInfo {
  tokenInfo {
    priceInUsd
    twentyFourHourPercentageChange
    burnedTokens
    circulatingSupply
    __typename
  }
}`;

/**
 * Fetch current SHFL price - races Shuffle.com and CoinGecko for fastest response
 */
export async function fetchSHFLPrice(): Promise<SHFLPrice> {
  // Race both APIs for fastest response
  const shufflePromise = (async (): Promise<SHFLPrice | null> => {
    try {
      const shuffleResponse = await fetchWithTimeout(`${SHUFFLE_API_ENDPOINT}?t=${Date.now()}`, {
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
      }, 5000); // 5 second timeout

      if (shuffleResponse.ok) {
        const data = await shuffleResponse.json();
        const tokenInfo = data.data?.tokenInfo;
        
        if (tokenInfo?.priceInUsd) {
          return {
            usd: parseFloat(tokenInfo.priceInUsd),
            usd_24h_change: parseFloat(tokenInfo.twentyFourHourPercentageChange || "0"),
            last_updated: new Date().toISOString(),
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  })();

  const coingeckoPromise = (async (): Promise<SHFLPrice | null> => {
    try {
      const response = await fetchWithTimeout(
        `${COINGECKO_API}/simple/price?ids=${SHFL_COIN_ID}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
        { cache: "no-store" },
        5000 // 5 second timeout
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const shflData = data[SHFL_COIN_ID];
      
      if (shflData?.usd) {
        return {
          usd: shflData.usd,
          usd_24h_change: shflData.usd_24h_change ?? 0,
          last_updated: new Date((shflData.last_updated_at ?? Date.now() / 1000) * 1000).toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  })();

  // Race both APIs - return whichever succeeds first
  try {
    const result = await Promise.race([
      shufflePromise.then(r => r || Promise.reject()),
      coingeckoPromise.then(r => r || Promise.reject()),
    ]);
    if (result) return result;
  } catch {
    // Both failed in race, try to get any result
  }
  
  // Wait for any successful result
  const [shuffleResult, coingeckoResult] = await Promise.all([shufflePromise, coingeckoPromise]);
  if (shuffleResult) return shuffleResult;
  if (coingeckoResult) return coingeckoResult;

  // Last resort fallback
  signalDemoDataFallback("price");
  return {
    usd: 0.30,
    usd_24h_change: 0,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Fetch SHFL price history for the last N days
 */
export async function fetchPriceHistory(days: number = 365): Promise<PriceHistoryPoint[]> {
  try {
    const response = await fetchWithTimeout(
      `${COINGECKO_API}/coins/${SHFL_COIN_ID}/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour
      10000 // 10 second timeout for larger data
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch price history");
    }
    
    const data = await response.json();
    
    return data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  } catch {
    // Return mock data on error
    signalDemoDataFallback("priceHistory");
    return generateMockPriceHistory(days);
  }
}

/**
 * Generate mock price history for demo purposes
 */
function generateMockPriceHistory(days: number): PriceHistoryPoint[] {
  const now = Date.now();
  const points: PriceHistoryPoint[] = [];
  const basePrice = 0.15;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    // Add some variation
    const variation = Math.sin(i / 30) * 0.03 + Math.random() * 0.02 - 0.01;
    const trendUp = (days - i) / days * 0.05; // Slight uptrend
    points.push({
      timestamp,
      price: basePrice + variation + trendUp,
    });
  }
  
  return points;
}

/**
 * Find the closest price point to a given timestamp
 */
function findClosestPrice(priceHistory: PriceHistoryPoint[], targetTimestamp: number): number {
  if (priceHistory.length === 0) return 0;
  
  let closestPrice = priceHistory[0].price;
  let minDiff = Math.abs(priceHistory[0].timestamp - targetTimestamp);
  
  for (const point of priceHistory) {
    const diff = Math.abs(point.timestamp - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestPrice = point.price;
    }
  }
  
  return closestPrice;
}

/**
 * Fetch real lottery history from our API route
 * Also fetches historical price data to calculate accurate historical APYs
 */
export async function fetchLotteryHistory(): Promise<HistoricalDraw[]> {
  try {
    // Fetch lottery history and price history in parallel
    const [lotteryResponse, priceHistory] = await Promise.all([
      fetchWithTimeout(`/api/lottery-history?t=${Date.now()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' }
      }, 8000),
      fetchPriceHistory(365).catch(() => [] as PriceHistoryPoint[]), // Fallback to empty if fails
    ]);
    
    if (!lotteryResponse.ok) {
      throw new Error("Failed to fetch lottery history");
    }
    
    const data = await lotteryResponse.json();
    
    if (!data.success || !data.draws) {
      throw new Error("Invalid response");
    }
    
    // Transform raw API data to HistoricalDraw format with historical prices
    return data.draws.map((draw: LotteryDrawRaw) => {
      // Use actual totalTickets from API if available, otherwise estimate
      const totalTickets = draw.totalTickets || estimateTicketsFromPool(draw.prizePool);
      
      // For jackpot replenishment weeks, use adjusted NGR for yield calculation
      const effectiveNGR = draw.adjustedNGR !== undefined ? draw.adjustedNGR : draw.totalNGRContribution;
      
      const yieldPerThousandSHFL = calcYield(effectiveNGR, totalTickets, draw.prizepoolSplit);
      
      // Find the historical SHFL price at the time of this draw
      const drawTimestamp = new Date(draw.date).getTime();
      const shflPriceAtDraw = findClosestPrice(priceHistory, drawTimestamp);
      
      // Calculate historical APY using the price at time of draw
      const historicalAPY = shflPriceAtDraw > 0 
        ? calculateHistoricalAPY(yieldPerThousandSHFL, shflPriceAtDraw)
        : undefined;
      
      return {
        drawNumber: draw.drawNumber,
        date: draw.date,
        totalPoolUSD: draw.prizePool,
        // ngrUSD = actual NGR that contributed to THIS draw (from previous draw's posted NGR)
        ngrUSD: draw.totalNGRContribution, // ngrAdded + (singlesAdded * 0.85)
        totalTickets,
        yieldPerThousandSHFL,
        // Historical price and APY for accurate historical analysis
        shflPriceAtDraw,
        historicalAPY,
        prizepoolSplit: draw.prizepoolSplit,
        jackpotWon: draw.jackpotWon,
        jackpotAmount: draw.jackpotAmount,
        jackpotted: draw.jackpotted,
        // Posted values (what's shown in this draw's row - goes to NEXT draw)
        postedNgrUSD: (draw.postedNgrAdded || 0) + (draw.postedSinglesAdded || 0) * 0.85,
        postedSinglesAdded: draw.postedSinglesAdded,
        // Adjusted NGR for jackpot replenishment
        adjustedNgrUSD: draw.adjustedNGR,
        jackpotReplenishment: draw.jackpotReplenishment,
        prevJackpotWon: draw.prevJackpotWon,
      };
    });
  } catch {
    // Return mock data on error
    signalDemoDataFallback("lotteryHistory");
    return getMockHistoricalDraws(12);
  }
}

export interface NGRStats {
  current4WeekAvg: number;
  prior4WeekAvg: number;
}

/**
 * Fetch 4-week average NGR from lottery history (current and prior)
 */
export async function fetchAvgWeeklyNGR(): Promise<number> {
  const stats = await fetchNGRStats();
  return stats.current4WeekAvg;
}

/**
 * Fetch NGR stats including current and prior 4-week averages
 */
export async function fetchNGRStats(): Promise<NGRStats> {
  try {
    const response = await fetchWithTimeout(`/api/lottery-history?t=${Date.now()}`, {
      cache: "no-store",
      headers: { 'Cache-Control': 'no-cache' }
    }, 8000);
    
    if (!response.ok) {
      throw new Error("Failed to fetch lottery history");
    }
    
    const data = await response.json();
    
    return {
      current4WeekAvg: data.stats?.avgWeeklyNGR_4week || 500_000,
      prior4WeekAvg: data.stats?.avgWeeklyNGR_prior4week || 500_000,
    };
  } catch {
    // Return fallback on error
    signalDemoDataFallback("ngrStats");
    return {
      current4WeekAvg: 500_000,
      prior4WeekAvg: 500_000,
    };
  }
}

/**
 * Fetch current lottery stats from our API route
 */
export async function fetchLotteryStats(): Promise<LotteryStats> {
  try {
    // Add timestamp to bust cache
    const response = await fetchWithTimeout(`/api/lottery-stats?t=${Date.now()}`, {
      cache: "no-store", // Always fetch fresh data
      headers: {
        'Cache-Control': 'no-cache',
      }
    }, 8000);
    
    if (!response.ok) {
      throw new Error("Failed to fetch lottery stats");
    }
    
    const data = await response.json();
    
    if (!data.success || !data.stats) {
      throw new Error("Invalid response");
    }
    
    return {
      totalTickets: data.stats.totalTickets,
      totalSHFLStaked: data.stats.totalSHFLStaked,
      currentWeekNGR: data.stats.currentPrizePool / 0.15, // Reverse calculate NGR
      currentWeekPool: data.stats.currentPrizePool,
      nextDrawTimestamp: data.stats.nextDrawTimestamp,
      drawStatus: data.stats.drawStatus,
      drawNumber: data.stats.drawNumber,
      jackpotAmount: data.stats.jackpotAmount,
      priorWeekTickets: data.stats.priorWeekTickets,
      priorWeekSHFLStaked: data.stats.priorWeekSHFLStaked,
      circulatingSupply: data.stats.circulatingSupply,
      burnedTokens: data.stats.burnedTokens,
      totalSupply: data.stats.totalSupply,
    };
  } catch {
    // Return mock data on error
    signalDemoDataFallback("lotteryStats");
    return getMockLotteryStats();
  }
}

import { calculateYieldPer1KSHFL as calcYield, getNonJackpotPercentage, calculateHistoricalAPY } from "./calculations";

/**
 * Estimate ticket count based on prize pool size
 */
function estimateTicketsFromPool(prizePool: number): number {
  // Based on historical data, typical pool is $2-3M with ~1M tickets
  // This is a rough estimate - actual data would be better
  const ticketsPerMillionPool = 400_000;
  return Math.floor((prizePool / 1_000_000) * ticketsPerMillionPool);
}

/**
 * Get NGR history from lottery history data
 */
export async function fetchNGRHistory(): Promise<NGRHistoryPoint[]> {
  try {
    const response = await fetchWithTimeout(`/api/lottery-history?t=${Date.now()}`, {
      cache: "no-store",
      headers: { 'Cache-Control': 'no-cache' }
    }, 8000);
    
    if (!response.ok) {
      throw new Error("Failed to fetch NGR history");
    }
    
    const data = await response.json();
    
    if (!data.success || !data.draws) {
      throw new Error("Invalid response");
    }
    
    // Transform to NGR history points (using totalNGRContribution = ngrAdded + singles*0.85)
    const points = data.draws.map((draw: LotteryDrawRaw) => ({
      timestamp: new Date(draw.date).getTime(),
      ngr: draw.totalNGRContribution,
    }));
    
    // Sort oldest first for charting
    return points.sort((a: NGRHistoryPoint, b: NGRHistoryPoint) => a.timestamp - b.timestamp);
  } catch {
    // Return mock data on error
    signalDemoDataFallback("ngrHistory");
    return getMockNGRHistory(52);
  }
}

/**
 * Generate mock NGR history for demo purposes (fallback)
 */
export function getMockNGRHistory(weeks: number = 52): NGRHistoryPoint[] {
  const now = Date.now();
  const points: NGRHistoryPoint[] = [];
  const baseNGR = 500_000; // Base weekly NGR of $500K based on real data
  
  for (let i = weeks; i >= 0; i--) {
    const timestamp = now - i * 7 * 24 * 60 * 60 * 1000;
    // NGR varies based on gaming activity
    const seasonalVariation = Math.sin((i / 52) * Math.PI * 2) * 200_000;
    const randomVariation = (Math.random() - 0.5) * 100_000;
    const growthTrend = ((weeks - i) / weeks) * 300_000; // Growing platform
    
    points.push({
      timestamp,
      ngr: Math.max(100_000, baseNGR + seasonalVariation + randomVariation + growthTrend),
    });
  }
  
  return points;
}

/**
 * Get mock historical lottery draws (fallback)
 */
export function getMockHistoricalDraws(count: number = 12): HistoricalDraw[] {
  // Real data from the lottery history page with approximate historical prices
  const realDraws: HistoricalDraw[] = [
    { drawNumber: 62, date: "2025-12-19", totalPoolUSD: 1263612, ngrUSD: 173555, totalTickets: 500000, yieldPerThousandSHFL: 50.54, shflPriceAtDraw: 0.32, historicalAPY: calculateHistoricalAPY(50.54, 0.32) },
    { drawNumber: 61, date: "2025-12-12", totalPoolUSD: 3103837, ngrUSD: 1201151, totalTickets: 1200000, yieldPerThousandSHFL: 51.73, shflPriceAtDraw: 0.30, historicalAPY: calculateHistoricalAPY(51.73, 0.30) },
    { drawNumber: 60, date: "2025-12-05", totalPoolUSD: 3333438, ngrUSD: 205120, totalTickets: 1300000, yieldPerThousandSHFL: 51.28, shflPriceAtDraw: 0.28, historicalAPY: calculateHistoricalAPY(51.28, 0.28) },
    { drawNumber: 59, date: "2025-11-28", totalPoolUSD: 3259985, ngrUSD: 431594, totalTickets: 1300000, yieldPerThousandSHFL: 50.15, shflPriceAtDraw: 0.25, historicalAPY: calculateHistoricalAPY(50.15, 0.25) },
    { drawNumber: 58, date: "2025-11-21", totalPoolUSD: 3187332, ngrUSD: 525537, totalTickets: 1270000, yieldPerThousandSHFL: 50.19, shflPriceAtDraw: 0.22, historicalAPY: calculateHistoricalAPY(50.19, 0.22) },
    { drawNumber: 57, date: "2025-11-14", totalPoolUSD: 4474708, ngrUSD: 529812, totalTickets: 1780000, yieldPerThousandSHFL: 50.28, shflPriceAtDraw: 0.20, historicalAPY: calculateHistoricalAPY(50.28, 0.20) },
    { drawNumber: 56, date: "2025-11-07", totalPoolUSD: 2985268, ngrUSD: 1515179, totalTickets: 1190000, yieldPerThousandSHFL: 50.17, shflPriceAtDraw: 0.18, historicalAPY: calculateHistoricalAPY(50.17, 0.18) },
    { drawNumber: 55, date: "2025-10-31", totalPoolUSD: 2862620, ngrUSD: 757382, totalTickets: 1140000, yieldPerThousandSHFL: 50.22, shflPriceAtDraw: 0.16, historicalAPY: calculateHistoricalAPY(50.22, 0.16) },
    { drawNumber: 54, date: "2025-10-24", totalPoolUSD: 2715131, ngrUSD: 675318, totalTickets: 1080000, yieldPerThousandSHFL: 50.28, shflPriceAtDraw: 0.15, historicalAPY: calculateHistoricalAPY(50.28, 0.15) },
    { drawNumber: 53, date: "2025-10-17", totalPoolUSD: 2921000, ngrUSD: 746891, totalTickets: 1160000, yieldPerThousandSHFL: 50.36, shflPriceAtDraw: 0.14, historicalAPY: calculateHistoricalAPY(50.36, 0.14) },
    { drawNumber: 52, date: "2025-10-10", totalPoolUSD: 2349206, ngrUSD: 1124115, totalTickets: 940000, yieldPerThousandSHFL: 50.00, shflPriceAtDraw: 0.13, historicalAPY: calculateHistoricalAPY(50.00, 0.13) },
    { drawNumber: 51, date: "2025-10-03", totalPoolUSD: 2285434, ngrUSD: 551224, totalTickets: 910000, yieldPerThousandSHFL: 50.23, shflPriceAtDraw: 0.12, historicalAPY: calculateHistoricalAPY(50.23, 0.12) },
  ];
  
  return realDraws.slice(0, count);
}

/**
 * Get next draw timestamp - Friday 6pm AEDT (7am UTC)
 */
export function getNextDrawTimestamp(): number {
  const now = new Date();
  const nextFriday = new Date(now);
  
  // Get current day (0 = Sunday, 5 = Friday)
  const currentDay = now.getUTCDay();
  
  // Calculate days until Friday
  let daysUntilFriday = (5 - currentDay + 7) % 7;
  
  // If it's Friday, check if we're past the draw time (7:00 UTC = 6pm AEDT)
  if (daysUntilFriday === 0) {
    const drawTimeToday = new Date(now);
    drawTimeToday.setUTCHours(7, 0, 0, 0);
    if (now >= drawTimeToday) {
      daysUntilFriday = 7; // Next Friday
    }
  }
  
  nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday);
  nextFriday.setUTCHours(7, 0, 0, 0); // 7am UTC = 6pm AEDT
  
  return nextFriday.getTime();
}

/**
 * Get current lottery stats (fallback)
 */
export function getMockLotteryStats(): LotteryStats {
  const nextDrawTimestamp = getNextDrawTimestamp();
  
  return {
    totalTickets: 1_000_000,
    totalSHFLStaked: 50_000_000, // 1M tickets * 50 SHFL
    currentWeekNGR: 600_000, // Based on recent averages
    currentWeekPool: 2_500_000, // Current pool estimate
    nextDrawTimestamp,
  };
}

/**
 * Current lottery stats interface
 */
export interface LotteryStats {
  totalTickets: number;
  totalSHFLStaked: number;
  currentWeekNGR: number;
  currentWeekPool: number;
  nextDrawTimestamp: number;
  drawStatus?: string;
  drawNumber?: number;
  jackpotAmount?: number;
  priorWeekTickets?: number;
  priorWeekSHFLStaked?: number;
  circulatingSupply?: number;
  burnedTokens?: number;
  totalSupply?: number;
}

/**
 * Combine price and NGR data for charting
 */
export interface ChartDataPoint {
  date: string;
  timestamp: number;
  price: number;
  ngr: number;
}

export async function combineChartData(
  priceHistory: PriceHistoryPoint[],
  ngrHistory: NGRHistoryPoint[]
): Promise<ChartDataPoint[]> {
  // Create chart data based on NGR history (weekly draws)
  // For each NGR point, find the closest price
  const chartData: ChartDataPoint[] = [];
  
  for (const ngrPoint of ngrHistory) {
    // Find the closest price point to this NGR date
    let closestPrice = priceHistory[0]?.price || 0;
    let minDiff = Infinity;
    
    for (const pricePoint of priceHistory) {
      const diff = Math.abs(pricePoint.timestamp - ngrPoint.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = pricePoint.price;
      }
    }
    
    const date = new Date(ngrPoint.timestamp);
    
    chartData.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      timestamp: ngrPoint.timestamp,
      price: closestPrice,
      ngr: ngrPoint.ngr / 1_000_000, // Convert to millions for display
    });
  }
  
  // Sort by date (oldest first)
  return chartData.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Fetch detailed draw data including prizes for a specific draw
 */
export async function fetchDrawDetails(drawNumber: number): Promise<LotteryDrawRaw | null> {
  try {
    const response = await fetch(`/api/lottery-history?drawId=${drawNumber}`, {
      cache: "no-store",
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch draw details");
    }
    
    const data = await response.json();
    
    if (!data.success || !data.draw) {
      return null;
    }
    
    return data.draw;
  } catch {
    // Return null on error
    return null;
  }
}

/**
 * Fetch lottery history with prize data
 */
export async function fetchLotteryHistoryWithPrizes(): Promise<LotteryDrawRaw[]> {
  try {
    const response = await fetch("/api/lottery-history?fetchPrizes=true", {
      cache: "no-store",
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch lottery history with prizes");
    }
    
    const data = await response.json();
    
    if (!data.success || !data.draws) {
      throw new Error("Invalid response");
    }
    
    return data.draws;
  } catch {
    // Return empty on error
    return [];
  }
}
