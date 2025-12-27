"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  Calculator,
  Zap,
  Ticket,
  RefreshCw,
} from "lucide-react";

import Header from "./Header";
import KPICard from "./KPICard";
import YieldChart from "./YieldChart";
import SensitivityTable from "./SensitivityTable";
import LotteryHistoryTable from "./LotteryHistoryTable";
import PersonalCalculator from "./Calculator";

import {
  fetchSHFLPrice,
  fetchPriceHistory,
  fetchLotteryHistory,
  fetchLotteryStats,
  fetchNGRHistory,
  fetchAvgWeeklyNGR,
  combineChartData,
  getMockLotteryStats,
  SHFLPrice,
  ChartDataPoint,
  LotteryStats,
} from "@/lib/api";

import {
  calculateMovingAverageAPY,
  formatUSD,
  formatPercent,
  formatNumber,
  HistoricalDraw,
  SHFL_PER_TICKET,
} from "@/lib/calculations";

export default function Dashboard() {
  // State
  const [price, setPrice] = useState<SHFLPrice>({
    usd: 0.15,
    usd_24h_change: 0,
    last_updated: new Date().toISOString(),
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [historicalDraws, setHistoricalDraws] = useState<HistoricalDraw[]>([]);
  const [lotteryStats, setLotteryStats] = useState<LotteryStats>(getMockLotteryStats());
  const [avgWeeklyNGR, setAvgWeeklyNGR] = useState<number>(500_000);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch initial data
  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      // Fetch all data in parallel
      const [priceData, priceHistory, ngrHistory, draws, stats, avgNGR] = await Promise.all([
        fetchSHFLPrice(),
        fetchPriceHistory(365),
        fetchNGRHistory(),
        fetchLotteryHistory(),
        fetchLotteryStats(),
        fetchAvgWeeklyNGR(),
      ]);

      setPrice(priceData);
      
      // Combine price and NGR for chart
      const combined = await combineChartData(priceHistory, ngrHistory);
      setChartData(combined);

      setHistoricalDraws(draws);
      setLotteryStats(stats);
      setAvgWeeklyNGR(avgNGR);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Refresh price every 60 seconds
    const priceInterval = setInterval(async () => {
      const priceData = await fetchSHFLPrice();
      setPrice(priceData);
    }, 60000);

    // Refresh all data every 5 minutes
    const dataInterval = setInterval(() => {
      loadData(true);
    }, 300000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(dataInterval);
    };
  }, []);

  // Calculate current APY based on 4-week moving average
  const currentAPY = useMemo(() => {
    return calculateMovingAverageAPY(
      historicalDraws,
      price.usd,
      lotteryStats.totalTickets
    );
  }, [historicalDraws, price.usd, lotteryStats.totalTickets]);

  // Calculate additional stats
  const weeklyPoolUSD = lotteryStats.currentWeekPool;

  // Calculate week-over-week NGR change
  const ngrChange = useMemo(() => {
    if (historicalDraws.length < 2) return 0;
    const current = historicalDraws[0]?.ngrUSD || 0;
    const previous = historicalDraws[1]?.ngrUSD || 0;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, [historicalDraws]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-terminal-textSecondary text-sm">
            Loading terminal data...
          </p>
          <p className="text-terminal-textMuted text-xs mt-2">
            Fetching from CoinGecko & Shuffle.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-black terminal-grid">
      {/* Header */}
      <Header
        price={price.usd}
        priceChange24h={price.usd_24h_change}
        nextDrawTimestamp={lotteryStats.nextDrawTimestamp}
      />

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Top KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Main APY Card - Large */}
          <div className="md:col-span-2 lg:col-span-1">
            <KPICard
              title="Global Yield APY"
              value={formatPercent(currentAPY)}
              subtitle="4-week moving average"
              icon={Percent}
              variant="accent"
              size="large"
            />
          </div>

          <KPICard
            title="Current Prize Pool"
            value={formatUSD(weeklyPoolUSD)}
            subtitle={`Draw #${lotteryStats.drawNumber || 64}`}
            icon={DollarSign}
          />

          <KPICard
            title="Total Staked"
            value={`${formatNumber(Math.floor(lotteryStats.totalSHFLStaked / 1_000_000))}M SHFL`}
            subtitle={`${formatNumber(lotteryStats.totalTickets)} tickets`}
            icon={Users}
          />

          <KPICard
            title="Avg. Weekly NGR"
            value={formatUSD(avgWeeklyNGR)}
            subtitle="Last 4 draws"
            icon={TrendingUp}
            change={ngrChange}
          />
        </div>

        {/* Action Button Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs text-terminal-textMuted">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-1 hover:text-terminal-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="btn-terminal-solid flex items-center gap-2 text-sm font-medium"
          >
            <Calculator className="w-4 h-4" />
            Personal Yield Calculator
          </button>
        </div>

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* NGR vs Price Chart */}
          <div className="lg:col-span-2">
            <YieldChart data={chartData} />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
              <h3 className="text-sm font-medium text-terminal-text mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-terminal-accent" />
                Lottery Mechanics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-xs text-terminal-textSecondary">
                    SHFL per Ticket
                  </span>
                  <span className="text-sm font-medium text-terminal-text">
                    {SHFL_PER_TICKET} SHFL
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-xs text-terminal-textSecondary">
                    Ticket Cost (USD)
                  </span>
                  <span className="text-sm font-medium text-terminal-text">
                    ${(SHFL_PER_TICKET * price.usd).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-xs text-terminal-textSecondary">
                    Current Prize Split
                  </span>
                  <span className="text-sm font-medium text-terminal-accent text-right text-[10px]">
                    {historicalDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-xs text-terminal-textSecondary">
                    Prize Tiers
                  </span>
                  <span className="text-sm font-medium text-terminal-text">
                    9 Levels
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-terminal-textSecondary">
                    Draw Time
                  </span>
                  <span className="text-sm font-medium text-terminal-text">
                    Fri 6PM AEDT
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-terminal-card border border-terminal-accent/30 rounded-lg p-4 shadow-glow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="w-4 h-4 text-terminal-accent" />
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wider">
                  Your Position
                </span>
              </div>
              <p className="text-sm text-terminal-textMuted mb-3">
                Calculate your expected yield based on your SHFL stake.
              </p>
              <button
                onClick={() => setIsCalculatorOpen(true)}
                className="btn-terminal w-full text-sm"
              >
                Open Calculator
              </button>
            </div>

            {/* Latest Draw Info */}
            {historicalDraws[0] && (
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-4">
                <div className="text-xs text-terminal-textSecondary uppercase tracking-wider mb-2">
                  Latest Draw #{historicalDraws[0].drawNumber}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-terminal-textMuted">Date</span>
                    <span className="text-xs text-terminal-text">
                      {new Date(historicalDraws[0].date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-terminal-textMuted">Pool</span>
                    <span className="text-xs text-terminal-positive font-medium">
                      {formatUSD(historicalDraws[0].totalPoolUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-terminal-textMuted">NGR Added</span>
                    <span className="text-xs text-terminal-accent font-medium">
                      {formatUSD(historicalDraws[0].ngrUSD)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sensitivity Table */}
        <div className="mb-6">
          <SensitivityTable
            baseNGR={avgWeeklyNGR}
            basePrice={price.usd}
            totalTickets={lotteryStats.totalTickets}
          />
        </div>

        {/* Lottery History Table */}
        <LotteryHistoryTable draws={historicalDraws} />

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-terminal-border">
          <div className="flex items-center justify-between text-xs text-terminal-textMuted">
            <div className="flex items-center gap-4">
              <span>SHFL Yield Terminal v1.0</span>
              <span>•</span>
              <span>Data updates every 60s</span>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-terminal-accent transition-colors"
              >
                Lottery History Source
              </a>
              <span>•</span>
              <span>Price via CoinGecko</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Calculator Modal */}
      <PersonalCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        shflPrice={price.usd}
        weeklyNGR={avgWeeklyNGR}
        totalTickets={lotteryStats.totalTickets}
        historicalDraws={historicalDraws}
      />
    </div>
  );
}
