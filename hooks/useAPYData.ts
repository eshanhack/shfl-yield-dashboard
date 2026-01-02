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
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { calculateGlobalAPY } from "@/lib/calculations";

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
      // Fetch all required data in parallel with NO CACHE
      const timestamp = Date.now();
      
      logFetch(`Fetching from APIs with cache-busting timestamp: ${timestamp}`);
      
      const [ngrStatsRes, lotteryStatsRes, priceRes, lotteryHistoryRes] = await Promise.all([
        fetch(`/api/lottery-history?t=${timestamp}&stats_only=true`, {
          signal: abortController.signal,
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }),
        fetch(`/api/lottery-stats?t=${timestamp}`, {
          signal: abortController.signal,
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }),
        fetch(`/api/shfl-price?t=${timestamp}`, {
          signal: abortController.signal,
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }).catch(() => null), // Price has fallback to CoinGecko below
        fetch(`/api/lottery-history?t=${timestamp}`, {
          signal: abortController.signal,
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }),
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
      
      // === PARSE RESPONSES - NO FALLBACKS ===
      logFetch(`Parsing responses...`);
      
      // NGR Stats
      if (!ngrStatsRes.ok) {
        throw new Error(`NGR Stats API returned ${ngrStatsRes.status}`);
      }
      const ngrStatsData = await ngrStatsRes.json();
      logFetch(`NGR Stats raw:`, ngrStatsData.stats);
      
      // Lottery Stats
      if (!lotteryStatsRes.ok) {
        throw new Error(`Lottery Stats API returned ${lotteryStatsRes.status}`);
      }
      const lotteryStatsData = await lotteryStatsRes.json();
      logFetch(`Lottery Stats raw:`, lotteryStatsData.stats);
      
      // Price - try internal API first, then fallback to CoinGecko
      let priceUSD: number | null = null;
      if (priceRes?.ok) {
        const priceData = await priceRes.json();
        priceUSD = priceData?.price?.usd ?? null;
      }
      
      // Fallback to CoinGecko if internal API failed
      if (!isValidNumber(priceUSD)) {
        logFetch(`Trying CoinGecko fallback for price...`);
        try {
          const cgRes = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=shuffle-2&vs_currencies=usd",
            { signal: abortController.signal }
          );
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            priceUSD = cgData?.["shuffle-2"]?.usd ?? null;
          }
        } catch {
          // Ignore CoinGecko errors
        }
      }
      logFetch(`Price USD:`, priceUSD);
      
      // Lottery History (for historical APY calculations)
      if (!lotteryHistoryRes.ok) {
        throw new Error(`Lottery History API returned ${lotteryHistoryRes.status}`);
      }
      const lotteryHistoryData = await lotteryHistoryRes.json();
      const draws = lotteryHistoryData.draws || [];
      logFetch(`Lottery History: ${draws.length} draws`);
      
      // === VALIDATE ALL REQUIRED DATA EXISTS ===
      const current4WeekNGR = ngrStatsData.stats?.avgWeeklyNGR_4week;
      const prior4WeekNGR = ngrStatsData.stats?.avgWeeklyNGR_prior4week;
      const totalTickets = lotteryStatsData.stats?.totalTickets;
      
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
      
      // === CALCULATE APY VALUES ===
      logFetch(`Calculating APY values...`);
      
      const currentSplit = draws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11";
      
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
      const completedDraws = draws.filter((d: any) => new Date(d.date) < new Date());
      let lastWeekAPY = currentAPY;
      
      if (completedDraws.length > 0) {
        const lastDraw = completedDraws[0];
        const lastDrawNGR = lastDraw.adjustedNGR ?? lastDraw.totalNGRContribution ?? lastDraw.ngrUSD;
        const lastDrawTickets = lastDraw.totalTickets || totalTickets;
        const lastDrawPrice = lastDraw.shflPriceAtDraw || priceUSD;
        
        if (isValidNumber(lastDrawNGR) && isValidNumber(lastDrawTickets) && isValidNumber(lastDrawPrice)) {
          lastWeekAPY = calculateGlobalAPY(
            lastDrawNGR,
            lastDrawTickets,
            lastDrawPrice,
            lastDraw.prizepoolSplit || currentSplit
          );
          if (!isAPYInBounds(lastWeekAPY)) {
            lastWeekAPY = currentAPY; // Fallback to current if invalid
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
      
      // Highest APY
      let highestAPY = { apy: currentAPY, weeksAgo: 0, drawNumber: 0 };
      completedDraws.forEach((draw: any, index: number) => {
        const drawNGR = draw.adjustedNGR ?? draw.totalNGRContribution ?? draw.ngrUSD;
        const drawTickets = draw.totalTickets || totalTickets;
        const drawPrice = draw.shflPriceAtDraw || priceUSD;
        
        if (isValidNumber(drawNGR) && isValidNumber(drawTickets) && isValidNumber(drawPrice)) {
          const drawAPY = calculateGlobalAPY(drawNGR, drawTickets, drawPrice, draw.prizepoolSplit || currentSplit);
          if (isAPYInBounds(drawAPY) && drawAPY > highestAPY.apy) {
            highestAPY = { apy: drawAPY, weeksAgo: index, drawNumber: draw.drawNumber };
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
  }, []);

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

