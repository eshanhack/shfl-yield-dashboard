/**
 * SHFL Yield Calculations
 * 
 * Key mechanics:
 * - 1 Ticket = 50 SHFL staked (permanent, non-withdrawable)
 * - Prize Pool = 15% of Shuffle.com Weekly Net Gaming Revenue (NGR)
 * - Weekly lottery distribution to ticket holders
 */

// Prize tier structure for SHFL Lottery
export interface PrizeTier {
  tier: number;
  name: string;
  matchCount: number;
  prizePercentage: number;
  odds: number; // 1 in X chance
}

export const PRIZE_TIERS: PrizeTier[] = [
  { tier: 1, name: "Jackpot", matchCount: 6, prizePercentage: 50, odds: 15890700 },
  { tier: 2, name: "5+1 Match", matchCount: 5.5, prizePercentage: 15, odds: 2648450 },
  { tier: 3, name: "5 Match", matchCount: 5, prizePercentage: 10, odds: 39312 },
  { tier: 4, name: "4+1 Match", matchCount: 4.5, prizePercentage: 8, odds: 9828 },
  { tier: 5, name: "4 Match", matchCount: 4, prizePercentage: 7, odds: 728 },
  { tier: 6, name: "3+1 Match", matchCount: 3.5, prizePercentage: 5, odds: 364 },
  { tier: 7, name: "3 Match", matchCount: 3, prizePercentage: 3, odds: 45.6 },
  { tier: 8, name: "2+1 Match", matchCount: 2.5, prizePercentage: 2, odds: 22.8 },
];

// Constants
export const SHFL_PER_TICKET = 50;
export const NGR_POOL_PERCENTAGE = 0.15; // 15% of NGR goes to prize pool
export const WEEKS_PER_YEAR = 52;

export interface YieldResult {
  weeklyExpectedUSD: number;
  annualExpectedUSD: number;
  effectiveAPY: number;
  ticketCount: number;
  stakingValueUSD: number;
}

export interface HistoricalDraw {
  drawNumber: number;
  date: string;
  totalPoolUSD: number;
  ngrUSD: number;
  totalTickets: number;
  yieldPerThousandSHFL: number;
}

/**
 * Calculate expected value per ticket based on prize tiers
 * This uses a simplified model - actual EV depends on jackpot rollover
 */
export function calculateExpectedValuePerTicket(totalPoolUSD: number, totalTickets: number): number {
  if (totalTickets === 0) return 0;
  
  let expectedValue = 0;
  
  for (const tier of PRIZE_TIERS) {
    // Probability of winning this tier
    const probability = 1 / tier.odds;
    // Share of prize pool for this tier
    const tierPool = totalPoolUSD * (tier.prizePercentage / 100);
    // Expected winners at this tier (rough estimate based on total tickets)
    const expectedWinners = Math.max(1, totalTickets * probability);
    // Prize per winner
    const prizePerWinner = tierPool / expectedWinners;
    // Add to expected value
    expectedValue += probability * prizePerWinner;
  }
  
  return expectedValue;
}

/**
 * Calculate yield metrics for a given SHFL stake
 */
export function calculateYield(
  shflStaked: number,
  shflPriceUSD: number,
  weeklyNGR_USD: number,
  totalTicketsInPool: number
): YieldResult {
  const ticketCount = Math.floor(shflStaked / SHFL_PER_TICKET);
  const stakingValueUSD = shflStaked * shflPriceUSD;
  
  if (ticketCount === 0 || totalTicketsInPool === 0) {
    return {
      weeklyExpectedUSD: 0,
      annualExpectedUSD: 0,
      effectiveAPY: 0,
      ticketCount: 0,
      stakingValueUSD,
    };
  }
  
  // Weekly prize pool is 15% of NGR
  const weeklyPoolUSD = weeklyNGR_USD * NGR_POOL_PERCENTAGE;
  
  // Calculate expected value per ticket
  const evPerTicket = calculateExpectedValuePerTicket(weeklyPoolUSD, totalTicketsInPool);
  
  // User's expected weekly winnings
  const weeklyExpectedUSD = evPerTicket * ticketCount;
  
  // Annual projection
  const annualExpectedUSD = weeklyExpectedUSD * WEEKS_PER_YEAR;
  
  // Effective APY
  const effectiveAPY = stakingValueUSD > 0 ? (annualExpectedUSD / stakingValueUSD) * 100 : 0;
  
  return {
    weeklyExpectedUSD,
    annualExpectedUSD,
    effectiveAPY,
    ticketCount,
    stakingValueUSD,
  };
}

