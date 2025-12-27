/**
 * SHFL Yield Calculations
 * 
 * Key mechanics:
 * - 1 Ticket = 50 SHFL staked (permanent, non-withdrawable)
 * - Lottery: 5 numbers from 1-55, 1 powerball from 1-18
 * - Total combinations = C(55,5) × 18 = 62,617,698
 * - Prize pool split across 9 divisions (Jackpot excluded from yield)
 */

// Constants
export const SHFL_PER_TICKET = 50;
export const WEEKS_PER_YEAR = 52;
export const TOTAL_LOTTERY_COMBINATIONS = 62_617_698;

// Prize division probabilities based on lottery mechanics
// 5 numbers from 1-55, 1 powerball from 1-18
export const PRIZE_DIVISIONS = [
  { division: 1, name: "Jackpot", match: "5+PB", probability: 1 / 62_617_698, excludeFromYield: true },
  { division: 2, name: "2nd", match: "5", probability: 17 / 62_617_698, excludeFromYield: false },
  { division: 3, name: "3rd", match: "4+PB", probability: 250 / 62_617_698, excludeFromYield: false },
  { division: 4, name: "4th", match: "4", probability: 4_250 / 62_617_698, excludeFromYield: false },
  { division: 5, name: "5th", match: "3+PB", probability: 12_250 / 62_617_698, excludeFromYield: false },
  { division: 6, name: "6th", match: "3", probability: 208_250 / 62_617_698, excludeFromYield: false },
  { division: 7, name: "7th", match: "2+PB", probability: 196_000 / 62_617_698, excludeFromYield: false },
  { division: 8, name: "8th", match: "1+PB", probability: 1_151_500 / 62_617_698, excludeFromYield: false },
  { division: 9, name: "9th", match: "PB", probability: 2_118_760 / 62_617_698, excludeFromYield: false },
];

export interface HistoricalDraw {
  drawNumber: number;
  date: string;
  totalPoolUSD: number;
  ngrUSD: number;
  totalTickets: number;
  yieldPerThousandSHFL: number;
  prizepoolSplit?: string;
  jackpotWon?: boolean;
  jackpotAmount?: number;
  singlesAdded?: number;
}

export interface YieldResult {
  weeklyExpectedUSD: number;
  annualExpectedUSD: number;
  effectiveAPY: number;
  ticketCount: number;
  stakingValueUSD: number;
}

/**
 * Parse prize pool split string into percentages
 * e.g., "30-14-8-9-7-6-5-10-11" → [30, 14, 8, 9, 7, 6, 5, 10, 11]
 */
export function parsePrizeSplit(splitString: string): number[] {
  return splitString.split("-").map(s => parseFloat(s));
}

/**
 * Calculate the non-jackpot percentage from a prize split
 * This is the portion of the pool that goes to divisions 2-9
 */
export function getNonJackpotPercentage(splitString: string): number {
  const splits = parsePrizeSplit(splitString);
  // Sum all except the first (jackpot) percentage
  const nonJackpot = splits.slice(1).reduce((sum, pct) => sum + pct, 0);
  return nonJackpot / 100; // Convert to decimal
}

/**
 * Calculate expected weekly yield for a given number of tickets
 * 
 * @param userTickets - Number of tickets the user has
 * @param totalTicketsInDraw - Total tickets in the draw
 * @param weeklyNGR - NGR added that week (+ singles * 0.85)
 * @param prizeSplit - Prize split string like "30-14-8-9-7-6-5-10-11"
 * @returns Expected USD earnings for the week (excluding jackpot)
 */
export function calculateWeeklyYield(
  userTickets: number,
  totalTicketsInDraw: number,
  weeklyNGR: number,
  prizeSplit: string
): number {
  if (userTickets === 0 || totalTicketsInDraw === 0) return 0;
  
  // Get the non-jackpot percentage (divisions 2-9)
  const nonJackpotPct = getNonJackpotPercentage(prizeSplit);
  
  // Pool available for yield = NGR × non-jackpot percentage
  const yieldablePool = weeklyNGR * nonJackpotPct;
  
  // User's share = their tickets / total tickets
  const userShare = userTickets / totalTicketsInDraw;
  
  // Expected weekly earnings
  return yieldablePool * userShare;
}

/**
 * Calculate full yield metrics for a given SHFL stake
 */
