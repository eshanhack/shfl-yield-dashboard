"use client";

import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useSpring, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Coins,
  Ticket,
  TrendingUp,
  Calendar,
  Gift,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  DollarSign,
  Users,
  Clock,
  Zap,
  Award,
  BarChart3,
  ArrowDown,
  ExternalLink,
  X,
  Copy,
  Check,
  Info,
  Infinity as InfinityIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LearnPageProps {
  onBack?: () => void;
  nextDrawTimestamp?: number;
  shflPrice?: number;
}

// SHFL Contract Address
const SHFL_CONTRACT = "0x8881562783028F5c1BCB985d2283D5E170D88888";

// Create context for SHFL price to share across components
const SHFLPriceContext = createContext<number>(0.05);

// Hook to use SHFL price
function useSHFLPrice() {
  return useContext(SHFLPriceContext);
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1000, enabled: boolean = true) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, enabled]);
  
  return count;
}


// Section wrapper with scroll animation
function AnimatedSection({ 
  children, 
  className = "",
  delay = 0,
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

// NEW: The "Never-Expiring Lottery Ticket" Concept
function LotteryTicketConcept() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [ticketCount, setTicketCount] = useState(100);
  const [weeks, setWeeks] = useState(1);
  
  // Simulate wins over weeks
  const weeklyWinChance = ticketCount / 180000; // Simplified
  const avgWeeklyWin = weeklyWinChance * 400000; // Avg pool
  const totalWins = avgWeeklyWin * weeks;
  
  return (
    <div ref={ref} className="py-6 lg:py-10">
      <div className="max-w-3xl mx-auto">
        {/* The Concept */}
        <div className="text-center mb-8 lg:mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ type: "spring", duration: 0.8 }}
            className="inline-flex justify-center mb-6"
          >
            {/* Glowing ticket stack - properly sized container */}
            <div className="relative w-24 h-32 lg:w-28 lg:h-36">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-20 h-28 lg:w-24 lg:h-32 bg-gradient-to-br from-terminal-accent to-purple-600 rounded-xl shadow-lg shadow-terminal-accent/30"
                  style={{
                    top: i * 4,
                    left: i * 4,
                    zIndex: 3 - i,
                  }}
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Ticket className="w-8 h-8 lg:w-10 lg:h-10 text-white/80" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <InfinityIcon className="w-4 h-4 text-white/60 mx-auto" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <h3 className="text-xl lg:text-2xl font-bold text-terminal-text mb-4">
            Lottery Tickets That <span className="text-terminal-accent">Never Expire</span>
          </h3>
          
          <p className="text-sm lg:text-base text-terminal-textSecondary max-w-xl mx-auto">
            Imagine buying lottery tickets <span className="text-terminal-accent font-semibold">once</span>, 
            but they enter <span className="text-terminal-accent font-semibold">every single draw forever</span>. 
            If you had enough tickets, some of them would win an amount of money every week, without ever buying another ticket.
          </p>
          
          {/* SHFL → USDC Flow Visual */}
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terminal-accent/10 border border-terminal-accent/30">
              <Coins className="w-4 h-4 text-terminal-accent" />
              <span className="text-terminal-accent font-medium">Stake SHFL</span>
            </div>
            <ArrowRight className="w-4 h-4 text-terminal-textMuted" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">Claim USDC Weekly</span>
            </div>
          </div>
        </div>
        
        {/* Interactive Visualization */}
        <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-terminal-textSecondary">Your Tickets (bought once)</span>
                  <span className="font-mono text-terminal-accent font-bold">{ticketCount}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={1000}
                  step={10}
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Number(e.target.value))}
                  className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-terminal-textSecondary">Weeks Held</span>
                  <span className="font-mono text-terminal-text">{weeks} {weeks === 1 ? "week" : "weeks"}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
                />
              </div>
            </div>
            
            {/* Results */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-terminal-dark">
                <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Draws Entered</div>
                <div className="text-2xl font-bold text-terminal-text">{weeks}</div>
                <div className="text-[10px] text-terminal-textMuted">with the same tickets</div>
              </div>
              
              <div className="p-3 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30">
                <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Est. Total Winnings</div>
                <div className="text-2xl font-bold text-terminal-accent">
                  ${totalWins.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-terminal-textMuted">over {weeks} weeks</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-terminal-border">
            <p className="text-xs text-terminal-textMuted text-center">
              <span className="text-yellow-400">⚠️</span> This is a simplified illustration. 
              Actual returns depend on pool size, total tickets, and variance.
            </p>
          </div>
        </div>
        
        {/* The Key Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm lg:text-base text-terminal-textSecondary">
            <span className="text-terminal-accent font-semibold">That&apos;s exactly what SHFL staking does.</span>{" "}
            Stake your tokens once, get tickets that enter every weekly draw automatically.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Revenue Flow Animation - CORRECTED MATH
function RevenueFlowDiagram() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shflPrice = useSHFLPrice();
  const [bettingVolume, setBettingVolume] = useState(750000000); // Default $750M
  const [animationStep, setAnimationStep] = useState(0);
  const [inputMode, setInputMode] = useState<"shfl" | "tickets" | "usd">("shfl");
  const [userInput, setUserInput] = useState(50000); // 50K SHFL default
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // CORRECTED MATH:
  // GGR = ~2% of betting volume (house edge)
  // NGR = 30% of GGR (after bonuses, marketing, costs)
  // Lottery Pool = 15% of NGR
  const houseEdge = 0.02; // 2%
  const ngrRate = 0.30; // 30% of GGR becomes NGR
  const lotteryRate = 0.15; // 15% of NGR
  
  const ggr = bettingVolume * houseEdge;
  const ngr = ggr * ngrRate;
  const lotteryPool = ngr * lotteryRate;
  
  // Calculate user's share based on input mode
  const totalStaked = 180000000; // 180M staked
  const totalTickets = totalStaked / 50; // ~3.6M tickets
  
  const getUserTickets = () => {
    switch (inputMode) {
      case "shfl": return Math.floor(userInput / 50);
      case "tickets": return userInput;
      case "usd": return Math.floor((userInput / shflPrice) / 50);
    }
  };
  
  const userTickets = getUserTickets();
  const userShare = userTickets / totalTickets;
  const weeklyYield = lotteryPool * userShare;
  
  useEffect(() => {
    if (!isInView) return;
    
    const interval = setInterval(() => {
      setAnimationStep(s => (s + 1) % 5);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isInView]);
  
  const formatMoney = (n: number) => {
    if (n >= 1000000000) return `$${(n / 1000000000).toFixed(2)}B`;
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };
  
  const handleModeChange = (newMode: "shfl" | "tickets" | "usd") => {
    // Convert current value to new mode
    const currentTickets = getUserTickets();
    switch (newMode) {
      case "shfl":
        setUserInput(currentTickets * 50);
        break;
      case "tickets":
        setUserInput(currentTickets);
        break;
      case "usd":
        setUserInput(Math.round(currentTickets * 50 * shflPrice));
        break;
    }
    setInputMode(newMode);
    setDropdownOpen(false);
  };
  
  const getInputLabel = () => {
    switch (inputMode) {
      case "shfl": return "SHFL";
      case "tickets": return "Tickets";
      case "usd": return "USD";
    }
  };
  
  return (
    <div ref={ref} className="relative py-4 lg:py-8">
      {/* Betting Volume Slider */}
      <div className="mb-6 lg:mb-8 text-center">
        <label className="block text-sm text-terminal-textSecondary mb-2">
          Weekly Betting Volume on Shuffle
        </label>
        <input
          type="range"
          min={250000000}
          max={2000000000}
          step={50000000}
          value={bettingVolume}
          onChange={(e) => setBettingVolume(Number(e.target.value))}
          className="w-full max-w-md h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
        />
        <div className="text-xl lg:text-2xl font-bold text-terminal-accent mt-2">
          {formatMoney(bettingVolume)}
        </div>
        <div className="text-xs text-terminal-textMuted mt-1">
          Typical: ~$500M per week
        </div>
      </div>
      
      {/* User Input Section with Dropdown */}
      <div className="mb-6 p-4 rounded-xl bg-terminal-card border border-terminal-border max-w-md mx-auto">
        <label className="text-sm text-terminal-textSecondary block mb-3">Your Position</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={userInput}
            onChange={(e) => setUserInput(Math.max(0, Number(e.target.value) || 0))}
            className="flex-1 px-3 py-2 rounded-lg bg-terminal-dark border border-terminal-border text-center font-mono text-terminal-text"
          />
          {/* Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-terminal-accent/10 border border-terminal-accent/30 text-terminal-accent text-sm font-medium hover:bg-terminal-accent/20 transition-colors min-w-[90px] justify-between"
            >
              {getInputLabel()}
              <ChevronDown className={cn("w-4 h-4 transition-transform", dropdownOpen && "rotate-180")} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-terminal-card border border-terminal-border rounded-lg shadow-xl z-20 overflow-hidden">
                {(["shfl", "tickets", "usd"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm hover:bg-terminal-accent/10 transition-colors",
                      inputMode === mode ? "text-terminal-accent bg-terminal-accent/5" : "text-terminal-text"
                    )}
                  >
                    {mode === "shfl" ? "SHFL" : mode === "tickets" ? "Tickets" : "USD"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-terminal-textMuted mt-2 text-center">
          = <span className="text-terminal-accent font-mono">{userTickets.toLocaleString()}</span> tickets
        </div>
      </div>
      
      {/* Flow Diagram - Vertical on mobile, Horizontal on desktop */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-4">
        {/* Players Bet */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[130px]",
            animationStep >= 0 
              ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 0 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400 mx-auto mb-1" />
          <div className="text-center">
            <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase mb-0.5">Players Bet</div>
            <div className="text-sm lg:text-base font-bold text-blue-400">{formatMoney(bettingVolume)}</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div className="text-terminal-textMuted" animate={animationStep === 1 ? { opacity: [0.5, 1, 0.5] } : {}}>
          <ArrowDown className="w-4 h-4 lg:hidden" />
          <ArrowRight className="w-4 h-4 hidden lg:block" />
        </motion.div>
        
        {/* GGR */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[130px]",
            animationStep >= 1 
              ? "bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 1 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Coins className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400 mx-auto mb-1" />
          <div className="text-center">
            <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase mb-0.5">GGR (~2%)</div>
            <div className="text-sm lg:text-base font-bold text-yellow-400">{formatMoney(ggr)}</div>
            <div className="text-[8px] lg:text-[9px] text-terminal-textMuted">House Edge</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div className="text-terminal-textMuted" animate={animationStep === 2 ? { opacity: [0.5, 1, 0.5] } : {}}>
          <ArrowDown className="w-4 h-4 lg:hidden" />
          <ArrowRight className="w-4 h-4 hidden lg:block" />
        </motion.div>
        
        {/* NGR */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[130px]",
            animationStep >= 2 
              ? "bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 2 ? { scale: [1, 1.05, 1] } : {}}
        >
          <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-center">
            <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase mb-0.5">NGR (30%)</div>
            <div className="text-sm lg:text-base font-bold text-orange-400">{formatMoney(ngr)}</div>
            <div className="text-[8px] lg:text-[9px] text-terminal-textMuted">After Costs</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div className="text-terminal-textMuted" animate={animationStep === 3 ? { opacity: [0.5, 1, 0.5] } : {}}>
          <ArrowDown className="w-4 h-4 lg:hidden" />
          <ArrowRight className="w-4 h-4 hidden lg:block" />
        </motion.div>
        
        {/* Lottery Pool */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[130px]",
            animationStep >= 3 
              ? "bg-terminal-accent/20 border-terminal-accent shadow-lg shadow-terminal-accent/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep >= 3 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Gift className="w-5 h-5 lg:w-6 lg:h-6 text-terminal-accent mx-auto mb-1" />
          <div className="text-center">
            <div className="text-[9px] lg:text-[10px] text-terminal-textMuted uppercase mb-0.5">Lottery (15%)</div>
            <div className="text-sm lg:text-base font-bold text-terminal-accent">{formatMoney(lotteryPool)}</div>
            <div className="text-[8px] lg:text-[9px] text-terminal-accent">Weekly Lottery Pool</div>
          </div>
        </motion.div>
      </div>
      
      {/* Breakdown explanation */}
      <div className="mt-6 p-4 rounded-xl bg-terminal-card border border-terminal-border max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-yellow-400 font-bold">2%</div>
            <div className="text-terminal-textMuted text-[10px]">Avg house edge on bets</div>
          </div>
          <div>
            <div className="text-orange-400 font-bold">30%</div>
            <div className="text-terminal-textMuted text-[10px]">Kept after bonuses & costs</div>
          </div>
          <div>
            <div className="text-terminal-accent font-bold">15%</div>
            <div className="text-terminal-textMuted text-[10px]">Of NGR to lottery pool</div>
          </div>
        </div>
      </div>
      
      {/* Weekly Yield Result - EMPHASIZED */}
      <motion.div 
        className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500 max-w-md mx-auto text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.5 }}
      >
        <div className="text-xs text-green-400 uppercase tracking-wider mb-1 font-medium flex items-center justify-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Your Estimated WEEKLY USDC
        </div>
        <div className="text-3xl lg:text-4xl font-bold text-green-400">
          {formatMoney(weeklyYield)}
        </div>
        <div className="text-xs text-terminal-textMuted mt-2">
          Claimable every Friday • {userTickets.toLocaleString()} tickets • {(userShare * 100).toFixed(4)}% share
        </div>
        <div className="text-[10px] text-green-400/70 mt-1">
          ≈ {formatMoney(weeklyYield * 52)} USDC annually
        </div>
      </motion.div>
      
      {/* Explanation */}
      <motion.div className="mt-4 text-center">
        <p className="text-terminal-textSecondary text-xs lg:text-sm max-w-xl mx-auto">
          The <span className="text-terminal-accent font-semibold">{formatMoney(lotteryPool)}</span> weekly pool 
          is distributed every Friday based on your ticket share.
        </p>
      </motion.div>
    </div>
  );
}

// Interactive Pie Chart showing stake share - EXPANDED RANGE
function StakeSharePie() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shflPrice = useSHFLPrice();
  const [userStake, setUserStake] = useState(50000);
  const totalStaked = 180000000; // 180M tokens staked
  const weeklyPool = 400000; // ~$400K weekly pool
  
  // 1 ticket per 50 SHFL
  const userTickets = Math.floor(userStake / 50);
  const totalTickets = Math.floor(totalStaked / 50); // ~3.6M tickets
  
  const userShare = userTickets / totalTickets;
  const weeklyYield = weeklyPool * userShare;
  const annualYield = weeklyYield * 52;
  const usdValue = userStake * shflPrice;
  
  const animatedYield = useAnimatedCounter(Math.round(weeklyYield), 800, isInView);
  
  return (
    <div ref={ref} className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        {/* Pie Visualization */}
        <div className="relative flex justify-center order-2 lg:order-1">
          <div className="relative w-40 h-40 lg:w-56 lg:h-56">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="20" className="text-terminal-border" />
              <motion.circle
                cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="20"
                className="text-terminal-accent"
                strokeDasharray={`${Math.max(userShare * 251.2, 0.5)} 251.2`}
                initial={{ strokeDashoffset: 251.2 }}
                animate={isInView ? { strokeDashoffset: 0 } : {}}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-lg lg:text-2xl font-bold text-terminal-accent">
                {(userShare * 100).toFixed(userShare < 0.0001 ? 4 : 3)}%
              </div>
              <div className="text-[9px] lg:text-xs text-terminal-textMuted">Your Share</div>
            </div>
          </div>
        </div>
        
        {/* Controls & Results */}
        <div className="space-y-4 lg:space-y-5 order-1 lg:order-2">
          <div>
            <label className="block text-sm text-terminal-textSecondary mb-2">
              How much SHFL would you stake?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={10000000}
                step={50}
                value={userStake}
                onChange={(e) => setUserStake(Number(e.target.value))}
                className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
              />
              <div className="w-32 lg:w-40 text-right">
                <div>
                  <span className="text-base lg:text-lg font-bold text-terminal-text">
                    {userStake >= 1000000 
                      ? (userStake / 1000000).toFixed(1) + "M"
                      : userStake >= 1000 
                      ? (userStake / 1000).toFixed(0) + "K"
                      : userStake.toLocaleString()
                    }
                  </span>
                  <span className="text-xs text-terminal-textMuted ml-1">SHFL</span>
                </div>
                <div className="text-xs text-terminal-textMuted">
                  ≈ ${usdValue >= 1000000 
                    ? (usdValue / 1000000).toFixed(1) + "M" 
                    : usdValue >= 1000 
                    ? (usdValue / 1000).toFixed(1) + "K" 
                    : usdValue.toFixed(0)} USD
                </div>
              </div>
            </div>
            <div className="text-xs text-terminal-textMuted mt-1">
              = <span className="text-terminal-accent font-mono">{userTickets.toLocaleString()}</span> tickets (1 per 50 SHFL)
            </div>
          </div>
          
          {/* Results Grid - USDC Rewards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30" whileHover={{ scale: 1.02 }}>
              <div className="text-[10px] text-terminal-textMuted uppercase mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Est. Weekly USDC
              </div>
              <div className="text-lg lg:text-xl font-bold text-green-400 flex items-center gap-1">
                ${animatedYield.toLocaleString()}
              </div>
            </motion.div>
            
            <motion.div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30" whileHover={{ scale: 1.02 }}>
              <div className="text-[10px] text-terminal-textMuted uppercase mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Est. Annual USDC
              </div>
              <div className="text-lg lg:text-xl font-bold text-green-400">
                ${Math.round(annualYield).toLocaleString()}
              </div>
            </motion.div>
          </div>
          
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-[10px] lg:text-xs text-terminal-textSecondary">
                <span className="text-yellow-400 font-medium">These are estimates only.</span> Actual returns depend on 
                weekly NGR, total tickets, and variance.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ticket System - CORRECTED: 50 SHFL per ticket + single tickets
function TicketSystem() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [stakeAmount, setStakeAmount] = useState(5000);
  const [normalTickets, setNormalTickets] = useState(0);
  const [powerplayTickets, setPowerplayTickets] = useState(0);
  
  // 1 ticket per 50 SHFL staked
  const stakedTickets = Math.floor(stakeAmount / 50);
  const totalTickets = stakedTickets + normalTickets + powerplayTickets;
  
  return (
    <div ref={ref} className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Controls */}
        <div className="space-y-5">
          {/* Staking Section */}
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <h4 className="text-sm font-medium text-terminal-text mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-terminal-accent" />
              Stake SHFL Tokens
            </h4>
            <div className="mb-3">
              <input
                type="range"
                min={0}
                max={100000}
                step={50}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
              />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-terminal-textMuted">{stakeAmount.toLocaleString()} SHFL</span>
                <span className="text-terminal-accent font-mono font-bold">= {stakedTickets} tickets</span>
              </div>
            </div>
            <div className="text-[10px] text-terminal-textMuted">
              <span className="text-terminal-accent">1 ticket</span> for every <span className="text-terminal-accent">50 SHFL</span> staked
            </div>
          </div>
          
          {/* Single Ticket Purchase */}
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <h4 className="text-sm font-medium text-terminal-text mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-green-400" />
              Buy Single Tickets
            </h4>
            
            {/* Normal Tickets */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-terminal-text">Normal Tickets</div>
                  <div className="text-[10px] text-terminal-textMuted">$0.25 each</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNormalTickets(Math.max(0, normalTickets - 1))}
                    className="w-7 h-7 rounded bg-terminal-dark text-terminal-textMuted hover:text-terminal-text"
                  >-</button>
                  <span className="w-12 text-center font-mono text-terminal-text">{normalTickets}</span>
                  <button
                    onClick={() => setNormalTickets(normalTickets + 1)}
                    className="w-7 h-7 rounded bg-terminal-dark text-terminal-textMuted hover:text-terminal-text"
                  >+</button>
                </div>
              </div>
            </div>
            
            {/* Powerplay Tickets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-terminal-text flex items-center gap-1">
                    Powerplay Tickets
                    <span className="px-1.5 py-0.5 text-[8px] bg-yellow-500/20 text-yellow-400 rounded">18x BETTER ODDS</span>
                  </div>
                  <div className="text-[10px] text-terminal-textMuted">$4.00 each • Guaranteed powerball</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPowerplayTickets(Math.max(0, powerplayTickets - 1))}
                    className="w-7 h-7 rounded bg-terminal-dark text-terminal-textMuted hover:text-terminal-text"
                  >-</button>
                  <span className="w-12 text-center font-mono text-terminal-text">{powerplayTickets}</span>
                  <button
                    onClick={() => setPowerplayTickets(powerplayTickets + 1)}
                    className="w-7 h-7 rounded bg-terminal-dark text-terminal-textMuted hover:text-terminal-text"
                  >+</button>
                </div>
              </div>
            </div>
            
            {(normalTickets > 0 || powerplayTickets > 0) && (
              <div className="mt-3 pt-3 border-t border-terminal-border text-xs text-terminal-textMuted">
                Cost: <span className="text-terminal-text font-mono">
                  ${((normalTickets * 0.25) + (powerplayTickets * 4)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Ticket Animation */}
        <div className="relative h-[280px] lg:h-[320px] overflow-hidden rounded-xl bg-gradient-to-b from-terminal-accent/5 to-terminal-dark border border-terminal-border">
          {/* Summary at top */}
          <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
            {stakedTickets > 0 && (
              <div className="px-2 py-1 rounded bg-terminal-accent/20 text-[10px] text-terminal-accent">
                {stakedTickets} staked
              </div>
            )}
            {normalTickets > 0 && (
              <div className="px-2 py-1 rounded bg-green-500/20 text-[10px] text-green-400">
                {normalTickets} normal
              </div>
            )}
            {powerplayTickets > 0 && (
              <div className="px-2 py-1 rounded bg-yellow-500/20 text-[10px] text-yellow-400">
                {powerplayTickets} powerplay
              </div>
            )}
          </div>
          
          {/* Falling tickets */}
          <AnimatePresence>
            {isInView && [...Array(Math.min(10, Math.max(3, Math.floor(totalTickets / 5))))].map((_, i) => (
              <motion.div
                key={`${totalTickets}-${i}`}
                className="absolute"
                initial={{ top: -50, left: `${10 + Math.random() * 80}%`, rotate: Math.random() * 360, opacity: 0 }}
                animate={{ top: "100%", rotate: Math.random() * 720, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
              >
                <div className={cn(
                  "w-8 h-11 lg:w-9 lg:h-12 rounded-lg shadow-lg flex items-center justify-center",
                  i % 3 === 2 && powerplayTickets > 0 
                    ? "bg-gradient-to-br from-yellow-500 to-orange-500" 
                    : "bg-gradient-to-br from-terminal-accent to-purple-500"
                )}>
                  <Ticket className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Pool at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-terminal-accent/30 to-transparent flex items-end justify-center pb-3">
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-terminal-accent">
                {totalTickets.toLocaleString()}
              </div>
              <div className="text-[10px] text-terminal-textMuted">Total Tickets</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly Draw Simulator - NOW WITH SHFL/TICKETS/USD INPUT
function DrawSimulator() {
  const shflPrice = useSHFLPrice();
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [inputMode, setInputMode] = useState<"shfl" | "tickets" | "usd">("shfl");
  const [userInput, setUserInput] = useState(50000); // 50K SHFL default
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const totalTickets = 3600000; // ~3.6M total tickets
  
  const getUserTickets = () => {
    switch (inputMode) {
      case "shfl": return Math.floor(userInput / 50);
      case "tickets": return userInput;
      case "usd": return Math.floor((userInput / shflPrice) / 50);
    }
  };
  
  const userTickets = getUserTickets();
  const userShare = userTickets / totalTickets;
  
  const handleModeChange = (newMode: "shfl" | "tickets" | "usd") => {
    const currentTickets = getUserTickets();
    switch (newMode) {
      case "shfl":
        setUserInput(currentTickets * 50);
        break;
      case "tickets":
        setUserInput(currentTickets);
        break;
      case "usd":
        setUserInput(Math.round(currentTickets * 50 * shflPrice));
        break;
    }
    setInputMode(newMode);
    setDropdownOpen(false);
  };
  
  const getInputLabel = () => {
    switch (inputMode) {
      case "shfl": return "SHFL";
      case "tickets": return "Tickets";
      case "usd": return "USD";
    }
  };
  
  const runSimulation = () => {
    setIsSimulating(true);
    setResults([]);
    setCurrentWeek(0);
    setTotalEarned(0);
    
    const weeklyResults: number[] = [];
    let runningTotal = 0;
    
    const interval = setInterval(() => {
      setCurrentWeek(prev => {
        const week = prev + 1;
        
        if (week > 52) {
          clearInterval(interval);
          setIsSimulating(false);
          return prev;
        }
        
        // Random weekly pool between 250K and 550K
        const weeklyPool = 400000 + (Math.random() - 0.5) * 300000;
        const earned = weeklyPool * userShare;
        weeklyResults.push(earned);
        runningTotal += earned;
        
        setResults([...weeklyResults]);
        setTotalEarned(runningTotal);
        
        return week;
      });
    }, 80);
  };
  
  const avgWeekly = results.length > 0 ? totalEarned / results.length : 0;
  const maxWeek = results.length > 0 ? Math.max(...results) : 0;
  const minWeek = results.length > 0 ? Math.min(...results) : 0;
  
  return (
    <div className="py-4 lg:py-8">
      <div className="text-center mb-6">
        {/* SHFL/Tickets/USD Input with Dropdown */}
        <div className="inline-block mb-4 p-4 rounded-xl bg-terminal-card border border-terminal-border">
          <label className="text-sm text-terminal-textSecondary block mb-3">Your Position</label>
          <div className="flex items-center gap-2 justify-center">
            <input
              type="number"
              min={0}
              value={userInput}
              onChange={(e) => setUserInput(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 px-3 py-2 rounded-lg bg-terminal-dark border border-terminal-border text-center font-mono text-terminal-text"
            />
            {/* Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-terminal-accent/10 border border-terminal-accent/30 text-terminal-accent text-sm font-medium hover:bg-terminal-accent/20 transition-colors min-w-[90px] justify-between"
              >
                {getInputLabel()}
                <ChevronDown className={cn("w-4 h-4 transition-transform", dropdownOpen && "rotate-180")} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-terminal-card border border-terminal-border rounded-lg shadow-xl z-20 overflow-hidden">
                  {(["shfl", "tickets", "usd"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleModeChange(mode)}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-terminal-accent/10 transition-colors",
                        inputMode === mode ? "text-terminal-accent bg-terminal-accent/5" : "text-terminal-text"
                      )}
                    >
                      {mode === "shfl" ? "SHFL" : mode === "tickets" ? "Tickets" : "USD"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-terminal-textMuted mt-2">
            = <span className="text-terminal-accent font-mono">{userTickets.toLocaleString()}</span> tickets
          </div>
        </div>
        
        <motion.button
          onClick={runSimulation}
          disabled={isSimulating}
          className={cn(
            "px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 mx-auto text-sm",
            isSimulating
              ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed"
              : "bg-terminal-accent text-white hover:bg-terminal-accent/80"
          )}
          whileHover={!isSimulating ? { scale: 1.05 } : {}}
          whileTap={!isSimulating ? { scale: 0.95 } : {}}
        >
          {isSimulating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <RotateCcw className="w-4 h-4" />
              </motion.div>
              Week {currentWeek}/52
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Simulate 52 Weeks
            </>
          )}
        </motion.button>
      </div>
      
      {/* Results */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Mini bar chart */}
          <div className="h-28 lg:h-36 flex items-end gap-0.5 px-2 overflow-hidden">
            {results.map((value, i) => {
              const height = (value / (maxWeek || 1)) * 100;
              return (
                <motion.div
                  key={i}
                  className={cn(
                    "flex-1 min-w-[3px] rounded-t",
                    value === maxWeek ? "bg-green-400" : value === minWeek ? "bg-red-400" : "bg-terminal-accent"
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                />
              );
            })}
          </div>
          
          {/* Stats - USDC */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <div className="text-[9px] text-terminal-textMuted uppercase flex items-center justify-center gap-1">
                <DollarSign className="w-3 h-3" /> Total USDC
              </div>
              <div className="text-base lg:text-lg font-bold text-green-400">
                ${Math.round(totalEarned).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border text-center">
              <div className="text-[9px] text-terminal-textMuted uppercase">Avg/Week</div>
              <div className="text-base lg:text-lg font-bold text-terminal-text">
                ${Math.round(avgWeekly).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <div className="text-[9px] text-terminal-textMuted uppercase">Best Week</div>
              <div className="text-base lg:text-lg font-bold text-green-400">
                ${Math.round(maxWeek).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-[9px] text-terminal-textMuted uppercase">Worst Week</div>
              <div className="text-base lg:text-lg font-bold text-red-400">
                ${Math.round(minWeek).toLocaleString()}
              </div>
            </div>
          </div>
          
          {!isSimulating && (
            <div className="text-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-terminal-textSecondary">
                <span className="text-yellow-400">⚠️</span> These are <span className="text-yellow-400 font-medium">estimates only</span>. 
                Actual results vary based on pool size and total tickets.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Step by Step Guide - CORRECTED
function StepByStepGuide({ nextDrawTimestamp }: { nextDrawTimestamp?: number }) {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [localDrawTime, setLocalDrawTime] = useState("");
  const [countdown, setCountdown] = useState("");
  
  useEffect(() => {
    const now = new Date();
    const nextDraw = new Date();
    nextDraw.setUTCHours(7, 0, 0, 0);
    const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7;
    if (daysUntilFriday === 0 && now.getUTCHours() >= 7) {
      nextDraw.setDate(now.getDate() + 7);
    } else {
      nextDraw.setDate(now.getDate() + daysUntilFriday);
    }
    
    setLocalDrawTime(nextDraw.toLocaleString(undefined, {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }));
  }, []);
  
  useEffect(() => {
    const targetTime = nextDrawTimestamp || (() => {
      const now = new Date();
      const nextDraw = new Date();
      nextDraw.setUTCHours(7, 0, 0, 0);
      const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7;
      if (daysUntilFriday === 0 && now.getUTCHours() >= 7) {
        nextDraw.setDate(now.getDate() + 7);
      } else {
        nextDraw.setDate(now.getDate() + daysUntilFriday);
      }
      return nextDraw.getTime();
    })();
    
    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetTime - now;
      if (diff <= 0) { setCountdown("DRAWING NOW!"); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${days}d ${hours}h ${minutes}m`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextDrawTimestamp]);
  
  const copyContract = () => {
    navigator.clipboard.writeText(SHFL_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const steps = [
    {
      icon: Users,
      title: "Create Account",
      description: "Sign up on Shuffle.com",
      details: "Create an account like any other website with email and password.",
      color: "blue",
      link: "https://shuffle.com",
      linkText: "Go to Shuffle.com",
    },
    {
      icon: Coins,
      title: "Get SHFL Tokens",
      description: "Deposit & convert, or buy on a DEX",
      details: (
        <div className="space-y-3">
          <p><strong>Option 1:</strong> Deposit any crypto on Shuffle and convert to SHFL</p>
          <p><strong>Option 2:</strong> Buy on a DEX like Cowswap</p>
          <div className="p-2 bg-terminal-dark rounded-lg">
            <div className="text-[10px] text-terminal-textMuted mb-1">Contract Address</div>
            <div className="flex items-center gap-2">
              <code className="text-[9px] text-terminal-accent font-mono flex-1 truncate">{SHFL_CONTRACT}</code>
              <button onClick={copyContract} className="p-1 hover:bg-terminal-border rounded">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      ),
      color: "yellow",
      link: "https://swap.cow.fi/#/1/swap/ETH/SHFL",
      linkText: "Open Cowswap",
    },
    {
      icon: Ticket,
      title: "Stake Your SHFL",
      description: "Go to Token Dashboard and stake",
      details: (
        <div className="space-y-2">
          <p>Head to <strong>shuffle.com/token</strong> and click Stake</p>
          <p>You get <span className="text-terminal-accent font-semibold">1 ticket for every 50 SHFL</span> staked</p>
          <p className="text-[10px] text-terminal-textMuted">
            <strong>Unstaking:</strong> You can unstake anytime. Tokens return after the next draw (and you don&apos;t receive rewards for that draw).
          </p>
        </div>
      ),
      color: "purple",
      link: "https://shuffle.com/token",
      linkText: "Open Token Dashboard",
    },
    {
      icon: Calendar,
      title: "Wait for the Draw",
      description: "Draws every Friday at 7AM UTC",
      details: (
        <div className="space-y-3">
          <div className="p-3 bg-terminal-accent/10 rounded-lg border border-terminal-accent/30">
            <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Your Local Time</div>
            <div className="text-sm font-semibold text-terminal-accent">{localDrawTime}</div>
          </div>
          <div className="p-3 bg-terminal-dark rounded-lg">
            <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Next Draw In</div>
            <div className="text-lg font-bold text-terminal-text">{countdown}</div>
          </div>
        </div>
      ),
      color: "green",
    },
    {
      icon: TrendingUp,
      title: "Collect & Compound",
      description: "Convert USDC to SHFL to grow your stake",
      details: (
        <div className="space-y-2">
          <p>Weekly USDC rewards are distributed after each draw</p>
          <p className="text-terminal-accent font-medium">💡 Convert rewards to SHFL and stake more to compound!</p>
        </div>
      ),
      color: "terminal-accent",
    },
  ];
  
  const colorClasses: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    green: "text-green-400 bg-green-500/10 border-green-500/30",
    "terminal-accent": "text-terminal-accent bg-terminal-accent/10 border-terminal-accent/30",
  };
  
  return (
    <div className="py-4 lg:py-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2 px-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            <motion.button
              onClick={() => setActiveStep(i)}
              className={cn(
                "w-8 h-8 lg:w-9 lg:h-9 rounded-full border-2 flex items-center justify-center transition-all",
                i === activeStep
                  ? "bg-terminal-accent border-terminal-accent text-white scale-110"
                  : i < activeStep
                  ? "bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                  : "bg-terminal-card border-terminal-border text-terminal-textMuted"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {i < activeStep ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </motion.button>
            {i < steps.length - 1 && (
              <div className={cn("w-6 sm:w-8 lg:w-14 h-1 mx-1 rounded", i < activeStep ? "bg-terminal-accent" : "bg-terminal-border")} />
            )}
          </div>
        ))}
      </div>
      
      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className={cn("inline-flex p-3 rounded-2xl border mb-4", colorClasses[steps[activeStep].color])}>
            {(() => { const Icon = steps[activeStep].icon; return <Icon className="w-8 h-8 lg:w-10 lg:h-10" />; })()}
          </div>
          
          <h3 className="text-lg lg:text-xl font-bold text-terminal-text mb-2">{steps[activeStep].title}</h3>
          <p className="text-sm lg:text-base text-terminal-textSecondary mb-4">{steps[activeStep].description}</p>
          <div className="text-xs lg:text-sm text-terminal-textMuted max-w-md mx-auto text-left">
            {typeof steps[activeStep].details === "string" ? <p>{steps[activeStep].details}</p> : steps[activeStep].details}
          </div>
          
          {steps[activeStep].link && (
            <a href={steps[activeStep].link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-terminal-accent/10 border border-terminal-accent/30 text-terminal-accent hover:bg-terminal-accent/20 text-sm">
              {steps[activeStep].linkText}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Navigation */}
      <div className="flex justify-center gap-3 mt-6">
        <motion.button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className={cn("px-3 py-2 rounded-lg flex items-center gap-2 text-sm",
            activeStep === 0 ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed" : "bg-terminal-card border border-terminal-border text-terminal-text hover:border-terminal-accent"
          )}
          whileHover={activeStep > 0 ? { x: -5 } : {}}
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <motion.button
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          className={cn("px-3 py-2 rounded-lg flex items-center gap-2 text-sm",
            activeStep === steps.length - 1 ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed" : "bg-terminal-accent text-white hover:bg-terminal-accent/80"
          )}
          whileHover={activeStep < steps.length - 1 ? { x: 5 } : {}}
        >
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

// Compounding Calculator - VALUE WITH AND WITHOUT REINVESTING YIELD
function CompoundingCalculator() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shflPrice = useSHFLPrice();
  const [initialStake, setInitialStake] = useState(50000);
  const [weeklyYieldPct, setWeeklyYieldPct] = useState(0.5);
  const [weeks, setWeeks] = useState(52);
  
  const results = useMemo(() => {
    const initialValue = initialStake * shflPrice;
    const weeklyYield = weeklyYieldPct / 100;
    
    // Track both scenarios
    let reinvestedTokens = initialStake; // Start with initial tokens
    let holdOnlyTokens = initialStake; // Never changes (just hold)
    let collectedYield = 0; // USDC collected but not reinvested
    
    const chartData: { week: number; reinvested: number; holdOnly: number; holdPlusYield: number }[] = [];
    
    for (let w = 0; w <= weeks; w++) {
      // Value of reinvested strategy (more tokens, same price)
      const reinvestedValue = reinvestedTokens * shflPrice;
      
      // Value of just holding (same tokens, same price) - no change in value without price movement
      const holdOnlyValue = holdOnlyTokens * shflPrice;
      
      // Value of hold + collecting yield (not reinvesting)
      const holdPlusYieldValue = holdOnlyValue + collectedYield;
      
      chartData.push({ 
        week: w, 
        reinvested: reinvestedValue, 
        holdOnly: holdOnlyValue,
        holdPlusYield: holdPlusYieldValue
      });
      
      // Calculate this week's yield
      const weeklyUSDCReinvested = reinvestedTokens * shflPrice * weeklyYield;
      const weeklyUSDCHold = holdOnlyTokens * shflPrice * weeklyYield;
      
      // Reinvest: convert USDC to more tokens
      reinvestedTokens += weeklyUSDCReinvested / shflPrice;
      
      // Hold + Yield: just collect USDC
      collectedYield += weeklyUSDCHold;
    }
    
    const finalReinvested = chartData[weeks]?.reinvested || 0;
    const finalHoldPlusYield = chartData[weeks]?.holdPlusYield || 0;
    const finalHoldOnly = chartData[weeks]?.holdOnly || 0;
    const compoundingBonus = finalReinvested - finalHoldPlusYield;
    const compoundingBonusPct = finalHoldPlusYield > 0 ? (compoundingBonus / finalHoldPlusYield) * 100 : 0;
    const totalYieldEarned = collectedYield;
    const finalTokenCount = reinvestedTokens;
    
    return { 
      data: chartData, 
      finalReinvested, 
      finalHoldPlusYield, 
      finalHoldOnly,
      compoundingBonus, 
      compoundingBonusPct,
      totalYieldEarned,
      finalTokenCount
    };
  }, [initialStake, weeklyYieldPct, weeks, shflPrice]);
  
  const maxValue = Math.max(...results.data.map(d => Math.max(d.reinvested, d.holdPlusYield)));
  
  return (
    <div ref={ref} className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Initial Stake</span>
              <div className="text-right">
                <span className="font-mono text-terminal-text">{initialStake.toLocaleString()} SHFL</span>
                <span className="text-xs text-terminal-textMuted ml-1">(${(initialStake * shflPrice).toLocaleString()})</span>
              </div>
            </div>
            <input type="range" min={10000} max={500000} step={5000} value={initialStake}
              onChange={(e) => setInitialStake(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Est. Weekly Yield %</span>
              <span className="font-mono text-terminal-accent">{weeklyYieldPct.toFixed(2)}%</span>
            </div>
            <input type="range" min={0.1} max={2} step={0.05} value={weeklyYieldPct}
              onChange={(e) => setWeeklyYieldPct(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Time Period</span>
              <span className="font-mono text-terminal-text">{weeks} weeks ({(weeks / 52).toFixed(1)} yrs)</span>
            </div>
            <input type="range" min={12} max={156} step={4} value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border">
              <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Hold + Collect Yield</div>
              <div className="text-lg font-bold text-terminal-textSecondary">
                ${results.finalHoldPlusYield.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-terminal-textMuted">
                {initialStake.toLocaleString()} SHFL + ${results.totalYieldEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
              </div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Reinvest Yield</div>
              <div className="text-lg font-bold text-green-400">
                ${results.finalReinvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-green-400/70">
                {Math.round(results.finalTokenCount).toLocaleString()} SHFL total
              </div>
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-terminal-textSecondary">Reinvesting Bonus</span>
              <div className="text-right">
                <span className="text-base font-bold text-terminal-accent">
                  +${results.compoundingBonus.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-terminal-accent ml-1">(+{results.compoundingBonusPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-terminal-textMuted p-2 rounded bg-terminal-dark">
            <span className="text-yellow-400">⚠️</span> Assumes constant SHFL price @ ${shflPrice}. 
            Actual results depend on price changes and yield variance.
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-[220px] lg:h-[280px] p-4 rounded-xl bg-terminal-card border border-terminal-border">
          <div className="text-xs text-terminal-textMuted mb-2">Investment Value Over Time</div>
          <div className="flex items-center gap-4 mb-3 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /><span className="text-terminal-textSecondary">Reinvest Yield</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-terminal-textMuted" /><span className="text-terminal-textSecondary">Hold + Collect</span></div>
          </div>
          
          <div className="relative h-[calc(100%-50px)]">
            {/* Use viewBox for proper SVG scaling */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Hold + Yield line */}
              <motion.path
                d={results.data.map((d, i) => {
                  const x = (i / weeks) * 100;
                  const y = 100 - ((d.holdPlusYield - results.data[0].holdPlusYield) / (maxValue - results.data[0].holdPlusYield)) * 90 - 5;
                  return `${i === 0 ? "M" : "L"} ${x} ${Math.max(5, Math.min(95, y))}`;
                }).join(" ")}
                fill="none" stroke="#6b7280" strokeWidth="0.8"
                initial={{ pathLength: 0 }} animate={isInView ? { pathLength: 1 } : {}} transition={{ duration: 2 }}
              />
              {/* Reinvested line */}
              <motion.path
                d={results.data.map((d, i) => {
                  const x = (i / weeks) * 100;
                  const y = 100 - ((d.reinvested - results.data[0].reinvested) / (maxValue - results.data[0].reinvested)) * 90 - 5;
                  return `${i === 0 ? "M" : "L"} ${x} ${Math.max(5, Math.min(95, y))}`;
                }).join(" ")}
                fill="none" stroke="#22c55e" strokeWidth="1.2"
                initial={{ pathLength: 0 }} animate={isInView ? { pathLength: 1 } : {}} transition={{ duration: 2, delay: 0.5 }}
              />
            </svg>
            
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 text-[8px] text-terminal-textMuted">
              ${Math.round(maxValue).toLocaleString()}
            </div>
            <div className="absolute left-0 bottom-0 text-[8px] text-terminal-textMuted">
              ${Math.round(initialStake * shflPrice).toLocaleString()}
            </div>
            {/* X-axis labels */}
            <div className="absolute right-0 bottom-0 text-[8px] text-terminal-textMuted">
              {weeks}w
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main LearnPage Component
export default function LearnPage({ onBack, nextDrawTimestamp, shflPrice: propPrice }: LearnPageProps) {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [shflPrice, setShflPrice] = useState(propPrice || 0.05);
  
  // Fetch SHFL price dynamically if not provided
  useEffect(() => {
    if (propPrice) {
      setShflPrice(propPrice);
      return;
    }
    
    async function fetchPrice() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=shuffle-2&vs_currencies=usd");
        const data = await res.json();
        if (data["shuffle-2"]?.usd) {
          setShflPrice(data["shuffle-2"].usd);
        }
      } catch (error) {
        console.error("Failed to fetch SHFL price:", error);
      }
    }
    
    fetchPrice();
  }, [propPrice]);
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/");
    }
  };
  
  return (
    <SHFLPriceContext.Provider value={shflPrice}>
    <div className="min-h-screen bg-transparent text-terminal-text relative z-10">
      {/* Progress bar at very top */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-terminal-accent z-[60] origin-left" style={{ scaleX }} />
      
      {/* Back Button - Floating */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
        <motion.button 
          onClick={handleBack} 
          className="flex items-center gap-2 text-terminal-textSecondary hover:text-terminal-text text-sm px-3 py-2 rounded-lg bg-terminal-card/50 border border-terminal-border hover:border-terminal-accent transition-all" 
          whileHover={{ x: -3 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </motion.button>
      </div>
      
      {/* Hero */}
      <section className="relative overflow-hidden py-6 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 mb-3">
              <Sparkles className="w-3 h-3 text-terminal-accent" />
              <span className="text-xs text-terminal-accent">Interactive Guide</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
              How <span className="text-terminal-accent">SHFL Yield</span> Works
            </h1>
            <p className="text-sm lg:text-base text-terminal-textSecondary max-w-xl mx-auto">
              Stake SHFL tokens once, earn tickets that enter every weekly lottery forever.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 pb-32 lg:pb-20 space-y-12 lg:space-y-16">
        {/* The Concept */}
        <AnimatedSection>
          <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold text-terminal-text">Perpetual Lottery Tickets</h2>
              <p className="text-xs text-terminal-textSecondary mt-1">The core concept behind SHFL yield</p>
            </div>
            <LotteryTicketConcept />
          </div>
        </AnimatedSection>
        
        {/* Section 1: Revenue Flow */}
        <AnimatedSection>
          <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold text-terminal-text">Where Does the Money Come From?</h2>
              <p className="text-xs text-terminal-textSecondary mt-1">Follow the casino revenue to your wallet</p>
            </div>
            <RevenueFlowDiagram />
          </div>
        </AnimatedSection>
        
        {/* Section 2: Your Share */}
        <AnimatedSection>
          <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold text-terminal-text">Your Share of the Pool</h2>
              <p className="text-xs text-terminal-textSecondary mt-1">Calculate estimated returns based on stake</p>
            </div>
            <StakeSharePie />
          </div>
        </AnimatedSection>
        
        {/* Section 3: Draw Simulator */}
        <AnimatedSection>
          <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold text-terminal-text">52-Week Simulator</h2>
              <p className="text-xs text-terminal-textSecondary mt-1">See estimated variance over a year</p>
            </div>
            <DrawSimulator />
          </div>
        </AnimatedSection>
        
        {/* Section 5: Step by Step */}
        <AnimatedSection>
          <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold text-terminal-text">How to Participate</h2>
              <p className="text-xs text-terminal-textSecondary mt-1">From signup to weekly yield</p>
            </div>
            <StepByStepGuide nextDrawTimestamp={nextDrawTimestamp} />
          </div>
        </AnimatedSection>
        
        {/* Section 6: Compounding */}
        <AnimatedSection>
          <div className="p-4 lg:p-6 rounded-2xl bg-terminal-card border border-terminal-border">
            <div className="text-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold text-terminal-text">The Power of Compounding</h2>
              <p className="text-xs text-terminal-textSecondary mt-1">Reinvest USDC rewards to grow faster</p>
            </div>
            <CompoundingCalculator />
          </div>
        </AnimatedSection>
        
        {/* CTA */}
        <AnimatedSection>
          <div className="text-center py-6 px-4 lg:px-6 rounded-2xl bg-gradient-to-br from-terminal-accent/10 to-purple-500/5 border border-terminal-accent/20">
            <Award className="w-10 h-10 text-terminal-accent mx-auto mb-3" />
            <h2 className="text-lg lg:text-xl font-bold text-terminal-text mb-2">Ready to Start?</h2>
            <p className="text-xs text-terminal-textSecondary mb-4 max-w-sm mx-auto">
              Head back to the dashboard or go stake on Shuffle.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <motion.button onClick={handleBack} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-lg bg-terminal-accent text-white font-medium text-sm flex items-center gap-2 justify-center">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </motion.button>
              <a href="https://shuffle.com/token" target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-terminal-card border border-terminal-border text-terminal-text font-medium text-sm flex items-center gap-2 justify-center hover:border-terminal-accent transition-colors">
                Stake Now <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </AnimatedSection>
        
        {/* Disclaimer */}
        <div className="text-center text-[9px] text-terminal-textMuted max-w-xl mx-auto px-4">
          <p>
            <strong>Disclaimer:</strong> Educational purposes only. All calculations are estimates and may be inaccurate. 
            Past performance does not guarantee future results. DYOR. Not financial advice.
          </p>
        </div>
      </div>
    </div>
    </SHFLPriceContext.Provider>
  );
}
