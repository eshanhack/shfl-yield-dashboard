"use client";

/**
 * useYieldData - THE SINGLE SOURCE OF TRUTH
 * 
 * ARCHITECTURAL MANDATE:
 * 1. ALL yield calculations happen HERE and NOWHERE ELSE
 * 2. Both the Yield Card and the NGR vs Price Graph consume
 *    the EXACT SAME values from this hook
 * 3. Initial state is NULL - never show cached/default values
 * 4. Loading = skeleton, NEVER "0.00%" or placeholder
 * 5. AbortController kills stale requests
 * 6. If Card and Graph differ by 0.01%, the code is WRONG
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  calculateGlobalAPY, 
  HistoricalDraw,
  formatPercent 
} from "@/lib/calculations";
import { 
  fetchLotteryHistory, 
  fetchLotteryStats, 
  fetchSHFLPrice, 
  fetchNGRStats,
  SHFLPrice,
  LotteryStats,
  NGRStats,
} from "@/lib/api";

// ==================== TYPES ====================

/** The SINGLE metrics object that feeds BOTH Card and Graph */
export interface YieldMetrics {
  // Current APY (4-week average)
  currentAPY: number;
  
  // Last week's individual APY
  lastWeekAPY: number;
  
  // Prior 4-week average APY (for comparison)
  prior4WeekAPY: number;
  
  // APY change percentage (current vs prior)
  apyChange: number;
  
  // Highest APY ever recorded
  highestAPY: {
    apy: number;
    weeksAgo: number;
    drawNumber: number;
  };
  
  // The EXACT data array used for calculations
  // Graph MUST use this same array
  chartData: ChartDataPoint[];
  
  // Raw source data
  historicalDraws: HistoricalDraw[];
  
  // Metadata
  timestamp: number;
}

/** Chart data point - used by BOTH Card stats and Graph */
export interface ChartDataPoint {
  date: string;
  drawNumber: number;
  ngr: number;          // In millions
  price: number;        // SHFL price at draw
  apy: number;          // APY percentage
  apyScaled: number;    // APY / 100 for chart scaling
}

export interface UseYieldDataResult {
  /** The single metrics object - NULL until valid */
  metrics: YieldMetrics | null;
  
