"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-terminal-border/50 rounded",
        className
      )}
      style={style}
    />
  );
}

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 h-full min-h-[180px]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-16 h-6 rounded" />
      </div>
      <Skeleton className="w-32 h-9 mb-2" />
      <Skeleton className="w-40 h-4 mb-3" />
      <div className="border-t border-terminal-border/50 pt-2 mt-auto">
        <div className="flex justify-between mb-2">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-16 h-3" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
  return (
    <div className={`bg-terminal-card border border-terminal-border rounded-lg p-4 ${height}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-32 h-5" />
        <div className="flex gap-2">
          <Skeleton className="w-16 h-6 rounded" />
          <Skeleton className="w-16 h-6 rounded" />
        </div>
      </div>
      <div className="flex h-[calc(100%-60px)] items-end gap-2 px-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-terminal-border/30 rounded-t animate-pulse"
            style={{
              height: `${30 + Math.random() * 60}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="w-32 h-5 mb-2" />
            <Skeleton className="w-48 h-3" />
          </div>
          <Skeleton className="w-24 h-8 rounded" />
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-terminal-border">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="w-16 h-3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-terminal-border/50">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton 
                    className="h-4" 
                    style={{ 
                      width: `${50 + Math.random() * 50}%`,
                      animationDelay: `${(rowIndex * cols + colIndex) * 50}ms`
                    }} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Dashboard Full Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartSkeleton height="h-[350px]" />
        </div>
        <ChartSkeleton height="h-[350px]" />
      </div>
      
      {/* Table */}
      <TableSkeleton rows={8} />
    </div>
  );
}

