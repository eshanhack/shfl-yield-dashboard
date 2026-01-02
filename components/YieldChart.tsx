"use client";

/**
 * YieldChart - NGR vs Price Graph
 * 
 * ARCHITECTURAL MANDATE:
 * This component does NOT calculate APY.
 * It receives chartData from useYieldData hook.
 * The same chartData is used to derive the "Highest APY" stat.
 * Therefore Card and Graph can NEVER disagree.
 */

import { useRef } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { ChartDataPoint } from "@/hooks/useYieldData";
import ScreenshotButton from "./ScreenshotButton";

interface YieldChartProps {
  /** Chart data from useYieldData - THE SINGLE SOURCE OF TRUTH */
  chartData: ChartDataPoint[];
}

export default function YieldChart({ chartData }: YieldChartProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // No calculation here - just use the data as-is
  // This ensures the max APY in the chart EXACTLY matches
  // the highestAPY stat shown on the card

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-terminal-dark border border-terminal-accent/50 rounded px-3 py-2 shadow-glow-sm">
        <p className="text-xs text-terminal-textSecondary mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-terminal-textSecondary">{entry.name}:</span>
            <span className="font-medium text-terminal-text">
              {entry.name === "NGR"
                ? `$${entry.value.toFixed(2)}M`
                : entry.name === "APY"
                ? `${(entry.value * 100).toFixed(1)}%`
                : `$${entry.value.toFixed(4)}`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Show loading state if no data
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
            <Activity className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-terminal-text">NGR vs Price</h3>
            <p className="text-xs text-terminal-textMuted">Loading...</p>
          </div>
        </div>
        <div className="flex-1 min-h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-terminal-textMuted">Loading chart data...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20 flex-shrink-0">
            <Activity className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-terminal-text">
              NGR vs Price
            </h3>
            <p className="text-xs text-terminal-textMuted">
              Since inception
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-terminal-accent" />
            <span className="text-[10px] text-terminal-textSecondary">NGR ($M)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <span className="text-[10px] text-terminal-textSecondary">Price ($)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-terminal-textSecondary">APY (%)</span>
          </div>
          <ScreenshotButton targetRef={panelRef} filename="shfl-ngr-price-chart" />
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1a1a1a"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666666", fontSize: 10 }}
              dy={10}
            />
            <YAxis
              yAxisId="ngr"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666666", fontSize: 10 }}
              tickFormatter={(value) => `$${value}M`}
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666666", fontSize: 10 }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              domain={["dataMin - 0.02", "dataMax + 0.02"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="ngr"
              dataKey="ngr"
              name="NGR"
              fill="#8A2BE2"
              opacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="Price"
              stroke="#FFFFFF"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "#FFFFFF",
                stroke: "#8A2BE2",
                strokeWidth: 2,
              }}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="apyScaled"
              name="APY"
              stroke="#34D399"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#34D399",
                stroke: "#10B981",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
