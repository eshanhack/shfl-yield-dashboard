"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  Building2,
  Activity,
  Rocket,
  Coins,
  PiggyBank,
  Wallet,
  Droplets,
} from "lucide-react";

import Header from "./Header";
import SectionSelector, { DashboardSection } from "./SectionSelector";
import YieldChart from "./YieldChart";
import SensitivityTable from "./SensitivityTable";
import JackpotFrequencyPanel from "./JackpotFrequencyPanel";
import LotteryHistoryTable from "./LotteryHistoryTable";
import PersonalCalculator from "./Calculator";
import YieldCalculatorPanel from "./YieldCalculatorPanel";
import TicketEVPanel from "./TicketEVPanel";
import CurrencyAmount from "./CurrencyAmount";
import ShuffleRevenueCard from "./ShuffleRevenueCard";
import ShuffleRevenueChart from "./ShuffleRevenueChart";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";
import TokenReturnsChart from "./TokenReturnsChart";
import TokenValuationTable from "./TokenValuationTable";
import RevenueAnalysis from "./RevenueAnalysis";
import Loader from "./Loader";
import LoadingBar from "./LoadingBar";
import { useToast } from "@/contexts/ToastContext";

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
  formatPercent,
  formatNumber,
  HistoricalDraw,
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
  // Toast hook
  const { addToast } = useToast();
  
  // Track if initial data has been loaded (prevents showing stale/default values)
  const [hasInitialData, setHasInitialData] = useState(false);
  
  // State - use null/empty initial values to prevent showing incorrect data
  const [price, setPrice] = useState<SHFLPrice | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [historicalDraws, setHistoricalDraws] = useState<HistoricalDraw[]>([]);
  const [lotteryStats, setLotteryStats] = useState<LotteryStats | null>(null);
  const [ngrStats, setNgrStats] = useState<NGRStats | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardSection>("lottery");
  const [liquidityData, setLiquidityData] = useState<{ volume24h: number; marketCapToVolume: number }>({ 
    volume24h: 0, 
    marketCapToVolume: 0 
  });

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
      
      // Fetch liquidity data
      try {
        const liquidityRes = await fetch("/api/market-caps");
        if (liquidityRes.ok) {
          const liquidityJson = await liquidityRes.json();
          if (liquidityJson.shflLiquidity) {
            setLiquidityData(liquidityJson.shflLiquidity);
          }
        }
      } catch {
        // Liquidity fetch failed silently
      }
      
      // Mark that we have initial data
      setHasInitialData(true);
      
      // Show success toast only on manual refresh
      if (showRefreshing) {
        addToast("Data refreshed successfully", "success", 2500);
      }
    } catch {
      addToast("Failed to load some data. Using cached values.", "warning", 4000);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Refresh price every 30 seconds
    const priceInterval = setInterval(async () => {
      const priceData = await fetchSHFLPrice();
      setPrice(priceData);
    }, 30000);

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
    if (!ngrStats || !lotteryStats || !price) return 0;
    // Get current prize split from latest completed draw
    const currentSplit = completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11";
    
    return calculateGlobalAPY(
      ngrStats.current4WeekAvg,
      lotteryStats.totalTickets,
      price.usd,
      currentSplit
    );
  }, [ngrStats, lotteryStats, price, completedDraws]);

  // Calculate additional stats
  const weeklyPoolUSD = lotteryStats?.currentWeekPool || 0;

  // Calculate 4-week vs prior 4-week NGR change
  const ngrChange = useMemo(() => {
    if (!ngrStats) return 0;
    const current = ngrStats.current4WeekAvg;
    const prior = ngrStats.prior4WeekAvg;
    if (prior === 0) return 0;
    return ((current - prior) / prior) * 100;
  }, [ngrStats]);

  // Calculate week-over-week staked change (current vs prior week from GraphQL)
  const stakedChange = useMemo(() => {
    if (!lotteryStats) return 0;
    const currentTickets = lotteryStats.totalTickets;
    const priorTickets = lotteryStats.priorWeekTickets || 0;
    if (priorTickets === 0) return 0;
    return ((currentTickets - priorTickets) / priorTickets) * 100;
  }, [lotteryStats]);

  // Calculate last week's APY (from the most recent completed draw)
  const lastWeekAPY = useMemo(() => {
    if (completedDraws.length === 0 || !lotteryStats || !price) return 0;
    const lastDraw = completedDraws[0];
    const ngrContribution = lastDraw.ngrUSD + (lastDraw.singlesAdded || 0) * 0.85;
    const totalTickets = lastDraw.totalTickets || lotteryStats.totalTickets;
    return calculateGlobalAPY(ngrContribution, totalTickets, price.usd, lastDraw.prizepoolSplit);
  }, [completedDraws, lotteryStats, price]);

  // Calculate APY change from last week vs current 4-week avg
  const apyChange = useMemo(() => {
    if (currentAPY === 0) return 0;
    return ((currentAPY - lastWeekAPY) / lastWeekAPY) * 100;
  }, [currentAPY, lastWeekAPY]);

  // Find highest APY draw
  const highestAPYData = useMemo(() => {
    if (completedDraws.length === 0 || !lotteryStats || !price) return { apy: 0, weeksAgo: 0 };
    
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
  }, [completedDraws, lotteryStats, price]);

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

  // ==================== REVENUE SECTION CALCULATIONS ====================
  
  // Calculate annual GGR and NGR
  const revenueStats = useMemo(() => {
    if (completedDraws.length === 0) return { 
      annualGGR: 0, annualNGR: 0, annualLotteryNGR: 0,
      weeklyNGRGrowth: 0, monthlyNGRGrowth: 0, annualNGRGrowth: 0,
      totalLotteryNGRAdded: 0, avgPoolSize: 0
    };
    
    // Calculate total lottery NGR added across ALL draws (this is the actual prizes distributed)
    const totalLotteryNGRAdded = completedDraws.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0);
    const avgWeeklyLotteryNGR = totalLotteryNGRAdded / completedDraws.length;
    
    // Annual values (Lottery NGR is 15% of Shuffle NGR)
    const annualLotteryNGR = avgWeeklyLotteryNGR * 52;
    const annualNGR = annualLotteryNGR / 0.15;  // Total Shuffle NGR
    const annualGGR = annualNGR * 2;  // GGR is roughly 2x NGR
    
    // Growth calculations - compare recent 4 weeks vs prior 4 weeks
    const recent4 = completedDraws.slice(0, 4);
    const prior4 = completedDraws.slice(4, 8);
    const recentNGR = recent4.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / recent4.length;
    const priorNGR = prior4.length > 0 ? prior4.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / prior4.length : recentNGR;
    const monthlyNGRGrowth = priorNGR > 0 ? ((recentNGR - priorNGR) / priorNGR) * 100 : 0;
    
    // Weekly growth
    const weekNGR = completedDraws[0]?.ngrUSD + (completedDraws[0]?.singlesAdded || 0) * 0.85 || 0;
    const priorWeekNGR = completedDraws[1]?.ngrUSD + (completedDraws[1]?.singlesAdded || 0) * 0.85 || weekNGR;
    const weeklyNGRGrowth = priorWeekNGR > 0 ? ((weekNGR - priorWeekNGR) / priorWeekNGR) * 100 : 0;
    
    // Annual growth (first half vs second half of all draws)
    const halfPoint = Math.floor(completedDraws.length / 2);
    const recentHalf = completedDraws.slice(0, halfPoint);
    const olderHalf = completedDraws.slice(halfPoint);
    const recentAvg = recentHalf.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / recentHalf.length;
    const olderAvg = olderHalf.length > 0 ? olderHalf.reduce((sum, d) => sum + d.ngrUSD + (d.singlesAdded || 0) * 0.85, 0) / olderHalf.length : recentAvg;
    const annualNGRGrowth = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    
    // Average pool size
    const avgPoolSize = completedDraws.reduce((sum, d) => sum + d.totalPoolUSD, 0) / completedDraws.length;
    
    return { 
      annualGGR, annualNGR, annualLotteryNGR,
      weeklyNGRGrowth, monthlyNGRGrowth, annualNGRGrowth,
      totalLotteryNGRAdded, avgPoolSize
    };
  }, [completedDraws]);

  // Overall business health - use same logic as Revenue Analysis component
  // Based on recent NGR trends (weekly + monthly average)
  const overallBusinessHealth = useMemo(() => {
    const { weeklyNGRGrowth, monthlyNGRGrowth } = revenueStats;
    // Use weighted average: more weight on monthly trend
    const avgGrowth = (weeklyNGRGrowth * 0.3 + monthlyNGRGrowth * 0.7);
    
    if (avgGrowth > 5) return { status: "hot", emoji: "🔥", label: "Running Hot", color: "text-orange-400", bgColor: "bg-orange-500/10" };
    if (avgGrowth < -5) return { status: "cold", emoji: "🥶", label: "Running Cold", color: "text-blue-400", bgColor: "bg-blue-500/10" };
    return { status: "neutral", emoji: "📊", label: "As Expected", color: "text-terminal-textSecondary", bgColor: "bg-terminal-border/30" };
  }, [revenueStats]);

  // Business growth trend - based on recent NGR performance
  const businessGrowth = useMemo(() => {
    const { weeklyNGRGrowth, monthlyNGRGrowth } = revenueStats;
    // Weight monthly more heavily
    const avgGrowth = (weeklyNGRGrowth * 0.3 + monthlyNGRGrowth * 0.7);
    
    if (avgGrowth > 15) return { status: "skyrocketing", emoji: "🚀", label: "Skyrocketing", color: "text-terminal-positive", change: avgGrowth };
    if (avgGrowth > 5) return { status: "growing", emoji: "📈", label: "Growing", color: "text-terminal-positive", change: avgGrowth };
    if (avgGrowth < -5) return { status: "slowing", emoji: "📉", label: "Slowing", color: "text-terminal-negative", change: avgGrowth };
    return { status: "steady", emoji: "➡️", label: "Steady", color: "text-terminal-textSecondary", change: avgGrowth };
  }, [revenueStats]);

  // ==================== TOKEN SECTION CALCULATIONS ====================
  
  // Token metrics
  const tokenMetrics = useMemo(() => {
    if (!lotteryStats || !price) return {
      marketCap: 0, fdv: 0, circulatingSupply: 0, totalSupply: 0, burnedTokens: 0,
      annualLotteryNGR: 0, valueToHoldersRatio: 0, peRatio: 0, stakedSupply: 0, stakedPercent: 0
    };
    
    const circulatingSupply = lotteryStats.circulatingSupply || 361000000;
    const burnedTokens = lotteryStats.burnedTokens || 53693902;
    // Total supply = 1 billion - burned tokens
    const totalSupply = 1000000000 - burnedTokens;
    const marketCap = price.usd * circulatingSupply;
    const fdv = price.usd * totalSupply;
    
    // Value to tokenholders = Lottery NGR (15% of Shuffle NGR)
    const annualLotteryNGR = revenueStats.annualLotteryNGR;
    const valueToHoldersRatio = marketCap > 0 ? marketCap / annualLotteryNGR : 0;
    
    // P/E style ratio
    const peRatio = annualLotteryNGR > 0 ? marketCap / annualLotteryNGR : 0;
    
    // Staking stats
    const stakedSupply = lotteryStats.totalSHFLStaked || 0;
    const stakedPercent = circulatingSupply > 0 ? (stakedSupply / circulatingSupply) * 100 : 0;
    
    return {
      marketCap,
      fdv,
      circulatingSupply,
      totalSupply,
      burnedTokens,
      annualLotteryNGR,
      valueToHoldersRatio,
      peRatio,
      stakedSupply,
      stakedPercent
    };
  }, [price, lotteryStats, revenueStats.annualLotteryNGR]);

  // Show loader until we have initial data
  if (isLoading || !hasInitialData || !price || !lotteryStats || !ngrStats) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-terminal-black terminal-grid">
      {/* Loading Progress Bar */}
      <LoadingBar isLoading={isRefreshing} />
      
      {/* Header */}
      <Header
        price={price.usd}
        priceChange24h={price.usd_24h_change}
        nextDrawTimestamp={lotteryStats.nextDrawTimestamp}
      />

      {/* Main Content */}
      <main id="main-content" className="max-w-[1800px] mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-safe">
        {/* Section Selector */}
        <SectionSelector 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />

        {/* Action Button Row - Hidden on mobile, merged into header */}
        <div className="hidden sm:flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-xs text-terminal-textMuted">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-2 hover:text-terminal-accent hover:bg-terminal-accent/10 rounded-lg transition-all disabled:opacity-50 touch-target"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ==================== UNIFIED KPI ROW ==================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Card 1 - Primary (highlighted) */}
          <div className="bg-terminal-card border border-terminal-accent/30 rounded-lg p-3 sm:p-4 shadow-glow-sm h-full min-h-[140px] sm:min-h-[180px]">
            <div key={`card1-${activeSection}`} className="kpi-content-enter h-full flex flex-col">
              {activeSection === "lottery" && (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-terminal-accent/20 border border-terminal-accent/30">
                        <Percent className="w-4 h-4 text-terminal-accent" />
                      </div>
                      <span className="text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Annual Yield
                      </span>
                      <InfoTooltip content={TOOLTIPS.apy} title="What is APY?" />
                    </div>
                    {apyChange !== 0 && !isNaN(apyChange) && isFinite(apyChange) && (
                      <div className={`hidden sm:flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${apyChange > 0 ? "text-terminal-positive bg-terminal-positive/10" : "text-terminal-negative bg-terminal-negative/10"}`}>
                        <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${apyChange < 0 ? "rotate-180" : ""}`} />
                        <span>{apyChange > 0 ? "+" : ""}{apyChange.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <span className="text-xl sm:text-3xl font-bold text-terminal-accent tabular-nums">{formatPercent(currentAPY)}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">4-week avg</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Last Week</span>
                      <span className="font-medium text-terminal-text tabular-nums">{formatPercent(lastWeekAPY)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Highest</span>
                      <span className="font-medium text-terminal-positive tabular-nums">{formatPercent(highestAPYData.apy)}</span>
                    </div>
                  </div>
                </>
              )}
              {activeSection === "revenue" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/20 border border-terminal-accent/30">
                        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Annual GGR
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <CurrencyAmount amount={revenueStats.annualGGR} className="text-xl sm:text-3xl font-bold text-terminal-accent" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Gross Gaming Revenue</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Annual NGR</span>
                      <CurrencyAmount amount={revenueStats.annualNGR} className="font-medium text-terminal-text text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Lottery NGR</span>
                      <CurrencyAmount amount={revenueStats.annualLotteryNGR} className="font-medium text-terminal-positive text-[10px] sm:text-xs" />
                    </div>
                  </div>
                </>
              )}
              {activeSection === "token" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/20 border border-terminal-accent/30">
                        <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Market Cap
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <span className="text-xl sm:text-3xl font-bold text-terminal-accent tabular-nums">${formatNumber(Math.round(tokenMetrics.marketCap / 1000000))}M</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Circulating</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">FDV</span>
                      <span className="font-medium text-terminal-text tabular-nums">${formatNumber(Math.round(tokenMetrics.fdv / 1000000))}M</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Price</span>
                      <span className="font-medium text-terminal-text tabular-nums">${price.usd.toFixed(4)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-terminal-card border border-terminal-border rounded-lg p-3 sm:p-4 card-glow h-full min-h-[140px] sm:min-h-[180px]">
            <div key={`card2-${activeSection}`} className="kpi-content-enter h-full flex flex-col">
              {activeSection === "lottery" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                        <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Upcoming Draw
                      </span>
                    </div>
                    {prizePoolChange !== 0 && !isNaN(prizePoolChange) && isFinite(prizePoolChange) && (
                      <div className={`hidden sm:flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${prizePoolChange > 0 ? "text-terminal-positive bg-terminal-positive/10" : "text-terminal-negative bg-terminal-negative/10"}`}>
                        <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${prizePoolChange < 0 ? "rotate-180" : ""}`} />
                        <span>{prizePoolChange > 0 ? "+" : ""}{prizePoolChange.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <CurrencyAmount amount={weeklyPoolUSD} className="text-xl sm:text-3xl font-bold text-terminal-text" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Draw #{lotteryStats.drawNumber || 64}</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Last Week</span>
                      <CurrencyAmount amount={completedDraws[0]?.totalPoolUSD || 0} className="font-medium text-terminal-text text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Highest</span>
                      <CurrencyAmount amount={highestPrizePoolData.pool} className="font-medium text-terminal-positive text-[10px] sm:text-xs" />
                    </div>
                  </div>
                </>
              )}
              {activeSection === "revenue" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className={`p-1 sm:p-1.5 rounded border ${overallBusinessHealth.status === "hot" ? "bg-orange-500/20 border-orange-500/30" : overallBusinessHealth.status === "cold" ? "bg-blue-500/20 border-blue-500/30" : "bg-terminal-accent/10 border-terminal-accent/20"}`}>
                        <Activity className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${overallBusinessHealth.color}`} />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Health
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-3xl">{overallBusinessHealth.emoji}</span>
                    <span className={`text-base sm:text-2xl font-bold ${overallBusinessHealth.color}`}>{overallBusinessHealth.label}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Weekly & monthly trends</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Weekly</span>
                      <span className={`font-medium ${revenueStats.weeklyNGRGrowth >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>{revenueStats.weeklyNGRGrowth >= 0 ? "+" : ""}{revenueStats.weeklyNGRGrowth.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Monthly</span>
                      <span className={`font-medium ${revenueStats.monthlyNGRGrowth >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>{revenueStats.monthlyNGRGrowth >= 0 ? "+" : ""}{revenueStats.monthlyNGRGrowth.toFixed(1)}%</span>
                    </div>
                  </div>
                </>
              )}
              {activeSection === "token" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Supply
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <span className="text-xl sm:text-3xl font-bold text-terminal-text tabular-nums">{formatNumber(Math.round(tokenMetrics.circulatingSupply / 1000000))}M</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Circulating</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Total</span>
                      <span className="font-medium text-terminal-text tabular-nums">{formatNumber(Math.round(tokenMetrics.totalSupply / 1000000))}M</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Burned</span>
                      <span className="font-medium text-terminal-negative tabular-nums">{formatNumber(Math.round(tokenMetrics.burnedTokens / 1000000))}M</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-terminal-card border border-terminal-border rounded-lg p-3 sm:p-4 card-glow h-full min-h-[140px] sm:min-h-[180px]">
            <div key={`card3-${activeSection}`} className="kpi-content-enter h-full flex flex-col">
              {activeSection === "lottery" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Staked
                      </span>
                    </div>
                    {stakedChange !== 0 && (
                      <div className={`hidden sm:flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${stakedChange > 0 ? "text-terminal-positive bg-terminal-positive/10" : "text-terminal-negative bg-terminal-negative/10"}`}>
                        <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${stakedChange < 0 ? "rotate-180" : ""}`} />
                        <span>{stakedChange > 0 ? "+" : ""}{stakedChange.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <span className="text-xl sm:text-3xl font-bold text-terminal-text tabular-nums">{formatNumber(Math.floor(lotteryStats.totalSHFLStaked / 1_000_000))}M</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">SHFL staked</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Circulating</span>
                      <span className="font-bold text-terminal-accent tabular-nums">{lotteryStats.circulatingSupply ? ((lotteryStats.totalSHFLStaked / lotteryStats.circulatingSupply) * 100).toFixed(1) : "0"}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Total</span>
                      <span className="font-bold text-purple-400 tabular-nums">{lotteryStats.totalSupply ? ((lotteryStats.totalSHFLStaked / lotteryStats.totalSupply) * 100).toFixed(1) : "0"}%</span>
                    </div>
                  </div>
                </>
              )}
              {activeSection === "revenue" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                        <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Growth
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-3xl">{businessGrowth.emoji}</span>
                    <span className={`text-base sm:text-2xl font-bold ${businessGrowth.color}`}>{businessGrowth.label}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">4-week trend</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Rate</span>
                      <span className={`font-medium ${businessGrowth.change >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>{businessGrowth.change >= 0 ? "+" : ""}{businessGrowth.change.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Avg Pool</span>
                      <CurrencyAmount amount={revenueStats.avgPoolSize} className="font-medium text-terminal-text text-[10px] sm:text-xs" />
                    </div>
                  </div>
                </>
              )}
              {activeSection === "token" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-positive/10 border border-terminal-positive/20">
                        <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-positive" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Value/Year
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <CurrencyAmount amount={tokenMetrics.annualLotteryNGR} className="text-xl sm:text-3xl font-bold text-terminal-positive" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Lottery NGR</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">P/E</span>
                      <span className={`font-medium tabular-nums ${tokenMetrics.peRatio < 10 ? "text-terminal-positive" : tokenMetrics.peRatio < 20 ? "text-yellow-400" : "text-terminal-negative"}`}>{tokenMetrics.peRatio.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Staked</span>
                      <span className="font-medium text-purple-400 tabular-nums">{tokenMetrics.stakedPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-terminal-card border border-terminal-border rounded-lg p-3 sm:p-4 card-glow h-full min-h-[140px] sm:min-h-[180px]">
            <div key={`card4-${activeSection}`} className="kpi-content-enter h-full flex flex-col">
              {activeSection === "lottery" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-accent" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Weekly NGR
                      </span>
                    </div>
                    {ngrChange !== 0 && !isNaN(ngrChange) && isFinite(ngrChange) && (
                      <div className={`hidden sm:flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${ngrChange > 0 ? "text-terminal-positive bg-terminal-positive/10" : "text-terminal-negative bg-terminal-negative/10"}`}>
                        <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${ngrChange < 0 ? "rotate-180" : ""}`} />
                        <span>{ngrChange > 0 ? "+" : ""}{ngrChange.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <CurrencyAmount amount={ngrStats.current4WeekAvg} className="text-xl sm:text-3xl font-bold text-terminal-text" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">4-week avg</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Last Week</span>
                      <CurrencyAmount amount={lastWeekNGR + (completedDraws[0]?.singlesAdded || 0) * 0.85} className="font-medium text-terminal-accent text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Highest</span>
                      <CurrencyAmount amount={highestNGRData.ngr} className="font-medium text-terminal-positive text-[10px] sm:text-xs" />
                    </div>
                  </div>
                </>
              )}
              {activeSection === "revenue" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-terminal-positive/10 border border-terminal-positive/20">
                        <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-terminal-positive" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        USDC Awarded
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" alt="USDC" className="w-5 h-5 sm:w-7 sm:h-7" />
                    <CurrencyAmount amount={revenueStats.totalLotteryNGRAdded} className="text-xl sm:text-3xl font-bold text-terminal-positive" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">Lifetime</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Draws</span>
                      <span className="font-medium text-terminal-text">{completedDraws.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Avg/Draw</span>
                      <CurrencyAmount amount={completedDraws.length > 0 ? revenueStats.totalLotteryNGRAdded / completedDraws.length : 0} className="font-medium text-terminal-text text-[10px] sm:text-xs" />
                    </div>
                  </div>
                </>
              )}
              {activeSection === "token" && (
                <>
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="p-1 sm:p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                        <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
                        Liquidity
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 sm:mb-2">
                    <CurrencyAmount amount={liquidityData.volume24h} className="text-xl sm:text-3xl font-bold text-blue-400" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-terminal-textMuted mb-1">24h volume</div>
                  <div className="space-y-0.5 sm:space-y-1 mt-auto pt-1.5 sm:pt-2 border-t border-terminal-border/50">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">MC/Vol</span>
                      <span className="font-medium text-terminal-text tabular-nums">{liquidityData.marketCapToVolume > 0 ? `${liquidityData.marketCapToVolume.toFixed(1)}x` : "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-terminal-textMuted">Turnover</span>
                      <span className="font-medium text-terminal-text tabular-nums">{tokenMetrics.marketCap > 0 && liquidityData.volume24h > 0 ? `${((liquidityData.volume24h / tokenMetrics.marketCap) * 100).toFixed(2)}%` : "-"}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ==================== LOTTERY SECTION ==================== */}
        {activeSection === "lottery" && (
          <div className="section-content">

            {/* Yield Calculator Panel */}
            <YieldCalculatorPanel
              shflPrice={price.usd}
              // For upcoming draw, use the latest completed draw's POSTED NGR
              currentWeekNGR={completedDraws[0]?.postedNgrUSD || completedDraws[0]?.ngrUSD || ngrStats.current4WeekAvg}
              avgWeeklyNGR={ngrStats.current4WeekAvg}
              totalTickets={lotteryStats.totalTickets}
              historicalDraws={completedDraws}
              prizeSplit={completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
              upcomingDraw={{
                drawNumber: lotteryStats.drawNumber || 64,
                date: new Date(lotteryStats.nextDrawTimestamp).toISOString(),
                ngrUSD: completedDraws[0]?.postedNgrUSD || completedDraws[0]?.ngrUSD || ngrStats.current4WeekAvg,
                totalTickets: lotteryStats.totalTickets,
                prizeSplit: completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11",
              }}
            />

            {/* Charts and Ticket EV Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 items-stretch">
              {/* NGR vs Price Chart */}
              <div className="lg:col-span-2 h-full">
                <YieldChart data={chartData} />
              </div>

              {/* Ticket Expected Value */}
              <div className="h-full">
                <TicketEVPanel
                  totalPool={weeklyPoolUSD}
                  prizeSplit={completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
                  totalTickets={lotteryStats.totalTickets}
                  shflPrice={price.usd}
                  historicalDraws={completedDraws}
                  currentDrawNumber={lotteryStats.drawNumber}
                />
              </div>
            </div>

            {/* Sensitivity Table & Jackpot Frequency - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <SensitivityTable
                baseNGR={ngrStats.current4WeekAvg}
                basePrice={price.usd}
                totalTickets={lotteryStats.totalTickets}
                prizeSplit={completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11"}
              />
              <JackpotFrequencyPanel
                historicalDraws={completedDraws}
                currentTickets={lotteryStats.totalTickets}
                currentJackpot={lotteryStats.jackpotAmount || weeklyPoolUSD * 0.87}
              />
            </div>

            {/* Lottery History Table */}
            <LotteryHistoryTable 
              draws={completedDraws} 
              upcomingDraw={{
                drawNumber: lotteryStats.drawNumber || 64,
                date: new Date(lotteryStats.nextDrawTimestamp).toISOString(),
                totalPoolUSD: weeklyPoolUSD,
                jackpotAmount: lotteryStats.jackpotAmount || weeklyPoolUSD * 0.87,
                totalTickets: lotteryStats.totalTickets,
                prizeSplit: completedDraws[0]?.prizepoolSplit || "30-14-8-9-7-6-5-10-11",
                // For upcoming draw, use the latest completed draw's POSTED NGR (what goes to next draw)
                ngrUSD: completedDraws[0]?.postedNgrUSD || completedDraws[0]?.ngrUSD || ngrStats.current4WeekAvg,
              }}
            />
          </div>
        )}

        {/* ==================== REVENUE SECTION ==================== */}
        {activeSection === "revenue" && (
          <div className="section-content">
            {/* Revenue Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <ShuffleRevenueCard
                historicalDraws={completedDraws}
                // For current week, use the latest completed draw's POSTED NGR
                currentWeekNGR={completedDraws[0]?.postedNgrUSD || completedDraws[0]?.ngrUSD || ngrStats.current4WeekAvg}
              />
              <RevenueAnalysis
                historicalDraws={completedDraws}
                currentWeekNGR={completedDraws[0]?.postedNgrUSD || completedDraws[0]?.ngrUSD || ngrStats.current4WeekAvg}
              />
            </div>

            {/* Revenue History Chart */}
            <ShuffleRevenueChart historicalDraws={completedDraws} />
          </div>
        )}

        {/* ==================== TOKEN SECTION ==================== */}
        {activeSection === "token" && (
          <div className="section-content">
            {/* Token Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <TokenReturnsChart />
              <TokenValuationTable />
            </div>
          </div>
        )}

        {/* Disclaimer & Footer */}
        <footer className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-terminal-border">
          {/* Global Disclaimer */}
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-terminal-dark rounded border border-yellow-500/30 text-[10px] sm:text-xs text-terminal-textMuted">
            <p className="mb-1">
              <span className="text-yellow-400 font-medium">⚠️ Disclaimer:</span>{" "}
              This platform is not affiliated with, endorsed by, or associated with Shuffle.com.
            </p>
            <p>
              Gross revenue numbers are estimates. Net revenue figures are derived from publicly available data provided by Shuffle.
              All calculations are for informational purposes only and should not be considered financial advice.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-[10px] sm:text-xs text-terminal-textMuted">
            <div className="flex items-center gap-4">
              <span>SHFLPro Terminal v1.0</span>
              <span>•</span>
              <span>Data updates every 60s</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-terminal-textMuted/70">
                Data Sources:
              </span>
              <a 
                href="https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-terminal-accent transition-colors"
              >
                Shuffle (Lottery)
              </a>
              <a 
                href="https://www.coingecko.com/en/coins/shuffle-2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-terminal-accent transition-colors"
              >
                CoinGecko (Prices)
              </a>
              <a 
                href="https://terminal.tanzanite.xyz/overview" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-terminal-accent transition-colors"
              >
                Tanzanite (Deposits)
              </a>
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
