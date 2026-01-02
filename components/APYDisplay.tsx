"use client";

/**
 * APYDisplay - Client-Only APY Rendering Components
 * 
 * ARCHITECTURAL MANDATE:
 * These components do NOT calculate anything.
 * They simply DISPLAY values from the useYieldData hook.
 * The hook is THE SINGLE SOURCE OF TRUTH.
 */

import { useYieldDataContext } from "@/hooks/useYieldData";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/calculations";
import { TrendingUp } from "lucide-react";

// Loading skeleton component
function APYSkeleton({ variant }: { variant: "headline" | "stat" }) {
  if (variant === "headline") {
    return (
      <div className="h-8 sm:h-10 lg:h-12 w-24 sm:w-32 bg-terminal-border/50 rounded animate-pulse" />
    );
  }
  return (
    <div className="h-4 w-14 bg-terminal-border/50 rounded animate-pulse" />
  );
}

// Main APY headline display
export function APYHeadline({ className }: { className?: string }) {
  const { metrics, isLoading } = useYieldDataContext();
  
  // NULL-FIRST: Only render if we have valid data
  if (!metrics || typeof metrics.currentAPY !== "number") {
    return <APYSkeleton variant="headline" />;
  }
  
  return (
    <span 
      className={cn(
        "yield-headline yield-headline-size tabular-nums",
        metrics.currentAPY > 30 
          ? "yield-headline-fire" 
          : metrics.currentAPY < 15 
          ? "yield-headline-ice" 
          : "yield-headline-neutral",
        className
      )}
    >
      {formatPercent(metrics.currentAPY)}
    </span>
  );
}

// APY change badge
export function APYChangeBadge() {
  const { metrics } = useYieldDataContext();
  
  if (!metrics || typeof metrics.apyChange !== "number" || metrics.apyChange === 0 || !isFinite(metrics.apyChange)) {
    return null;
  }
  
  return (
    <div className={`hidden sm:flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-medium px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 rounded ${metrics.apyChange > 0 ? "text-terminal-positive bg-terminal-positive/10" : "text-terminal-negative bg-terminal-negative/10"}`}>
      <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 ${metrics.apyChange < 0 ? "rotate-180" : ""}`} />
      <span>{metrics.apyChange > 0 ? "+" : ""}{metrics.apyChange.toFixed(1)}%</span>
    </div>
  );
}

// Last week APY stat
export function LastWeekAPY() {
  const { metrics } = useYieldDataContext();
  
  if (!metrics || typeof metrics.lastWeekAPY !== "number") {
    return <APYSkeleton variant="stat" />;
  }
  
  return (
    <span className="font-medium text-terminal-text tabular-nums">
      {formatPercent(metrics.lastWeekAPY)}
    </span>
  );
}

// Highest APY stat - MUST match max value in Graph
export function HighestAPY() {
  const { metrics } = useYieldDataContext();
  
  if (!metrics || typeof metrics.highestAPY?.apy !== "number") {
    return <APYSkeleton variant="stat" />;
  }
  
  return (
    <span className="font-medium text-terminal-positive tabular-nums">
      {formatPercent(metrics.highestAPY.apy)}
    </span>
  );
}

// Debug component for development
export function APYDebug() {
  const { metrics, isLoading, error, lastFetchTimestamp } = useYieldDataContext();
  
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  
  // Find max APY in chart data for verification
  const maxInChart = metrics?.chartData 
    ? Math.max(...metrics.chartData.map(d => d.apy))
    : 0;
  
  const hasDisparity = metrics && Math.abs(maxInChart - metrics.highestAPY.apy) > 0.01;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/90 p-4 rounded-lg text-xs font-mono z-[9999] max-w-sm border border-terminal-border">
      <div className="text-terminal-accent mb-2 font-bold">Yield Data Debug</div>
      <div className="space-y-1 text-terminal-textMuted">
        <div>Loading: {isLoading ? "Yes" : "No"}</div>
        <div>Error: {error || "None"}</div>
        <div>Has Metrics: {metrics ? "Yes" : "No"}</div>
        {metrics && (
          <>
            <div className="border-t border-terminal-border pt-1 mt-1">
              <div className="text-terminal-positive">Current APY: {metrics.currentAPY.toFixed(2)}%</div>
              <div>Last Week: {metrics.lastWeekAPY.toFixed(2)}%</div>
              <div>Highest (Card): {metrics.highestAPY.apy.toFixed(2)}%</div>
              <div>Max in Chart: {maxInChart.toFixed(2)}%</div>
            </div>
            {hasDisparity && (
              <div className="text-red-500 font-bold mt-1 border-t border-red-500 pt-1">
                ⚠️ DISPARITY: Card ≠ Graph!
              </div>
            )}
            {!hasDisparity && metrics.chartData.length > 0 && (
              <div className="text-green-500 mt-1 border-t border-green-500 pt-1">
                ✅ Card = Graph (no disparity)
              </div>
            )}
            <div className="text-terminal-textMuted border-t border-terminal-border pt-1 mt-1">
              Chart Data Points: {metrics.chartData.length}
            </div>
          </>
        )}
        <div className="text-terminal-textMuted border-t border-terminal-border pt-1">
          Last Fetch: {lastFetchTimestamp ? new Date(lastFetchTimestamp).toLocaleTimeString() : "Never"}
        </div>
      </div>
    </div>
  );
}