export function calculateYield(
  shflStaked: number,
  shflPriceUSD: number,
  weeklyNGR: number,
  totalTicketsInDraw: number,
  prizeSplit: string = "30-14-8-9-7-6-5-10-11"
): YieldResult {
  const ticketCount = Math.floor(shflStaked / SHFL_PER_TICKET);
  const stakingValueUSD = shflStaked * shflPriceUSD;
  
  if (ticketCount === 0 || totalTicketsInDraw === 0) {
    return {
      weeklyExpectedUSD: 0,
      annualExpectedUSD: 0,
      effectiveAPY: 0,
      ticketCount: 0,
      stakingValueUSD,
    };
  }
  
  // Calculate weekly expected earnings
  const weeklyExpectedUSD = calculateWeeklyYield(
    ticketCount,
    totalTicketsInDraw,
    weeklyNGR,
    prizeSplit
  );
  
  // Annualize
  const annualExpectedUSD = weeklyExpectedUSD * WEEKS_PER_YEAR;
  
  // Calculate APY
  const effectiveAPY = stakingValueUSD > 0 
    ? (annualExpectedUSD / stakingValueUSD) * 100 
    : 0;
  
  return {
    weeklyExpectedUSD,
    annualExpectedUSD,
    effectiveAPY,
    ticketCount,
    stakingValueUSD,
  };
}

/**
 * Calculate APY for display (based on 4-week average NGR)
 */
export function calculateGlobalAPY(
  avgWeeklyNGR: number,
  totalTicketsInDraw: number,
  shflPriceUSD: number,
  prizeSplit: string = "30-14-8-9-7-6-5-10-11"
): number {
  // Calculate yield for 1,000 SHFL (20 tickets) as baseline
  const baselineShfl = 1000;
  const result = calculateYield(
    baselineShfl,
    shflPriceUSD,
    avgWeeklyNGR,
    totalTicketsInDraw,
    prizeSplit
  );
  
  return result.effectiveAPY;
}

/**
 * Calculate yield per 1,000 SHFL staked for a specific draw
 */
export function calculateYieldPer1KSHFL(
  weeklyNGR: number,
  totalTicketsInDraw: number,
  prizeSplit: string = "30-14-8-9-7-6-5-10-11"
): number {
  const ticketsPer1K = Math.floor(1000 / SHFL_PER_TICKET); // 20 tickets
  return calculateWeeklyYield(ticketsPer1K, totalTicketsInDraw, weeklyNGR, prizeSplit);
}

/**
 * Generate yield sensitivity table
 */
export interface SensitivityCell {
  ngrMultiplier: number;
  priceMultiplier: number;
  apy: number;
}

export function generateSensitivityTable(
  baseNGR: number,
  basePriceUSD: number,
  totalTickets: number,
  prizeSplit: string = "30-14-8-9-7-6-5-10-11",
  ngrMultipliers: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
  priceMultipliers: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
): SensitivityCell[][] {
  const table: SensitivityCell[][] = [];
  
  for (const ngrMult of ngrMultipliers) {
    const row: SensitivityCell[] = [];
    for (const priceMult of priceMultipliers) {
      const adjustedNGR = baseNGR * ngrMult;
      const adjustedPrice = basePriceUSD * priceMult;
      
      const apy = calculateGlobalAPY(
        adjustedNGR,
        totalTickets,
        adjustedPrice,
        prizeSplit
      );
      
      row.push({
        ngrMultiplier: ngrMult,
        priceMultiplier: priceMult,
        apy,
      });
    }
    table.push(row);
  }
  
  return table;
}

/**
 * Calculate historical backfill - what would X SHFL have earned
 */
export function calculateHistoricalEarnings(
  shflStaked: number,
  historicalDraws: HistoricalDraw[]
): { draw: HistoricalDraw; earned: number }[] {
  const ticketCount = Math.floor(shflStaked / SHFL_PER_TICKET);
  
  return historicalDraws.map((draw) => {
    const earned = calculateWeeklyYield(
      ticketCount,
      draw.totalTickets,
      draw.ngrUSD,
      draw.prizepoolSplit || "30-14-8-9-7-6-5-10-11"
    );
    return { draw, earned };
  });
}

/**
 * Format numbers for display
 */
export function formatUSD(value: number, short: boolean = false): string {
  if (short) {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
  }
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value))}`;
}

/**
 * Format USD with short notation (K, M, B)
 */
export function formatUSDShort(value: number): string {
  return formatUSD(value, true);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