/**
 * Calculate simple pool-share yield (alternative simpler model)
 * This assumes all pool is distributed proportionally to tickets
 */
export function calculateSimpleYield(
  shflStaked: number,
  shflPriceUSD: number,
  weeklyNGR_USD: number,
  totalTicketsInPool: number
): YieldResult {
  const ticketCount = Math.floor(shflStaked / SHFL_PER_TICKET);
  const stakingValueUSD = shflStaked * shflPriceUSD;
  
  if (ticketCount === 0 || totalTicketsInPool === 0) {
    return {
      weeklyExpectedUSD: 0,
      annualExpectedUSD: 0,
      effectiveAPY: 0,
      ticketCount: 0,
      stakingValueUSD,
    };
  }
  
  const weeklyPoolUSD = weeklyNGR_USD * NGR_POOL_PERCENTAGE;
  const userShare = ticketCount / totalTicketsInPool;
  const weeklyExpectedUSD = weeklyPoolUSD * userShare;
  const annualExpectedUSD = weeklyExpectedUSD * WEEKS_PER_YEAR;
  const effectiveAPY = stakingValueUSD > 0 ? (annualExpectedUSD / stakingValueUSD) * 100 : 0;
  
  return {
    weeklyExpectedUSD,
    annualExpectedUSD,
    effectiveAPY,
    ticketCount,
    stakingValueUSD,
  };
}

/**
 * Calculate 4-week moving average APY
 */
export function calculateMovingAverageAPY(
  historicalDraws: HistoricalDraw[],
  shflPriceUSD: number,
  totalTicketsInPool: number
): number {
  if (historicalDraws.length === 0) return 0;
  
  const recentDraws = historicalDraws.slice(0, 4);
  const avgWeeklyPool = recentDraws.reduce((sum, d) => sum + d.totalPoolUSD, 0) / recentDraws.length;
  
  // Calculate yield per 1000 SHFL
  const ticketsPer1000 = 1000 / SHFL_PER_TICKET; // 20 tickets
  const stakingValue = 1000 * shflPriceUSD;
  
  if (totalTicketsInPool === 0 || stakingValue === 0) return 0;
  
  const userShare = ticketsPer1000 / totalTicketsInPool;
  const weeklyExpected = avgWeeklyPool * userShare;
  const annualExpected = weeklyExpected * WEEKS_PER_YEAR;
  
  return (annualExpected / stakingValue) * 100;
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
  baseNGR_USD: number,
  basePriceUSD: number,
  totalTicketsInPool: number,
  ngrMultipliers: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
  priceMultipliers: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
): SensitivityCell[][] {
  const table: SensitivityCell[][] = [];
  
  for (const ngrMult of ngrMultipliers) {
    const row: SensitivityCell[] = [];
    for (const priceMult of priceMultipliers) {
      const adjustedNGR = baseNGR_USD * ngrMult;
      const adjustedPrice = basePriceUSD * priceMult;
      
      const result = calculateSimpleYield(
        1000, // Base 1000 SHFL
        adjustedPrice,
        adjustedNGR,
        totalTicketsInPool
      );
      
      row.push({
        ngrMultiplier: ngrMult,
        priceMultiplier: priceMult,
        apy: result.effectiveAPY,
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
    const userShare = draw.totalTickets > 0 ? ticketCount / draw.totalTickets : 0;
    const earned = draw.totalPoolUSD * userShare;
    return { draw, earned };
  });
}

/**
 * Format numbers for display
 */
export function formatUSD(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

