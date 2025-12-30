/**
 * SHFLPro Calculations
 * 
 * Key mechanics:
 * - 1 Ticket = 50 SHFL staked (can unstake, tokens returned after next draw)
 * - Lottery: 5 numbers from 1-55, 1 powerball from 1-18
 * - Total combinations = C(55,5) × 18 = 62,617,698
 * - Prize pool split across 9 divisions (Jackpot excluded from yield)
 * 
 * IMPORTANT - NGR Data Interpretation:
 * The "NGR Added" shown in a draw's row on the lottery history page 
 * (https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history)
 * is added to the NEXT draw's prize pool, not that draw's.
 * Example: Draw 1's NGR Added ($100k) → Goes to Draw 2's prize pool
 * 
 * In our data, ngrUSD for a draw represents the actual NGR that was 
 * contributed to that draw's prize pool (from the previous draw's row).
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
  // ngrUSD = the actual NGR that contributed to THIS draw (from previous draw's row)
  ngrUSD: number;
  totalTickets: number;
  yieldPerThousandSHFL: number;
  // Historical SHFL price at the time of this draw (for accurate APY calculation)
  shflPriceAtDraw?: number;
  // Historical APY calculated using the price at time of draw
  historicalAPY?: number;
  prizepoolSplit?: string;
  jackpotWon?: boolean;
  jackpotAmount?: number;
  jackpotted?: number; // The jackpot pool amount after the draw
  singlesAdded?: number;
  // postedNgrUSD = what's shown in this draw's row (goes to NEXT draw)
  postedNgrUSD?: number;
  postedSinglesAdded?: number;
  // Adjusted NGR for yield calculation (after removing jackpot replenishment)
  adjustedNgrUSD?: number;
  jackpotReplenishment?: number;
  prevJackpotWon?: boolean;
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
 * Check if a draw had its jackpot won based on the jackpotted amount
 * A very low jackpotted amount relative to prize pool indicates jackpot was won
 */
export function wasJackpotWon(jackpotted: number, prizePool: number): boolean {
  if (prizePool === 0) return false;
  const ratio = jackpotted / prizePool;
  return ratio < 0.1; // Less than 10% means jackpot was won
}

/**
 * Calculate expected weekly yield using proper expected value math
 * 
 * For each division (excluding jackpot):
 *   1. Division NGR = weeklyNGR × division_percentage
 *   2. Expected winners = totalTickets × probability_of_division
 *   3. Prize per winner = Division NGR / Expected winners
 *   4. User's EV = userTickets × probability × prize_per_winner
 * 
 * Mathematically this simplifies to:
 *   User's EV per division = userTickets × Division NGR / totalTickets
 *   Total EV = userTickets × (NGR × nonJackpotPct) / totalTickets
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
  if (userTickets === 0 || totalTicketsInDraw === 0 || weeklyNGR === 0) return 0;
  
  // Parse the prize split percentages
  const splitPcts = parsePrizeSplit(prizeSplit);
  
  // Calculate expected value for each division using probabilities
  let totalExpectedValue = 0;
  
  for (let i = 0; i < PRIZE_DIVISIONS.length; i++) {
    const division = PRIZE_DIVISIONS[i];
    
    // Skip jackpot (division 1) - too unlikely to include in yield
    if (division.excludeFromYield) continue;
    
    // Get the percentage of NGR allocated to this division
    const divisionPct = (splitPcts[i] || 0) / 100;
    
    // NGR contribution to this division's pool
    const divisionNGR = weeklyNGR * divisionPct;
    
    // Expected number of winners in this division
    // = total tickets × probability of winning this division
    const expectedWinners = Math.max(1, totalTicketsInDraw * division.probability);
    
    // Average prize per winner in this division
    const prizePerWinner = divisionNGR / expectedWinners;
    
    // User's expected value from this division
    // = probability of winning × prize if won × number of tickets
    const userExpectedValue = division.probability * prizePerWinner * userTickets;
    
    totalExpectedValue += userExpectedValue;
  }
  
  return totalExpectedValue;
}

/**
 * Calculate full yield metrics for a given SHFL stake
 * 
 * Weekly Expected USD = sum of expected value across divisions 2-9
 * Annual APY = (Weekly Expected USD × 52) / Staking Value USD × 100
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
  
  if (ticketCount === 0 || totalTicketsInDraw === 0 || weeklyNGR === 0) {
    return {
      weeklyExpectedUSD: 0,
      annualExpectedUSD: 0,
      effectiveAPY: 0,
      ticketCount: 0,
      stakingValueUSD,
    };
  }
  
  // Calculate weekly expected earnings using probability-based EV
  const weeklyExpectedUSD = calculateWeeklyYield(
    ticketCount,
    totalTicketsInDraw,
    weeklyNGR,
    prizeSplit
  );
  
  // Annualize: multiply by 52 weeks
  const annualExpectedUSD = weeklyExpectedUSD * WEEKS_PER_YEAR;
  
  // Calculate APY: annual return as percentage of staking value
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
 * Uses 20 tickets (1000 SHFL / 50 SHFL per ticket)
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
 * Calculate historical APY using the SHFL price at the time of the draw
 * APY = (Weekly Yield USD × 52) / (1000 SHFL × price) × 100
 */
