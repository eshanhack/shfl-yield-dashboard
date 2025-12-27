"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  Ticket,
  RefreshCw,
} from "lucide-react";

import Header from "./Header";
import YieldChart from "./YieldChart";
import SensitivityTable from "./SensitivityTable";
import LotteryHistoryTable from "./LotteryHistoryTable";
import PersonalCalculator from "./Calculator";
import YieldCalculatorPanel from "./YieldCalculatorPanel";

import {
  fetchSHFLPrice,
  fetchPriceHistory,
  fetchLotteryHistory,
  fetchLotteryStats,
  fetchNGRHistory,
  fetchNGRStats,
  combineChartData,
  getMockLotteryStats,
  SHFLPrice,
  ChartDataPoint,
  LotteryStats,
  NGRStats,
} from "@/lib/api";

import {
  calculateGlobalAPY,
  formatUSD,
  formatPercent,
  formatNumber,
  HistoricalDraw,
  SHFL_PER_TICKET,
} from "@/lib/calculations";

// Helper function to format relative time in words
function formatTimeAgo(weeksAgo: number): string {
  if (weeksAgo === 0) return "this week";
  if (weeksAgo === 1) return "1 week ago";
  if (weeksAgo < 4) return `${weeksAgo} weeks ago`;
  
  const months = Math.floor(weeksAgo / 4);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  
  const years = Math.floor(months / 12);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

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
  const [ngrStats, setNgrStats] = useState<NGRStats>({ current4WeekAvg: 500_000, prior4WeekAvg: 500_000 });
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
      const [priceData, priceHistory, ngrHistory, draws, stats, ngrStatsData] = await Promise.all([
        fetchSHFLPrice(),
        fetchPriceHistory(365),
        fetchNGRHistory(),
        fetchLotteryHistory(),
        fetchLotteryStats(),
        fetchNGRStats(),
      ]);

      setPrice(priceData);
      
      // Combine price and NGR for chart
      const combined = await combineChartData(priceHistory, ngrHistory);
      setChartData(combined);

      setHistoricalDraws(draws);
      setLotteryStats(stats);
      setNgrStats(ngrStatsData);
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

  // Filter to only completed draws (exclude upcoming/future draws)
  const completedDraws = useMemo(() => {
    const now = new Date();
    return historicalDraws.filter((draw) => {
      const drawDate = new Date(draw.date);
      return drawDate < now;
    });
  }, [historicalDraws]);

  // Calculate current APY based on 4-week average NGR
  const currentAPY = useMemo(() => {
    // Get current prize split from latest completed draw
    const currentSplit = completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11";
    
    return calculateGlobalAPY(
      ngrStats.current4WeekAvg,
      lotteryStats.totalTickets,
      price.usd,
      currentSplit
    );
  }, [ngrStats.current4WeekAvg, lotteryStats.totalTickets, price.usd, completedDraws]);

  // Calculate additional stats
  const weeklyPoolUSD = lotteryStats.currentWeekPool;

  // Calculate 4-week vs prior 4-week NGR change
  const ngrChange = useMemo(() => {
    const current = ngrStats.current4WeekAvg;
    const prior = ngrStats.prior4WeekAvg;
    if (prior === 0) return 0;
    return ((current - prior) / prior) * 100;
  }, [ngrStats]);

  // Calculate week-over-week staked change (current vs prior week from GraphQL)
  const stakedChange = useMemo(() => {
    const currentTickets = lotteryStats.totalTickets;
    const priorTickets = lotteryStats.priorWeekTickets || 0;
    if (priorTickets === 0) return 0;
    return ((currentTickets - priorTickets) / priorTickets) * 100;
  }, [lotteryStats.totalTickets, lotteryStats.priorWeekTickets]);

  // Calculate last week's APY (from the most recent completed draw)
  const lastWeekAPY = useMemo(() => {
    if (completedDraws.length === 0) return 0;
    const lastDraw = completedDraws[0];
    const ngrContribution = lastDraw.ngrUSD + (lastDraw.singlesAdded || 0) * 0.85;
    const totalTickets = lastDraw.totalTickets || lotteryStats.totalTickets;
    return calculateGlobalAPY(ngrContribution, totalTickets, price.usd, lastDraw.prizepoolSplit);
  }, [completedDraws, lotteryStats.totalTickets, price.usd]);

  // Calculate APY change from last week vs current 4-week avg
  const apyChange = useMemo(() => {
    if (currentAPY === 0) return 0;
    return ((currentAPY - lastWeekAPY) / lastWeekAPY) * 100;
  }, [currentAPY, lastWeekAPY]);

  // Find highest APY draw
  const highestAPYData = useMemo(() => {
    if (completedDraws.length === 0) return { apy: 0, weeksAgo: 0 };
    
    let highest = { apy: 0, weeksAgo: 0 };
    
    completedDraws.forEach((draw, index) => {
      const ngrContribution = draw.ngrUSD + (draw.singlesAdded || 0) * 0.85;
      const totalTickets = draw.totalTickets || lotteryStats.totalTickets;
      const drawAPY = calculateGlobalAPY(ngrContribution, totalTickets, price.usd, draw.prizepoolSplit);
      
      if (drawAPY > highest.apy) {
        highest = { apy: drawAPY, weeksAgo: index };
      }
    });
    
    return highest;
  }, [completedDraws, lotteryStats.totalTickets, price.usd]);

  // Find highest prize pool
  const highestPrizePoolData = useMemo(() => {
    if (completedDraws.length === 0) return { pool: 0, weeksAgo: 0 };
    
    let highest = { pool: 0, weeksAgo: 0 };
    
    completedDraws.forEach((draw, index) => {
      if (draw.totalPoolUSD > highest.pool) {
        highest = { pool: draw.totalPoolUSD, weeksAgo: index };
      }
    });
    
    return highest;
  }, [completedDraws]);

  // Calculate prize pool change vs last week
  const prizePoolChange = useMemo(() => {
    if (completedDraws.length === 0) return 0;
    const lastPool = completedDraws[0]?.totalPoolUSD || 0;
    if (lastPool === 0) return 0;
    return ((weeklyPoolUSD - lastPool) / lastPool) * 100;
  }, [weeklyPoolUSD, completedDraws]);

  // Last week's NGR (from most recent completed draw)
  const lastWeekNGR = useMemo(() => {
    return completedDraws[0]?.ngrUSD || 0;
  }, [completedDraws]);

  // Find highest NGR week
  const highestNGRData = useMemo(() => {
    if (completedDraws.length === 0) return { ngr: 0, weeksAgo: 0 };
    
    let highest = { ngr: 0, weeksAgo: 0 };
    
    completedDraws.forEach((draw, index) => {
      const ngrTotal = draw.ngrUSD + (draw.singlesAdded || 0) * 0.85;
      if (ngrTotal > highest.ngr) {
        highest = { ngr: ngrTotal, weeksAgo: index };
      }
    });
    
    return highest;
  }, [completedDraws]);

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
            <div className="bg-terminal-card border border-terminal-accent/30 rounded-lg p-4 shadow-glow-sm h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-terminal-accent/20 border border-terminal-accent/30">
                    <Percent className="w-4 h-4 text-terminal-accent" />
                  </div>
                  <span className="text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                    Annual Yield
                  </span>
                </div>
                {apyChange !== 0 && !isNaN(apyChange) && isFinite(apyChange) && (
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                    apyChange > 0 
                      ? "text-terminal-positive bg-terminal-positive/10" 
                      : "text-terminal-negative bg-terminal-negative/10"
                  }`}>
                    {apyChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                    <span>{apyChange > 0 ? "+" : ""}{apyChange.toFixed(2)}%</span>
                  </div>
                )}
              </div>
              <div className="mb-2">
                <span className="text-3xl font-bold text-terminal-accent tabular-nums">
                  {formatPercent(currentAPY)}
                </span>
              </div>
              <div className="text-xs text-terminal-textMuted mb-1">
                4-week moving average
              </div>
              <div className="space-y-1 mt-2 pt-2 border-t border-terminal-border/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-textMuted">Last Week APY</span>
                  <span className="font-medium text-terminal-text tabular-nums">
                    {formatPercent(lastWeekAPY)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-textMuted">Highest APY</span>
                  <span className="font-medium text-terminal-positive tabular-nums">
                    {formatPercent(highestAPYData.apy)} <span className="text-terminal-textMuted font-normal">({formatTimeAgo(highestAPYData.weeksAgo)})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                  <DollarSign className="w-4 h-4 text-terminal-accent" />
                </div>
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                  Upcoming Draw
                </span>
              </div>
              {prizePoolChange !== 0 && !isNaN(prizePoolChange) && isFinite(prizePoolChange) && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                  prizePoolChange > 0 
                    ? "text-terminal-positive bg-terminal-positive/10" 
                    : "text-terminal-negative bg-terminal-negative/10"
                }`}>
                  {prizePoolChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                  <span>{prizePoolChange > 0 ? "+" : ""}{prizePoolChange.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="mb-1">
              <span className="text-2xl font-bold text-terminal-text tabular-nums">
                {formatUSD(weeklyPoolUSD)}
              </span>
            </div>
            <div className="text-xs text-terminal-textMuted mb-2">
              Draw #{lotteryStats.drawNumber || 64}
            </div>
            <div className="space-y-1 pt-2 border-t border-terminal-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-terminal-textMuted">Last Week Pool</span>
                <span className="font-medium text-terminal-text tabular-nums">
                  {formatUSD(completedDraws[0]?.totalPoolUSD || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-terminal-textMuted">Highest Pool</span>
                <span className="font-medium text-terminal-positive tabular-nums">
                  {formatUSD(highestPrizePoolData.pool)} <span className="text-terminal-textMuted font-normal">({formatTimeAgo(highestPrizePoolData.weeksAgo)})</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                  <Users className="w-4 h-4 text-terminal-accent" />
                </div>
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                  Total Staked
                </span>
              </div>
              {stakedChange !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                  stakedChange > 0 
                    ? "text-terminal-positive bg-terminal-positive/10" 
                    : "text-terminal-negative bg-terminal-negative/10"
                }`}>
                  {stakedChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                  <span>{stakedChange > 0 ? "+" : ""}{stakedChange.toFixed(2)}%</span>
                </div>
              )}
            </div>
            <div className="mb-2">
              <span className="text-2xl font-bold text-terminal-text tabular-nums">
                {formatNumber(Math.floor(lotteryStats.totalSHFLStaked / 1_000_000))}M SHFL
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-terminal-textMuted">Circulating Supply</span>
                <span className="font-bold text-terminal-accent tabular-nums">
                  {lotteryStats.circulatingSupply 
                    ? ((lotteryStats.totalSHFLStaked / lotteryStats.circulatingSupply) * 100).toFixed(2)
                    : "0"}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-terminal-textMuted">Total Supply</span>
                <span className="font-bold text-purple-400 tabular-nums">
                  {lotteryStats.totalSupply 
                    ? ((lotteryStats.totalSHFLStaked / lotteryStats.totalSupply) * 100).toFixed(2)
                    : "0"}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                  <TrendingUp className="w-4 h-4 text-terminal-accent" />
                </div>
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                  Avg. Weekly NGR
                </span>
              </div>
              {ngrChange !== 0 && !isNaN(ngrChange) && isFinite(ngrChange) && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                  ngrChange > 0 
                    ? "text-terminal-positive bg-terminal-positive/10" 
                    : "text-terminal-negative bg-terminal-negative/10"
                }`}>
                  {ngrChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                  <span>{ngrChange > 0 ? "+" : ""}{ngrChange.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="mb-1">
              <span className="text-2xl font-bold text-terminal-text tabular-nums">
                {formatUSD(ngrStats.current4WeekAvg)}
              </span>
            </div>
            <div className="text-xs text-terminal-textMuted mb-2">
              Prior 4wk: {formatUSD(ngrStats.prior4WeekAvg)}
            </div>
            <div className="space-y-1 pt-2 border-t border-terminal-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-terminal-textMuted">Last Week NGR</span>
                <span className="font-medium text-terminal-accent tabular-nums">
                  {formatUSD(lastWeekNGR + (completedDraws[0]?.singlesAdded || 0) * 0.85)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-terminal-textMuted">Highest NGR</span>
                <span className="font-medium text-terminal-positive tabular-nums">
                  {formatUSD(highestNGRData.ngr)} <span className="text-terminal-textMuted font-normal">({formatTimeAgo(highestNGRData.weeksAgo)})</span>
                </span>
              </div>
            </div>
          </div>
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
        </div>

        {/* Yield Calculator Panel */}
        <YieldCalculatorPanel
          shflPrice={price.usd}
          currentWeekNGR={completedDraws[0]?.ngrUSD || ngrStats.current4WeekAvg}
          avgWeeklyNGR={ngrStats.current4WeekAvg}
          totalTickets={lotteryStats.totalTickets}
          historicalDraws={completedDraws}
          prizeSplit={completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
        />

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
                    {completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
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
            {completedDraws[0] && (
              <div className="bg-terminal-dark border border-terminal-border rounded-lg p-4">
                <div className="text-xs text-terminal-textSecondary uppercase tracking-wider mb-2">
                  Latest Draw #{completedDraws[0].drawNumber}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-terminal-textMuted">Date</span>
                    <span className="text-xs text-terminal-text">
                      {new Date(completedDraws[0].date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-terminal-textMuted">Pool</span>
                    <span className="text-xs text-terminal-positive font-medium">
                      {formatUSD(completedDraws[0].totalPoolUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-terminal-textMuted">NGR Added</span>
                    <span className="text-xs text-terminal-accent font-medium">
                      {formatUSD(completedDraws[0].ngrUSD)}
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
            baseNGR={ngrStats.current4WeekAvg}
            basePrice={price.usd}
            totalTickets={lotteryStats.totalTickets}
            prizeSplit={completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
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
        weeklyNGR={ngrStats.current4WeekAvg}
        totalTickets={lotteryStats.totalTickets}
        historicalDraws={completedDraws}
        prizeSplit={completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
      />
    </div>
  );
}
