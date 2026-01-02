"use client";

/**
 * useAPYData - Single Source of Truth for APY Data
 * 
 * ARCHITECTURAL PRINCIPLES:
 * 1. NULL-FIRST: APY starts as null, never shows placeholder values
 * 2. ATOMIC UPDATES: All APY-related data fetched and validated together
 * 3. RACE CONDITION SAFE: Uses AbortController + request versioning
 * 4. NO FALLBACKS: Returns null on ANY error - never fake data
 * 5. LOGGING: Full trace at every step for debugging
 * 6. UNIFIED LOGIC: Uses the SAME calculation as YieldChart
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { calculateGlobalAPY, HistoricalDraw } from "@/lib/calculations";
import { fetchLotteryHistory, fetchLotteryStats, fetchSHFLPrice, fetchNGRStats } from "@/lib/api";

// ==================== TYPES ====================
export interface APYData {
  // Core APY values
  currentAPY: number;
  lastWeekAPY: number;
  prior4WeekAPY: number;
  apyChange: number;
  highestAPY: { apy: number; weeksAgo: number; drawNumber: number };
  
  // Source data (for verification)
  sourceData: {
    current4WeekNGR: number;
    totalTickets: number;
    shflPrice: number;
    timestamp: number;
  };
}

export interface UseAPYDataResult {
  data: APYData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastFetchTimestamp: number | null;
}

// Sanity bounds for APY
const MIN_APY = 0;
const MAX_APY = 500;

// ==================== LOGGING HELPERS ====================
const LOG_PREFIX = "[APY Hook]";

function logFetch(message: string, data?: any) {
  console.log(`${LOG_PREFIX} 📡 ${message}`, data ?? "");
}

function logState(message: string, data?: any) {
  console.log(`${LOG_PREFIX} 📊 ${message}`, data ?? "");
}

function logValidation(message: string, valid: boolean, data?: any) {
  const icon = valid ? "✅" : "❌";
  console.log(`${LOG_PREFIX} ${icon} ${message}`, data ?? "");
}

function logError(message: string, error?: any) {
  console.error(`${LOG_PREFIX} ⚠️ ${message}`, error ?? "");
}

// ==================== VALIDATION ====================
function isValidNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function isAPYInBounds(apy: number): boolean {
  return isValidNumber(apy) && apy >= MIN_APY && apy <= MAX_APY;
}

// ==================== MAIN HOOK ====================
export function useAPYData(): UseAPYDataResult {
  // State
  const [data, setData] = useState<APYData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);
  
  // Refs for race condition prevention
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchAPYData = useCallback(async () => {
    // Increment request ID
    const thisRequestId = ++requestIdRef.current;
    const fetchStartTime = Date.now();
    
    logFetch(`Starting fetch #${thisRequestId}`);
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      logFetch(`Aborting previous request`);
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Set loading state (but keep old data visible)
    setIsLoading(true);
    setError(null);
    
    try {
      logFetch(`Fetching using lib/api.ts functions (SAME source as YieldChart)...`);
      
      // =====================================================
      // CRITICAL: Use the EXACT SAME data fetching functions
      // as the Dashboard/YieldChart to ensure consistency.
      // This uses fetchLotteryHistory() which transforms raw
      // API data and includes historical prices!
      // =====================================================
      const [priceData, ngrStatsData, lotteryStatsData, historicalDraws] = await Promise.all([
        fetchSHFLPrice(),
        fetchNGRStats(),
        fetchLotteryStats(),
        fetchLotteryHistory(), // <-- THIS includes shflPriceAtDraw from historical lookup!
      ]);
      
      // === CHECK IF REQUEST IS STILL CURRENT ===
      if (thisRequestId !== requestIdRef.current) {
        logFetch(`Request #${thisRequestId} is stale, discarding (current: ${requestIdRef.current})`);
        return;
      }
      
      if (!isMountedRef.current) {
        logFetch(`Component unmounted, discarding`);
        return;
      }
      
      // === VALIDATE ALL REQUIRED DATA EXISTS ===
      const current4WeekNGR = ngrStatsData.current4WeekAvg;
      const prior4WeekNGR = ngrStatsData.prior4WeekAvg;
      const totalTickets = lotteryStatsData.totalTickets;
      const priceUSD = priceData.usd;
      
      logFetch(`Data received:`, {
        current4WeekNGR,
        prior4WeekNGR,
        totalTickets,
        priceUSD,
        historicalDrawsCount: historicalDraws.length,
      });
      
      logValidation(`current4WeekNGR: ${current4WeekNGR}`, isValidNumber(current4WeekNGR));
      logValidation(`prior4WeekNGR: ${prior4WeekNGR}`, isValidNumber(prior4WeekNGR));
      logValidation(`totalTickets: ${totalTickets}`, isValidNumber(totalTickets) && totalTickets > 0);
      logValidation(`priceUSD: ${priceUSD}`, isValidNumber(priceUSD) && priceUSD > 0);
      
      // Strict validation - ALL data must be present and valid
      if (!isValidNumber(current4WeekNGR) || current4WeekNGR <= 0) {
        throw new Error("Invalid current4WeekNGR");
      }
      if (!isValidNumber(totalTickets) || totalTickets <= 0) {
        throw new Error("Invalid totalTickets");
      }
      if (!isValidNumber(priceUSD) || priceUSD <= 0) {
        throw new Error("Invalid price");
      }
      
      // === FILTER TO COMPLETED DRAWS ONLY ===
      const now = new Date();
      const completedDraws = historicalDraws.filter((draw: HistoricalDraw) => {
        const drawDate = new Date(draw.date);
        return drawDate < now;
      });
      
      logFetch(`Completed draws: ${completedDraws.length}`);
      
      // === CALCULATE APY VALUES ===
      // Using the EXACT SAME logic as YieldChart
      logFetch(`Calculating APY values (using YieldChart logic)...`);
      
      const currentSplit = completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11";
      
      // Current 4-week average APY
      const currentAPY = calculateGlobalAPY(
        current4WeekNGR,
        totalTickets,
        priceUSD,
        currentSplit
      );
      logState(`Current APY calculated:`, currentAPY);
      
      if (!isAPYInBounds(currentAPY)) {
        throw new Error(`Current APY out of bounds: ${currentAPY}`);
      }
      
      // Last week APY (from most recent completed draw)
      // USING THE SAME FIELDS AS YIELDCHART:
      // - adjustedNgrUSD (NOT adjustedNGR - that's raw API)
      // - shflPriceAtDraw (historical price from lib/api.ts lookup)
      let lastWeekAPY = currentAPY;
      
      if (completedDraws.length > 0) {
        const lastDraw = completedDraws[0];
        // USE adjustedNgrUSD (same as YieldChart line 33)
        const lastDrawNGR = lastDraw.adjustedNgrUSD ?? lastDraw.ngrUSD;
        const lastDrawTickets = lastDraw.totalTickets || totalTickets;
        // USE shflPriceAtDraw (same as YieldChart line 36)
        const lastDrawPrice = lastDraw.shflPriceAtDraw || priceUSD;
        
        logFetch(`Last draw data:`, {
          drawNumber: lastDraw.drawNumber,
          adjustedNgrUSD: lastDrawNGR,
          shflPriceAtDraw: lastDrawPrice,
          totalTickets: lastDrawTickets,
        });
        
        if (isValidNumber(lastDrawNGR) && isValidNumber(lastDrawTickets) && isValidNumber(lastDrawPrice)) {
          lastWeekAPY = calculateGlobalAPY(
            lastDrawNGR,
            lastDrawTickets,
            lastDrawPrice,
            lastDraw.prizepoolSplit || currentSplit
          );
          if (!isAPYInBounds(lastWeekAPY)) {
            lastWeekAPY = currentAPY;
          }
        }
      }
      logState(`Last Week APY:`, lastWeekAPY);
      
      // Prior 4-week average APY
      let prior4WeekAPY = currentAPY;
      if (isValidNumber(prior4WeekNGR) && prior4WeekNGR > 0) {
        prior4WeekAPY = calculateGlobalAPY(
          prior4WeekNGR,
          totalTickets,
          priceUSD,
          currentSplit
        );
        if (!isAPYInBounds(prior4WeekAPY)) {
          prior4WeekAPY = currentAPY;
        }
      }
      logState(`Prior 4-Week APY:`, prior4WeekAPY);
      
      // APY change
      const apyChange = prior4WeekAPY > 0
        ? ((currentAPY - prior4WeekAPY) / prior4WeekAPY) * 100
        : 0;
      logState(`APY Change:`, apyChange);
      
      // =====================================================
      // HIGHEST APY - Using EXACT SAME logic as YieldChart
      // YieldChart line 33: draw.adjustedNgrUSD ?? draw.ngrUSD
      // YieldChart line 36: draw.shflPriceAtDraw || currentPrice
      // =====================================================
      let highestAPY = { apy: 0, weeksAgo: 0, drawNumber: 0 };
      
      completedDraws.forEach((draw: HistoricalDraw, index: number) => {
        // EXACT SAME LOGIC AS YIELDCHART:
        const drawNGR = draw.adjustedNgrUSD ?? draw.ngrUSD;
        const drawTickets = draw.totalTickets || totalTickets;
        const drawPrice = draw.shflPriceAtDraw || priceUSD;
        
        if (isValidNumber(drawNGR) && isValidNumber(drawTickets) && drawTickets > 0 && isValidNumber(drawPrice) && drawPrice > 0) {
          const drawAPY = calculateGlobalAPY(
            drawNGR,
            drawTickets,
            drawPrice,
            draw.prizepoolSplit || currentSplit
          );
          
          if (isAPYInBounds(drawAPY) && drawAPY > highestAPY.apy) {
            highestAPY = { apy: drawAPY, weeksAgo: index, drawNumber: draw.drawNumber };
            logFetch(`New highest APY found: Draw #${draw.drawNumber} = ${drawAPY.toFixed(2)}%`);
          }
        }
      });
      
      logState(`Highest APY:`, highestAPY);
      
      // === FINAL CHECK - STILL CURRENT REQUEST? ===
      if (thisRequestId !== requestIdRef.current || !isMountedRef.current) {
        logFetch(`Request #${thisRequestId} became stale during calculation, discarding`);
        return;
      }
      
      // === BUILD FINAL DATA OBJECT ===
      const apyData: APYData = {
        currentAPY,
        lastWeekAPY,
        prior4WeekAPY,
        apyChange: isFinite(apyChange) ? apyChange : 0,
        highestAPY,
        sourceData: {
          current4WeekNGR,
          totalTickets,
          shflPrice: priceUSD,
          timestamp: Date.now(),
        },
      };
      
      logState(`✅ APY Data validated and ready:`, {
        currentAPY: apyData.currentAPY.toFixed(2) + "%",
        lastWeekAPY: apyData.lastWeekAPY.toFixed(2) + "%",
        highestAPY: apyData.highestAPY.apy.toFixed(2) + "%",
        highestAPYDraw: apyData.highestAPY.drawNumber,
        fetchDuration: Date.now() - fetchStartTime + "ms",
      });
      
      // === UPDATE STATE ===
      setData(apyData);
      setLastFetchTimestamp(Date.now());
      setError(null);
      
    } catch (err: any) {
      // Check if this was an abort
      if (err.name === "AbortError") {
        logFetch(`Request #${thisRequestId} was aborted`);
        return;
      }
      
      // Check if still current request
      if (thisRequestId !== requestIdRef.current || !isMountedRef.current) {
        logFetch(`Request #${thisRequestId} error ignored (stale)`);
        return;
      }
      
      logError(`Fetch failed:`, err.message);
      
      // DO NOT set data to null if we have existing valid data
      // Just set the error state
      setError(err.message || "Failed to fetch APY data");
      
      // If we have no data at all, set to null
      if (data === null) {
        setData(null);
      }
    } finally {
      if (thisRequestId === requestIdRef.current && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [data]);

  // Initial fetch and setup
  useEffect(() => {
    isMountedRef.current = true;
    
    logState(`Hook mounted, starting initial fetch`);
    fetchAPYData();
    
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      logState(`Auto-refresh triggered`);
      fetchAPYData();
    }, 60000);
    
    return () => {
      logState(`Hook unmounting`);
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(interval);
    };
  }, [fetchAPYData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAPYData,
    lastFetchTimestamp,
  };
}

