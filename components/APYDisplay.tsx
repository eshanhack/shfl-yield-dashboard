"use client";

/**
 * APYDisplay - Client-Only APY Rendering Component
 * 
 * This component is INTENTIONALLY client-only to prevent:
 * - SSR hydration mismatches
 * - Stale server-rendered values
 * - Race conditions between server and client data
 * 
 * It uses the useAPYData hook as the SINGLE SOURCE OF TRUTH.
 */

import { useAPYData } from "@/hooks/useAPYData";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/calculations";
import { TrendingUp } from "lucide-react";

interface APYDisplayProps {
  variant: "headline" | "stat";
  className?: string;
}

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
  const { data, isLoading, error } = useAPYData();
  
  // NULL-FIRST: Only render if we have valid data
  if (!data || typeof data.currentAPY !== "number") {
    return <APYSkeleton variant="headline" />;
  }
  
  return (
    <span 
      className={cn(
        "yield-headline yield-headline-size tabular-nums",
        data.currentAPY > 30 
          ? "yield-headline-fire" 
          : data.currentAPY < 15 
          ? "yield-headline-ice" 
          : "yield-headline-neutral",
        className
      )}
    >
      {formatPercent(data.currentAPY)}
    </span>
  );
}

// APY change badge
export function APYChangeBadge() {
  const { data } = useAPYData();
  
  if (!data || typeof data.apyChange !== "number" || data.apyChange === 0 || !isFinite(data.apyChange)) {
    return null;
  }
  
  return (
    <div className={`hidden sm:flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-medium px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 rounded ${data.apyChange > 0 ? "text-terminal-positive bg-terminal-positive/10" : "text-terminal-negative bg-terminal-negative/10"}`}>
      <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 ${data.apyChange < 0 ? "rotate-180" : ""}`} />
      <span>{data.apyChange > 0 ? "+" : ""}{data.apyChange.toFixed(1)}%</span>
    </div>
  );
}

// Last week APY stat
export function LastWeekAPY() {
  const { data } = useAPYData();
  
  if (!data || typeof data.lastWeekAPY !== "number") {
    return <APYSkeleton variant="stat" />;
  }
  
  return (
    <span className="font-medium text-terminal-text tabular-nums">
      {formatPercent(data.lastWeekAPY)}
    </span>
  );
}

// Highest APY stat
export function HighestAPY() {
  const { data } = useAPYData();
  
  if (!data || typeof data.highestAPY?.apy !== "number") {
    return <APYSkeleton variant="stat" />;
  }
  
  return (
    <span className="font-medium text-terminal-positive tabular-nums">
      {formatPercent(data.highestAPY.apy)}
    </span>
  );
}

// Debug component for development
export function APYDebug() {
  const { data, isLoading, error, lastFetchTimestamp } = useAPYData();
  
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/90 p-4 rounded-lg text-xs font-mono z-[9999] max-w-sm">
      <div className="text-terminal-accent mb-2">APY Debug</div>
      <div className="space-y-1 text-terminal-textMuted">
        <div>Loading: {isLoading ? "Yes" : "No"}</div>
        <div>Error: {error || "None"}</div>
        <div>Has Data: {data ? "Yes" : "No"}</div>
        {data && (
          <>
            <div className="text-terminal-positive">Current: {data.currentAPY.toFixed(2)}%</div>
            <div>Last Week: {data.lastWeekAPY.toFixed(2)}%</div>
            <div>Highest: {data.highestAPY.apy.toFixed(2)}%</div>
            <div className="text-terminal-textMuted">
              Source NGR: ${data.sourceData.current4WeekNGR.toLocaleString()}
            </div>
            <div className="text-terminal-textMuted">
              Source Tickets: {data.sourceData.totalTickets.toLocaleString()}
            </div>
            <div className="text-terminal-textMuted">
              Source Price: ${data.sourceData.shflPrice.toFixed(4)}
            </div>
          </>
        )}
        <div className="text-terminal-textMuted">
          Last Fetch: {lastFetchTimestamp ? new Date(lastFetchTimestamp).toLocaleTimeString() : "Never"}
        </div>
      </div>
    </div>
  );
}

// Provider wrapper to ensure hook is called at component level
export function APYDataProvider({ children }: { children: React.ReactNode }) {
  // This just ensures the hook is initialized early
  useAPYData();
  return <>{children}</>;
}