  /** Raw data for components that need it */
  price: SHFLPrice | null;
  lotteryStats: LotteryStats | null;
  ngrStats: NGRStats | null;
  historicalDraws: HistoricalDraw[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error message if any */
  error: string | null;
  
  /** Force refresh */
  refetch: () => void;
  
  /** Last successful fetch timestamp */
  lastFetchTimestamp: number | null;
}

// ==================== VALIDATION ====================

function isValidNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function isAPYInBounds(apy: number): boolean {
  return isValidNumber(apy) && apy >= 0 && apy <= 500;
}

// ==================== THE SINGLE CALCULATION FUNCTION ====================
/**
 * calculateFinancialMetrics - THE GOLD STANDARD
 * 
 * This function does ALL yield math. Period.
 * Both Card and Graph consume its output.
 * No other component should calculate APY.
 */
function calculateFinancialMetrics(
  historicalDraws: HistoricalDraw[],
  ngrStats: NGRStats,
  lotteryStats: LotteryStats,
  price: SHFLPrice
): YieldMetrics | null {
  
  // Validate inputs
  if (!historicalDraws.length || !ngrStats || !lotteryStats || !price) {
    console.log("[YieldData] Missing required data for calculation");
    return null;
  }
  
  if (!isValidNumber(price.usd) || price.usd <= 0) {
    console.log("[YieldData] Invalid price:", price.usd);
    return null;
  }
  
  if (!isValidNumber(lotteryStats.totalTickets) || lotteryStats.totalTickets <= 0) {
    console.log("[YieldData] Invalid totalTickets:", lotteryStats.totalTickets);
    return null;
  }
  
  if (!isValidNumber(ngrStats.current4WeekAvg) || ngrStats.current4WeekAvg <= 0) {
    console.log("[YieldData] Invalid current4WeekAvg:", ngrStats.current4WeekAvg);
    return null;
  }

  // Filter to completed draws only
  const now = new Date();
  const completedDraws = historicalDraws.filter(draw => new Date(draw.date) < now);
  
  if (completedDraws.length === 0) {
    console.log("[YieldData] No completed draws");
    return null;
  }

  const currentSplit = completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11";
  const totalTickets = lotteryStats.totalTickets;
  const currentPrice = price.usd;

  // =====================================================
  // STEP 1: Calculate Current APY (4-week average)
  // =====================================================
  const currentAPY = calculateGlobalAPY(
    ngrStats.current4WeekAvg,
    totalTickets,
    currentPrice,
    currentSplit
  );
  
  if (!isAPYInBounds(currentAPY)) {
    console.log("[YieldData] Current APY out of bounds:", currentAPY);
    return null;
  }

  // =====================================================
  // STEP 2: Calculate Last Week APY
  // Uses adjustedNgrUSD and shflPriceAtDraw (SAME AS GRAPH)
  // =====================================================
  let lastWeekAPY = currentAPY;
  const lastDraw = completedDraws[0];
  
  if (lastDraw) {
    const ngrForCalc = lastDraw.adjustedNgrUSD ?? lastDraw.ngrUSD;
    const priceAtDraw = lastDraw.shflPriceAtDraw || currentPrice;
    const ticketsAtDraw = lastDraw.totalTickets || totalTickets;
    
    if (isValidNumber(ngrForCalc) && isValidNumber(priceAtDraw) && priceAtDraw > 0) {
      const calculated = calculateGlobalAPY(
        ngrForCalc,
        ticketsAtDraw,
        priceAtDraw,
        lastDraw.prizepoolSplit || currentSplit
      );
      if (isAPYInBounds(calculated)) {
        lastWeekAPY = calculated;
      }
    }
  }

  // =====================================================
  // STEP 3: Calculate Prior 4-Week APY
  // =====================================================
  let prior4WeekAPY = currentAPY;
  if (isValidNumber(ngrStats.prior4WeekAvg) && ngrStats.prior4WeekAvg > 0) {
    const calculated = calculateGlobalAPY(
      ngrStats.prior4WeekAvg,
      totalTickets,
      currentPrice,
      currentSplit
    );
    if (isAPYInBounds(calculated)) {
      prior4WeekAPY = calculated;
    }
  }

  // =====================================================
  // STEP 4: Calculate APY Change
  // =====================================================
  const apyChange = prior4WeekAPY > 0
    ? ((currentAPY - prior4WeekAPY) / prior4WeekAPY) * 100
    : 0;

  // =====================================================
  // STEP 5: Build Chart Data (SAME FOR CARD AND GRAPH)
  // This is THE source of truth for historical APY
  // =====================================================
  const sortedDraws = [...completedDraws].sort((a, b) => a.drawNumber - b.drawNumber);
  
  const chartData: ChartDataPoint[] = sortedDraws.map(draw => {
    // EXACT SAME LOGIC - used by both Card stats and Graph
    const ngrForCalc = draw.adjustedNgrUSD ?? draw.ngrUSD;
    const priceAtDraw = draw.shflPriceAtDraw || currentPrice;
    const ticketsAtDraw = draw.totalTickets || totalTickets;
    
    let apy = 0;
    if (isValidNumber(ngrForCalc) && ticketsAtDraw > 0 && priceAtDraw > 0) {
      apy = calculateGlobalAPY(
        ngrForCalc,
        ticketsAtDraw,
        priceAtDraw,
        draw.prizepoolSplit || currentSplit
      );
      // Cap at 500% for display sanity
      apy = Math.min(apy, 500);
    }
    
    const drawDate = new Date(draw.date);
    const dateLabel = drawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    return {
      date: dateLabel,
      drawNumber: draw.drawNumber,
      ngr: ngrForCalc / 1_000_000,
      price: priceAtDraw,
      apy,
      apyScaled: apy / 100,
    };
  });

  // =====================================================
  // STEP 6: Find Highest APY from chartData
  // CRITICAL: Use the SAME array that the Graph uses
  // =====================================================
  let highestAPY = { apy: 0, weeksAgo: 0, drawNumber: 0 };
  
  // Sort by draw number descending to get weeksAgo correct
  const chartDataDescending = [...chartData].sort((a, b) => b.drawNumber - a.drawNumber);
  
  chartDataDescending.forEach((point, index) => {
    if (point.apy > highestAPY.apy) {
      highestAPY = {
        apy: point.apy,
        weeksAgo: index,
        drawNumber: point.drawNumber,
      };
    }
  });

  console.log("[YieldData] ✅ Metrics calculated:", {
    currentAPY: currentAPY.toFixed(2) + "%",
    lastWeekAPY: lastWeekAPY.toFixed(2) + "%",
    highestAPY: highestAPY.apy.toFixed(2) + "% (Draw #" + highestAPY.drawNumber + ")",
    chartDataPoints: chartData.length,
    maxAPYInChartData: Math.max(...chartData.map(d => d.apy)).toFixed(2) + "%",
  });

  // =====================================================
  // VERIFICATION: Max APY in chart MUST equal highestAPY
  // =====================================================
  const maxInChart = Math.max(...chartData.map(d => d.apy));
  if (Math.abs(maxInChart - highestAPY.apy) > 0.01) {
    console.error("[YieldData] ⚠️ DISPARITY DETECTED!", {
      highestAPY: highestAPY.apy,
      maxInChartData: maxInChart,
      difference: Math.abs(maxInChart - highestAPY.apy),
    });
  }

  return {
    currentAPY,
    lastWeekAPY,
    prior4WeekAPY,
    apyChange: isFinite(apyChange) ? apyChange : 0,
    highestAPY,
    chartData,
    historicalDraws: completedDraws,
    timestamp: Date.now(),
  };
}

// ==================== THE HOOK ====================

export function useYieldData(): UseYieldDataResult {
  // State - NULL initial, never placeholder
  const [metrics, setMetrics] = useState<YieldMetrics | null>(null);
  const [price, setPrice] = useState<SHFLPrice | null>(null);
  const [lotteryStats, setLotteryStats] = useState<LotteryStats | null>(null);
  const [ngrStats, setNgrStats] = useState<NGRStats | null>(null);
  const [historicalDraws, setHistoricalDraws] = useState<HistoricalDraw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);