export function calculateHistoricalAPY(
  yieldPerThousandSHFL: number,
  shflPriceAtDraw: number
): number {
  if (shflPriceAtDraw <= 0 || yieldPerThousandSHFL <= 0) return 0;
  
  // Value of 1,000 SHFL at the time of the draw
  const stakingValueUSD = 1000 * shflPriceAtDraw;
  
  // Annualized yield: weekly × 52 weeks
  const annualYieldUSD = yieldPerThousandSHFL * WEEKS_PER_YEAR;
  
  // APY as percentage
  return (annualYieldUSD / stakingValueUSD) * 100;
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
 * Format number in compact notation (e.g., $270M, $1.2B, $50K)
 * Used on mobile to save space
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1_000_000_000) {
    return sign + "$" + (absValue / 1_000_000_000).toFixed(1) + "B";
  } else if (absValue >= 1_000_000) {
    return sign + "$" + (absValue / 1_000_000).toFixed(0) + "M";
  } else if (absValue >= 1_000) {
    return sign + "$" + (absValue / 1_000).toFixed(0) + "K";
  } else {
    return sign + "$" + absValue.toFixed(0);
  }
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Calculate Expected Value for different ticket types
 */

// Powerplay probabilities (guaranteed powerball)
// Only divisions that require powerball, but with 100% PB probability
export const POWERPLAY_PROBABILITIES = [
  { division: 1, name: "Jackpot", match: "5+PB", probability: 1 / 3_478_761 },
  { division: 3, name: "3rd", match: "4+PB", probability: 250 / 3_478_761 },
  { division: 5, name: "5th", match: "3+PB", probability: 12_250 / 3_478_761 },
  { division: 7, name: "7th", match: "2+PB", probability: 196_000 / 3_478_761 },
  { division: 8, name: "8th", match: "1+PB", probability: 1_151_500 / 3_478_761 },
  { division: 9, name: "9th", match: "PB", probability: 2_118_760 / 3_478_761 },
];

export interface EVResult {
  ticketType: string;
  cost: number;
  expectedPrize: number;
  ev: number; // Expected Value = expectedPrize - cost
  evPercent: number; // EV as percentage of cost
  breakdowns: { division: number; name: string; probability: number; expectedPrize: number; contribution: number }[];
}

/**
 * Calculate prize allocation for each division based on pool and split
 */
export function calculatePrizeAllocation(
  totalPool: number,
  prizeSplit: string
): { division: number; poolAmount: number; percentage: number }[] {
  const splits = prizeSplit.split('-').map(s => parseFloat(s));
  
  return splits.map((percentage, index) => ({
    division: index + 1,
    poolAmount: (totalPool * percentage) / 100,
    percentage,
  }));
}

/**
 * Calculate EV for a Standard Ticket ($0.25)
 * 
 * Note: 85% of ticket sales go to the prize pool (15% house edge).
 * The totalPool parameter already reflects this - it's the actual prize money available.
 * This means purchased tickets inherently have negative EV due to the house edge.
 */
