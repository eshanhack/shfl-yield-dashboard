"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity } from "lucide-react";
import { ChartDataPoint } from "@/lib/api";

interface YieldChartProps {
  data: ChartDataPoint[];
}

export default function YieldChart({ data }: YieldChartProps) {
  // Show all weekly data points
  const formattedData = useMemo(() => {
    return data;
  }, [data]);

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
                : `$${entry.value.toFixed(4)}`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow h-full flex flex-col">
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-terminal-accent" />
            <span className="text-xs text-terminal-textSecondary">NGR ($M)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white" />
            <span className="text-xs text-terminal-textSecondary">Price ($)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

