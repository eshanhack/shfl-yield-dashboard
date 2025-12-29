"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

// Base skeleton with shimmer animation
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-terminal-border/30",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-terminal-border/50 before:to-transparent",
        "before:animate-shimmer",
        className
      )}
      style={style}
    />
  );
}

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="w-32 h-10 mb-2" />
      <Skeleton className="w-20 h-3" />
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("bg-terminal-card border border-terminal-border rounded-xl p-4", height)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-40 h-6" />
        <div className="flex gap-2">
          <Skeleton className="w-16 h-8 rounded-md" />
          <Skeleton className="w-16 h-8 rounded-md" />
        </div>
      </div>
      <div className="flex items-end gap-2 h-[calc(100%-60px)]">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-sm" 
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-terminal-border p-4 flex gap-4">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-28 h-4" />
        <Skeleton className="flex-1 h-4" />
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="border-b border-terminal-border/50 p-4 flex gap-4 items-center">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-28 h-4" />
          <Skeleton className="flex-1 h-4" />
        </div>
      ))}
    </div>
  );
}

// Panel/Card Skeleton
export function PanelSkeleton() {
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-48 h-6" />
        <Skeleton className="w-20 h-8 rounded-md" />
      </div>
      <div className="space-y-3">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    </div>
  );
}

// Full Dashboard Section Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      
      {/* Main Panel */}
      <PanelSkeleton />
      
      {/* Chart */}
      <ChartSkeleton />
      
      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