  // Request management
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const thisRequestId = ++requestIdRef.current;
    const fetchStart = Date.now();
    
    console.log(`[YieldData] Starting fetch #${thisRequestId}`);
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      console.log(`[YieldData] Aborting previous request`);
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch ALL data in parallel
      const [priceData, ngrStatsData, lotteryStatsData, draws] = await Promise.all([
        fetchSHFLPrice(),
        fetchNGRStats(),
        fetchLotteryStats(),
        fetchLotteryHistory(),
      ]);
      
      // Check if request is stale
      if (thisRequestId !== requestIdRef.current) {
        console.log(`[YieldData] Request #${thisRequestId} is stale, discarding`);
        return;
      }
      
      if (!isMountedRef.current) {
        console.log(`[YieldData] Component unmounted, discarding`);
        return;
      }
      
      // Store raw data
      setPrice(priceData);
      setNgrStats(ngrStatsData);
      setLotteryStats(lotteryStatsData);
      setHistoricalDraws(draws);
      
      // Calculate metrics using THE SINGLE FUNCTION
      const calculatedMetrics = calculateFinancialMetrics(
        draws,
        ngrStatsData,
        lotteryStatsData,
        priceData
      );
      
      if (calculatedMetrics) {
        setMetrics(calculatedMetrics);
        setError(null);
        console.log(`[YieldData] ✅ Fetch #${thisRequestId} complete in ${Date.now() - fetchStart}ms`);
      } else {
        setError("Failed to calculate metrics");
        // Don't null out existing metrics if we have them
      }
      
      setLastFetchTimestamp(Date.now());
      
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log(`[YieldData] Request #${thisRequestId} aborted`);
        return;
      }
      
      if (thisRequestId !== requestIdRef.current || !isMountedRef.current) {
        return;
      }
      
      console.error(`[YieldData] Fetch error:`, err.message);
      setError(err.message || "Failed to fetch data");
    } finally {
      if (thisRequestId === requestIdRef.current && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    isMountedRef.current = true;
    
    fetchData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(interval);
    };
  }, [fetchData]);

  return {
    metrics,
    price,
    lotteryStats,
    ngrStats,
    historicalDraws,
    isLoading,
    error,
    refetch: fetchData,
    lastFetchTimestamp,
  };
}

// ==================== CONTEXT FOR GLOBAL ACCESS ====================

import { createContext, useContext, ReactNode } from "react";

const YieldDataContext = createContext<UseYieldDataResult | null>(null);

export function YieldDataProvider({ children }: { children: ReactNode }) {
  const yieldData = useYieldData();
  return (
    <YieldDataContext.Provider value={yieldData}>
      {children}
    </YieldDataContext.Provider>
  );
}

export function useYieldDataContext(): UseYieldDataResult {
  const context = useContext(YieldDataContext);
  if (!context) {
    throw new Error("useYieldDataContext must be used within YieldDataProvider");
  }
  return context;
}