export function calculateStandardTicketEV(
  totalPool: number,
  prizeSplit: string,
  totalTickets: number
): EVResult {
  const cost = 0.25;
  const allocations = calculatePrizeAllocation(totalPool, prizeSplit);
  
  const breakdowns = PRIZE_DIVISIONS.map((div) => {
    const allocation = allocations.find(a => a.division === div.division);
    const poolAmount = allocation?.poolAmount || 0;
    
    // Expected winners = totalTickets * probability
    const expectedWinners = Math.max(1, totalTickets * div.probability);
    // Expected prize per winner
    const expectedPrize = poolAmount / expectedWinners;
    // Contribution to EV = probability * expected prize
    const contribution = div.probability * expectedPrize;
    
    return {
      division: div.division,
      name: div.name,
      probability: div.probability,
      expectedPrize,
      contribution,
    };
  });
  
  const expectedPrize = breakdowns.reduce((sum, b) => sum + b.contribution, 0);
  const ev = expectedPrize - cost;
  const evPercent = (ev / cost) * 100;
  
  return {
    ticketType: "Standard Ticket",
    cost,
    expectedPrize,
    ev,
    evPercent,
    breakdowns,
  };
}

/**
 * Calculate EV for a Powerplay Ticket ($4)
 * Guarantees the powerball number
 */
export function calculatePowerplayTicketEV(
  totalPool: number,
  prizeSplit: string,
  totalTickets: number
): EVResult {
  const cost = 4.00;
  const allocations = calculatePrizeAllocation(totalPool, prizeSplit);
  
  const breakdowns = POWERPLAY_PROBABILITIES.map((div) => {
    const allocation = allocations.find(a => a.division === div.division);
    const poolAmount = allocation?.poolAmount || 0;
    
    // For powerplay, estimate winners based on standard probability
    const standardDiv = PRIZE_DIVISIONS.find(d => d.division === div.division);
    const expectedWinners = Math.max(1, totalTickets * (standardDiv?.probability || div.probability));
    const expectedPrize = poolAmount / expectedWinners;
    const contribution = div.probability * expectedPrize;
    
    return {
      division: div.division,
      name: div.name,
      probability: div.probability,
      expectedPrize,
      contribution,
    };
  });
  
  const expectedPrize = breakdowns.reduce((sum, b) => sum + b.contribution, 0);
  const ev = expectedPrize - cost;
  const evPercent = (ev / cost) * 100;
  
  return {
    ticketType: "Powerplay Ticket",
    cost,
    expectedPrize,
    ev,
    evPercent,
    breakdowns,
  };
}

/**
 * Calculate EV for a Staked Ticket (50 SHFL)
 * Staked tokens give lottery entries each draw (can unstake, tokens returned after next draw)
 */
export function calculateStakedTicketEV(
  totalPool: number,
  prizeSplit: string,
  totalTickets: number,
  shflPrice: number
): EVResult & { weeksToBreakeven: number; annualROI: number } {
  const cost = 50 * shflPrice;
  const allocations = calculatePrizeAllocation(totalPool, prizeSplit);
  
  const breakdowns = PRIZE_DIVISIONS.map((div) => {
    const allocation = allocations.find(a => a.division === div.division);
    const poolAmount = allocation?.poolAmount || 0;
    
    const expectedWinners = Math.max(1, totalTickets * div.probability);
    const expectedPrize = poolAmount / expectedWinners;
    const contribution = div.probability * expectedPrize;
    
    return {
      division: div.division,
      name: div.name,
      probability: div.probability,
      expectedPrize,
      contribution,
    };
  });
  
  // EV per draw (same as standard ticket)
  const expectedPrizePerDraw = breakdowns.reduce((sum, b) => sum + b.contribution, 0);
  
  // For staked tickets, calculate weeks to break even and annual ROI
  const weeksToBreakeven = expectedPrizePerDraw > 0 ? cost / expectedPrizePerDraw : Infinity;
  const annualExpected = expectedPrizePerDraw * 52;
  const annualROI = (annualExpected / cost) * 100;
  
  return {
    ticketType: "Staked Ticket",
    cost,
    expectedPrize: expectedPrizePerDraw,
    ev: expectedPrizePerDraw, // Per draw EV (cost is already sunk)
    evPercent: (expectedPrizePerDraw / cost) * 100 * 52, // Annualized
    breakdowns,
    weeksToBreakeven,
    annualROI,
  };
}
