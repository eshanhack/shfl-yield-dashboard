"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { BarChart3, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { HistoricalDraw, formatNumber } from "@/lib/calculations";
import CurrencyAmount from "./CurrencyAmount";
import { cn } from "@/lib/utils";

interface ShuffleRevenueChartProps {
  historicalDraws: HistoricalDraw[];
}

interface ChartDataPoint {
  week: string;
  date: string;
  drawNumber: number;
  lotteryNGR: number;
  shuffleNGR: number;
  ggr: number;
}

export default function ShuffleRevenueChart({
  historicalDraws,
}: ShuffleRevenueChartProps) {
  // Transform historical draws into chart data
  const chartData = useMemo(() => {
    return historicalDraws
      .filter(d => d.ngrUSD > 0)
      .map((draw) => {
        const lotteryNGR = draw.ngrUSD + (draw.singlesAdded || 0) * 0.85;
        const shuffleNGR = lotteryNGR / 0.15;
        const ggr = shuffleNGR * 2;
        
        return {
          week: `#${draw.drawNumber}`,
          date: new Date(draw.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          drawNumber: draw.drawNumber,
          lotteryNGR,
          shuffleNGR,
          ggr,
        };
      })
      .reverse(); // Oldest first for chart
  }, [historicalDraws]);

  // Calculate WoW and MoM changes
  const changeMetrics = useMemo(() => {
    if (chartData.length < 2) return { wow: 0, mom: 0 };
    
    const latest = chartData[chartData.length - 1];
    const lastWeek = chartData[chartData.length - 2];
    const wow = lastWeek.shuffleNGR > 0 
      ? ((latest.shuffleNGR - lastWeek.shuffleNGR) / lastWeek.shuffleNGR) * 100 
      : 0;

    // Month over month (4 weeks ago)
    const fourWeeksAgo = chartData[chartData.length - 5];
    const mom = fourWeeksAgo?.shuffleNGR > 0 
      ? ((latest.shuffleNGR - fourWeeksAgo.shuffleNGR) / fourWeeksAgo.shuffleNGR) * 100 
      : 0;

    return { wow, mom };
  }, [chartData]);

  // Calculate average for reference line
  const avgNGR = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.shuffleNGR, 0) / chartData.length;
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload as ChartDataPoint;
    
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-lg p-3 shadow-xl">
        <div className="text-xs text-terminal-textMuted mb-2">
          Draw {data.week} • {data.date}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-terminal-textSecondary">GGR (Est.)</span>
            <span className="text-sm font-bold text-green-400">${formatNumber(Math.round(data.ggr))}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-terminal-textSecondary">Shuffle NGR</span>
            <span className="text-sm font-medium text-terminal-text">${formatNumber(Math.round(data.shuffleNGR))}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-terminal-textSecondary">Lottery NGR</span>
            <span className="text-sm font-medium text-terminal-accent">${formatNumber(Math.round(data.lotteryNGR))}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg card-glow">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-terminal-text">
                Shuffle.com Revenue History
              </h3>
              <p className="text-[10px] text-terminal-textMuted">
                Weekly NGR since lottery launch ({chartData.length} weeks)
              </p>
            </div>
          </div>
          
          {/* Change Metrics */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-terminal-textMuted mb-0.5">WoW</div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold",
                changeMetrics.wow >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {changeMetrics.wow >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {changeMetrics.wow >= 0 ? "+" : ""}{changeMetrics.wow.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-terminal-textMuted mb-0.5">MoM</div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold",
                changeMetrics.mom >= 0 ? "text-terminal-positive" : "text-terminal-negative"
              )}>
                {changeMetrics.mom >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {changeMetrics.mom >= 0 ? "+" : ""}{changeMetrics.mom.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="shuffleNGRGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="week" 
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1_000_000).toFixed(1)}M`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={avgNGR} 
                stroke="#8A2BE2" 
                strokeDasharray="3 3" 
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="shuffleNGR"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#shuffleNGRGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#10b981", stroke: "#000", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-terminal-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span className="text-[10px] text-terminal-textMuted">Shuffle NGR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-terminal-accent rounded opacity-50" style={{ borderStyle: 'dashed' }} />
              <span className="text-[10px] text-terminal-textMuted">Avg NGR: <CurrencyAmount amount={avgNGR} className="text-terminal-accent" /></span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-terminal-textMuted">
            <Calendar className="w-3 h-3" />
            Since Draw #1
          </div>
        </div>
      </div>
    </div>
  );
}

