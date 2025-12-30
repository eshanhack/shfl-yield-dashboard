"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Coins,
  Ticket,
  TrendingUp,
  Calendar,
  Wallet,
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
  RefreshCw,
  ArrowUpRight,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LearnPageProps {
  onBack: () => void;
  nextDrawTimestamp?: number;
}

// SHFL Contract Address
const SHFL_CONTRACT = "0x8881562783028F5c1BCB985d2283D5E170D88888";

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

// Floating particles background
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-terminal-accent/30 rounded-full"
          initial={{
            x: Math.random() * 100 + "%",
            y: "100%",
            opacity: 0,
          }}
          animate={{
            y: "-100%",
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
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

// Revenue Flow Animation (Sankey-style)
function RevenueFlowDiagram() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [bettingVolume, setBettingVolume] = useState(1000000);
  const [animationStep, setAnimationStep] = useState(0);
  
  const houseEdge = 0.03;
  const ggrToNgr = 0.5;
  const ngrToLottery = 0.15;
  
  const ggr = bettingVolume * houseEdge;
  const ngr = ggr * ggrToNgr;
  const lotteryPool = ngr * ngrToLottery;
  
  useEffect(() => {
    if (!isInView) return;
    
    const interval = setInterval(() => {
      setAnimationStep(s => (s + 1) % 5);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isInView]);
  
  const formatMoney = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };
  
  return (
    <div ref={ref} className="relative py-4 lg:py-8">
      {/* Betting Volume Slider */}
      <div className="mb-6 lg:mb-8 text-center">
        <label className="block text-sm text-terminal-textSecondary mb-2">
          Simulate Weekly Betting Volume
        </label>
        <input
          type="range"
          min={100000}
          max={10000000}
          step={100000}
          value={bettingVolume}
          onChange={(e) => setBettingVolume(Number(e.target.value))}
          className="w-full max-w-md h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
        />
        <div className="text-xl lg:text-2xl font-bold text-terminal-accent mt-2">
          {formatMoney(bettingVolume)}
        </div>
      </div>
      
      {/* Flow Diagram - Vertical on mobile, Horizontal on desktop */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-6">
        {/* Players Bet */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[140px]",
            animationStep >= 0 
              ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 0 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400 mx-auto mb-1 lg:mb-2" />
          <div className="text-center">
            <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Players Bet</div>
            <div className="text-base lg:text-lg font-bold text-blue-400">{formatMoney(bettingVolume)}</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div
          className="text-terminal-textMuted"
          animate={animationStep === 1 ? { y: [0, 5, 0], opacity: [0.5, 1, 0.5] } : {}}
        >
          <ArrowDown className="w-5 h-5 lg:hidden" />
          <ArrowRight className="w-5 h-5 hidden lg:block" />
        </motion.div>
        
        {/* GGR */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[140px]",
            animationStep >= 1 
              ? "bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 1 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Coins className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400 mx-auto mb-1 lg:mb-2" />
          <div className="text-center">
            <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">GGR (~3%)</div>
            <div className="text-base lg:text-lg font-bold text-yellow-400">{formatMoney(ggr)}</div>
            <div className="text-[9px] lg:text-[10px] text-terminal-textMuted">House Edge</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div
          className="text-terminal-textMuted"
          animate={animationStep === 2 ? { y: [0, 5, 0], opacity: [0.5, 1, 0.5] } : {}}
        >
          <ArrowDown className="w-5 h-5 lg:hidden" />
          <ArrowRight className="w-5 h-5 hidden lg:block" />
        </motion.div>
        
        {/* NGR */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[140px]",
            animationStep >= 2 
              ? "bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 2 ? { scale: [1, 1.05, 1] } : {}}
        >
          <BarChart3 className="w-6 h-6 lg:w-8 lg:h-8 text-orange-400 mx-auto mb-1 lg:mb-2" />
          <div className="text-center">
            <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">NGR (50%)</div>
            <div className="text-base lg:text-lg font-bold text-orange-400">{formatMoney(ngr)}</div>
            <div className="text-[9px] lg:text-[10px] text-terminal-textMuted">Net Revenue</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div
          className="text-terminal-textMuted"
          animate={animationStep === 3 ? { y: [0, 5, 0], opacity: [0.5, 1, 0.5] } : {}}
        >
          <ArrowDown className="w-5 h-5 lg:hidden" />
          <ArrowRight className="w-5 h-5 hidden lg:block" />
        </motion.div>
        
        {/* Lottery Pool */}
        <motion.div
          className={cn(
            "relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-500 w-full lg:w-auto lg:min-w-[140px]",
            animationStep >= 3 
              ? "bg-terminal-accent/20 border-terminal-accent shadow-lg shadow-terminal-accent/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep >= 3 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Gift className="w-6 h-6 lg:w-8 lg:h-8 text-terminal-accent mx-auto mb-1 lg:mb-2" />
          <div className="text-center">
            <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Lottery (15%)</div>
            <div className="text-base lg:text-lg font-bold text-terminal-accent">{formatMoney(lotteryPool)}</div>
            <div className="text-[9px] lg:text-[10px] text-terminal-accent">Your Yield 🎯</div>
          </div>
        </motion.div>
      </div>
      
      {/* Explanation */}
      <motion.div
        className="mt-6 lg:mt-8 text-center max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-terminal-textSecondary text-xs lg:text-sm">
          <span className="text-terminal-accent font-semibold">15%</span> of Shuffle&apos;s net gaming revenue 
          flows directly to SHFL stakers every week. The more people gamble on Shuffle, 
          the bigger your yield!
        </p>
      </motion.div>
    </div>
  );
}

// Interactive Pie Chart showing stake share
function StakeSharePie() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [userStake, setUserStake] = useState(50000);
  const totalStaked = 180000000;
  const weeklyPool = 400000;
  
  const userShare = userStake / totalStaked;
  const weeklyYield = weeklyPool * userShare;
  const annualYield = weeklyYield * 52;
  
  const animatedYield = useAnimatedCounter(Math.round(weeklyYield), 800, isInView);
  
  return (
    <div ref={ref} className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        {/* Pie Visualization */}
        <div className="relative flex justify-center order-2 lg:order-1">
          <div className="relative w-48 h-48 lg:w-64 lg:h-64">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                className="text-terminal-border"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                className="text-terminal-accent"
                strokeDasharray={`${userShare * 251.2} 251.2`}
                initial={{ strokeDashoffset: 251.2 }}
                animate={isInView ? { strokeDashoffset: 0 } : {}}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl lg:text-3xl font-bold text-terminal-accent">
                {(userShare * 100).toFixed(4)}%
              </div>
              <div className="text-[10px] lg:text-xs text-terminal-textMuted">Your Share</div>
            </div>
          </div>
          
          {/* Pulse effect */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full border-2 border-terminal-accent/30" />
          </motion.div>
        </div>
        
        {/* Controls & Results */}
        <div className="space-y-4 lg:space-y-6 order-1 lg:order-2">
          <div>
            <label className="block text-sm text-terminal-textSecondary mb-2">
              How much SHFL would you stake?
            </label>
            <div className="flex items-center gap-3 lg:gap-4">
              <input
                type="range"
                min={1000}
                max={500000}
                step={1000}
                value={userStake}
                onChange={(e) => setUserStake(Number(e.target.value))}
                className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
              />
              <div className="w-28 lg:w-32 text-right">
                <span className="text-lg lg:text-xl font-bold text-terminal-text">
                  {userStake.toLocaleString()}
                </span>
                <span className="text-xs lg:text-sm text-terminal-textMuted ml-1">SHFL</span>
              </div>
            </div>
          </div>
          
          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <motion.div
              className="p-3 lg:p-4 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Weekly Yield</div>
              <div className="text-xl lg:text-2xl font-bold text-terminal-accent">
                ${animatedYield.toLocaleString()}
              </div>
            </motion.div>
            
            <motion.div
              className="p-3 lg:p-4 rounded-xl bg-green-500/10 border border-green-500/30"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Annual Yield</div>
              <div className="text-xl lg:text-2xl font-bold text-green-400">
                ${Math.round(annualYield).toLocaleString()}
              </div>
            </motion.div>
          </div>
          
          <div className="p-3 lg:p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-400">Important</span>
            </div>
            <p className="text-[10px] lg:text-xs text-terminal-textSecondary">
              Your slice depends on total staked SHFL. More stakers = smaller individual shares, 
              but also signals a healthy protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ticket Visualization (No Multipliers - Simplified)
function TicketVisualization() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [stakeAmount, setStakeAmount] = useState(10000);
  
  // 1 SHFL = 1 Ticket (no multipliers)
  const totalTickets = stakeAmount;
  
  return (
    <div ref={ref} className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Controls */}
        <div className="space-y-4 lg:space-y-6">
          <div>
            <label className="block text-sm text-terminal-textSecondary mb-2">
              SHFL to Stake
            </label>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
            />
            <div className="text-lg lg:text-xl font-bold text-terminal-text mt-2">
              {stakeAmount.toLocaleString()} SHFL
            </div>
          </div>
          
          {/* Simple Conversion */}
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-terminal-textSecondary">Conversion Rate</span>
              <span className="font-mono text-terminal-accent font-bold">1:1</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 bg-terminal-dark rounded-lg text-center">
                <div className="text-xs text-terminal-textMuted mb-1">You Stake</div>
                <div className="text-lg font-bold text-terminal-text">{stakeAmount.toLocaleString()}</div>
                <div className="text-[10px] text-terminal-textMuted">SHFL</div>
              </div>
              <ArrowRight className="w-5 h-5 text-terminal-accent" />
              <div className="flex-1 p-3 bg-terminal-accent/10 rounded-lg text-center border border-terminal-accent/30">
                <div className="text-xs text-terminal-textMuted mb-1">You Get</div>
                <div className="text-lg font-bold text-terminal-accent">{totalTickets.toLocaleString()}</div>
                <div className="text-[10px] text-terminal-accent">Tickets</div>
              </div>
            </div>
          </div>
          
          {/* Unstaking Info */}
          <div className="p-3 lg:p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-yellow-400 mb-1">About Unstaking</div>
                <p className="text-[10px] lg:text-xs text-terminal-textSecondary">
                  You can unstake anytime, but your tokens will be available after the next draw. 
                  You won&apos;t receive rewards for the draw in which you unstake.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ticket Animation */}
        <div className="relative h-[250px] lg:h-[300px] overflow-hidden rounded-xl bg-gradient-to-b from-terminal-accent/5 to-terminal-dark border border-terminal-border">
          {/* Falling tickets */}
          <AnimatePresence>
            {isInView && [...Array(Math.min(12, Math.floor(totalTickets / 2000)))].map((_, i) => (
              <motion.div
                key={`${totalTickets}-${i}`}
                className="absolute"
                initial={{
                  top: -50,
                  left: `${10 + Math.random() * 80}%`,
                  rotate: Math.random() * 360,
                  opacity: 0,
                }}
                animate={{
                  top: "100%",
                  rotate: Math.random() * 720,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "linear",
                }}
              >
                <div className="w-8 h-12 lg:w-10 lg:h-14 bg-gradient-to-br from-terminal-accent to-purple-500 rounded-lg shadow-lg flex items-center justify-center">
                  <Ticket className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Pool at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 lg:h-20 bg-gradient-to-t from-terminal-accent/30 to-transparent flex items-end justify-center pb-3 lg:pb-4">
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-bold text-terminal-accent">
                {totalTickets.toLocaleString()}
              </div>
              <div className="text-[10px] lg:text-xs text-terminal-textMuted">Tickets in Pool</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly Draw Simulator (Mini-Game)
function DrawSimulator() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  
  const userTickets = 50000;
  const totalTickets = 180000000;
  const userShare = userTickets / totalTickets;
  
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
        
        // Random weekly NGR between 200K and 600K
        const weeklyNGR = 300000 + (Math.random() - 0.5) * 400000;
        const earned = weeklyNGR * userShare;
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
      <div className="text-center mb-6 lg:mb-8">
        <p className="text-terminal-textSecondary text-sm mb-4">
          See how yield varies week to week with a 52-week simulation
        </p>
        <motion.button
          onClick={runSimulation}
          disabled={isSimulating}
          className={cn(
            "px-5 lg:px-6 py-2.5 lg:py-3 rounded-xl font-medium flex items-center gap-2 mx-auto text-sm lg:text-base",
            isSimulating
              ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed"
              : "bg-terminal-accent text-white hover:bg-terminal-accent/80"
          )}
          whileHover={!isSimulating ? { scale: 1.05 } : {}}
          whileTap={!isSimulating ? { scale: 0.95 } : {}}
        >
          {isSimulating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RotateCcw className="w-4 h-4 lg:w-5 lg:h-5" />
              </motion.div>
              Week {currentWeek}/52
            </>
          ) : (
            <>
              <Play className="w-4 h-4 lg:w-5 lg:h-5" />
              Simulate 52 Weeks
            </>
          )}
        </motion.button>
      </div>
      
      {/* Results Chart */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 lg:space-y-6"
        >
          {/* Mini bar chart */}
          <div className="h-32 lg:h-40 flex items-end gap-0.5 px-2 lg:px-4 overflow-hidden">
            {results.map((value, i) => {
              const height = (value / (maxWeek || 1)) * 100;
              return (
                <motion.div
                  key={i}
                  className={cn(
                    "flex-1 min-w-[3px] lg:min-w-[4px] rounded-t",
                    value === maxWeek ? "bg-green-400" :
                    value === minWeek ? "bg-red-400" :
                    "bg-terminal-accent"
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                />
              );
            })}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            <div className="p-3 lg:p-4 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30 text-center">
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Total Earned</div>
              <div className="text-lg lg:text-xl font-bold text-terminal-accent">
                ${Math.round(totalEarned).toLocaleString()}
              </div>
            </div>
            <div className="p-3 lg:p-4 rounded-xl bg-terminal-card border border-terminal-border text-center">
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Avg/Week</div>
              <div className="text-lg lg:text-xl font-bold text-terminal-text">
                ${Math.round(avgWeekly).toLocaleString()}
              </div>
            </div>
            <div className="p-3 lg:p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Best Week</div>
              <div className="text-lg lg:text-xl font-bold text-green-400">
                ${Math.round(maxWeek).toLocaleString()}
              </div>
            </div>
            <div className="p-3 lg:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Worst Week</div>
              <div className="text-lg lg:text-xl font-bold text-red-400">
                ${Math.round(minWeek).toLocaleString()}
              </div>
            </div>
          </div>
          
          {!isSimulating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-3 lg:p-4 rounded-xl bg-terminal-card border border-terminal-border"
            >
              <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-terminal-accent mx-auto mb-2" />
              <p className="text-xs lg:text-sm text-terminal-textSecondary">
                Variance is normal! Your <span className="text-terminal-accent font-semibold">expected value</span> stays 
                the same even when individual weeks vary.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Step by Step Guide - UPDATED with correct info
function StepByStepGuide({ nextDrawTimestamp }: { nextDrawTimestamp?: number }) {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [localDrawTime, setLocalDrawTime] = useState("");
  const [countdown, setCountdown] = useState("");
  
  // Calculate local draw time (Friday 7AM UTC)
  useEffect(() => {
    const utcHour = 7;
    const utcDay = 5; // Friday
    
    const now = new Date();
    const nextDraw = new Date();
    nextDraw.setUTCHours(utcHour, 0, 0, 0);
    
    // Find next Friday
    const daysUntilFriday = (utcDay - now.getUTCDay() + 7) % 7;
    if (daysUntilFriday === 0 && now.getUTCHours() >= utcHour) {
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
  
  // Update countdown
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
      
      if (diff <= 0) {
        setCountdown("DRAWING NOW!");
        return;
      }
      
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
      title: "Sign Up",
      description: "Create an account on Shuffle.com",
      details: "Just a regular signup - no Web3 wallet needed. Email and password like any other website.",
      color: "blue",
      link: "https://shuffle.com",
      linkText: "Go to Shuffle.com",
    },
    {
      icon: Coins,
      title: "Get SHFL Tokens",
      description: "Deposit crypto and convert, or buy on a DEX",
      details: (
        <div className="space-y-3">
          <p>Option 1: Deposit almost any cryptocurrency on Shuffle and convert to SHFL</p>
          <p>Option 2: Buy on a DEX like Cowswap (recommended)</p>
          <div className="p-2 lg:p-3 bg-terminal-dark rounded-lg">
            <div className="text-[10px] text-terminal-textMuted mb-1">SHFL Contract Address (Ethereum)</div>
            <div className="flex items-center gap-2">
              <code className="text-[9px] lg:text-xs text-terminal-accent font-mono flex-1 truncate">
                {SHFL_CONTRACT}
              </code>
              <button
                onClick={copyContract}
                className="p-1.5 hover:bg-terminal-border rounded transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
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
      description: "Head to the Token Dashboard to stake",
      details: (
        <div className="space-y-2">
          <p>Go to shuffle.com/token and click &quot;Stake&quot;</p>
          <p>Enter the amount you want to stake and confirm</p>
          <p className="text-yellow-400/80">Your staked SHFL converts to lottery tickets at a 1:1 ratio</p>
        </div>
      ),
      color: "purple",
      link: "https://shuffle.com/token",
      linkText: "Open Token Dashboard",
    },
    {
      icon: Calendar,
      title: "Wait for the Draw",
      description: "Draws happen every Friday at 7AM UTC",
      details: (
        <div className="space-y-3">
          <div className="p-3 bg-terminal-accent/10 rounded-lg border border-terminal-accent/30">
            <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Your Local Time</div>
            <div className="text-sm lg:text-base font-semibold text-terminal-accent">{localDrawTime}</div>
          </div>
          <div className="p-3 bg-terminal-dark rounded-lg">
            <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Next Draw In</div>
            <div className="text-lg lg:text-xl font-bold text-terminal-text">{countdown}</div>
          </div>
          <p className="text-[10px] lg:text-xs text-terminal-textMuted">
            <strong>Unstaking:</strong> You can unstake anytime. Tokens return after next draw, 
            but you won&apos;t get rewards for that draw.
          </p>
        </div>
      ),
      color: "green",
    },
    {
      icon: TrendingUp,
      title: "Collect & Compound",
      description: "Convert USDC rewards back to SHFL to compound",
      details: (
        <div className="space-y-2">
          <p>Weekly USDC rewards are distributed after each draw</p>
          <p className="text-terminal-accent font-medium">
            💡 Pro tip: Convert your USDC rewards to SHFL and stake more tickets to compound your returns!
          </p>
          <p className="text-[10px] text-terminal-textMuted">
            Compounding weekly can significantly boost your long-term returns
          </p>
        </div>
      ),
      color: "terminal-accent",
    },
  ];
  
  const colorClasses: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    green: "text-green-400 bg-green-500/10 border-green-500/30",
    "terminal-accent": "text-terminal-accent bg-terminal-accent/10 border-terminal-accent/30",
  };
  
  return (
    <div className="py-4 lg:py-8">
      {/* Progress Bar - Scrollable on mobile */}
      <div className="flex items-center justify-between mb-6 lg:mb-8 overflow-x-auto pb-2 px-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            <motion.button
              onClick={() => setActiveStep(i)}
              className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 flex items-center justify-center transition-all",
                i === activeStep
                  ? "bg-terminal-accent border-terminal-accent text-white scale-110"
                  : i < activeStep
                  ? "bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                  : "bg-terminal-card border-terminal-border text-terminal-textMuted"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {i < activeStep ? (
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
              ) : (
                <span className="text-xs lg:text-sm font-bold">{i + 1}</span>
              )}
            </motion.button>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-6 sm:w-10 lg:w-16 xl:w-20 h-1 mx-1 rounded transition-colors flex-shrink-0",
                i < activeStep ? "bg-terminal-accent" : "bg-terminal-border"
              )} />
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
          <div className={cn(
            "inline-flex p-3 lg:p-4 rounded-2xl border mb-4",
            colorClasses[steps[activeStep].color]
          )}>
            {(() => {
              const Icon = steps[activeStep].icon;
              return <Icon className="w-10 h-10 lg:w-12 lg:h-12" />;
            })()}
          </div>
          
          <h3 className="text-xl lg:text-2xl font-bold text-terminal-text mb-2">
            {steps[activeStep].title}
          </h3>
          <p className="text-base lg:text-lg text-terminal-textSecondary mb-4">
            {steps[activeStep].description}
          </p>
          <div className="text-xs lg:text-sm text-terminal-textMuted max-w-md mx-auto text-left">
            {typeof steps[activeStep].details === "string" ? (
              <p>{steps[activeStep].details}</p>
            ) : (
              steps[activeStep].details
            )}
          </div>
          
          {steps[activeStep].link && (
            <a
              href={steps[activeStep].link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-terminal-accent/10 border border-terminal-accent/30 text-terminal-accent hover:bg-terminal-accent/20 transition-colors text-sm"
            >
              {steps[activeStep].linkText}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Navigation */}
      <div className="flex justify-center gap-3 lg:gap-4 mt-6 lg:mt-8">
        <motion.button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className={cn(
            "px-3 lg:px-4 py-2 rounded-lg flex items-center gap-2 text-sm",
            activeStep === 0
              ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed"
              : "bg-terminal-card border border-terminal-border text-terminal-text hover:border-terminal-accent"
          )}
          whileHover={activeStep > 0 ? { x: -5 } : {}}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </motion.button>
        <motion.button
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          className={cn(
            "px-3 lg:px-4 py-2 rounded-lg flex items-center gap-2 text-sm",
            activeStep === steps.length - 1
              ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed"
              : "bg-terminal-accent text-white hover:bg-terminal-accent/80"
          )}
          whileHover={activeStep < steps.length - 1 ? { x: 5 } : {}}
        >
          <span className="hidden sm:inline">Next</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

// Compounding Calculator
function CompoundingCalculator() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [initialStake, setInitialStake] = useState(50000);
  const [weeklyYieldPct, setWeeklyYieldPct] = useState(0.5); // 0.5% weekly
  const [weeks, setWeeks] = useState(52);
  const [shflPrice] = useState(0.05);
  
  // Calculate compounded vs non-compounded
  const results = useMemo(() => {
    const initialValue = initialStake * shflPrice;
    const weeklyYield = weeklyYieldPct / 100;
    
    let compoundedTokens = initialStake;
    let simpleYield = 0;
    const compoundedData: { week: number; compounded: number; simple: number }[] = [];
    
    for (let w = 0; w <= weeks; w++) {
      const compoundedValue = compoundedTokens * shflPrice;
      const simpleValue = initialValue + simpleYield;
      
      compoundedData.push({
        week: w,
        compounded: compoundedValue,
        simple: simpleValue,
      });
      
      // Weekly yield
      const weeklyUSDC = compoundedTokens * shflPrice * weeklyYield;
      const newTokens = weeklyUSDC / shflPrice;
      compoundedTokens += newTokens;
      simpleYield += initialValue * weeklyYield;
    }
    
    const finalCompounded = compoundedData[weeks]?.compounded || 0;
    const finalSimple = compoundedData[weeks]?.simple || 0;
    const compoundingBonus = finalCompounded - finalSimple;
    const compoundingBonusPct = (compoundingBonus / finalSimple) * 100;
    
    return {
      data: compoundedData,
      finalCompounded,
      finalSimple,
      compoundingBonus,
      compoundingBonusPct,
      totalYieldCompounded: finalCompounded - initialValue,
      totalYieldSimple: finalSimple - initialValue,
    };
  }, [initialStake, weeklyYieldPct, weeks, shflPrice]);
  
  // Find max for chart scaling
  const maxValue = Math.max(...results.data.map(d => Math.max(d.compounded, d.simple)));
  
  return (
    <div ref={ref} className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Controls */}
        <div className="space-y-4 lg:space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Initial Stake</span>
              <span className="font-mono text-terminal-text">{initialStake.toLocaleString()} SHFL</span>
            </div>
            <input
              type="range"
              min={10000}
              max={500000}
              step={5000}
              value={initialStake}
              onChange={(e) => setInitialStake(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Weekly Yield %</span>
              <span className="font-mono text-terminal-accent">{weeklyYieldPct.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.05}
              value={weeklyYieldPct}
              onChange={(e) => setWeeklyYieldPct(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Time Period</span>
              <span className="font-mono text-terminal-text">{weeks} weeks</span>
            </div>
            <input
              type="range"
              min={12}
              max={156}
              step={4}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
            />
          </div>
          
          {/* Results */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border">
              <div className="text-[10px] text-terminal-textMuted uppercase mb-1">Without Compound</div>
              <div className="text-lg font-bold text-terminal-textSecondary">
                ${results.finalSimple.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="text-[10px] text-terminal-textMuted uppercase mb-1">With Compounding</div>
              <div className="text-lg font-bold text-green-400">
                ${results.finalCompounded.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
          
          <div className="p-3 lg:p-4 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-terminal-textSecondary">Compounding Bonus</span>
              <div className="text-right">
                <span className="text-lg font-bold text-terminal-accent">
                  +${results.compoundingBonus.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-terminal-accent ml-2">
                  (+{results.compoundingBonusPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-[250px] lg:h-[300px] p-4 rounded-xl bg-terminal-card border border-terminal-border">
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-terminal-textSecondary">Compounded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-terminal-textMuted" />
              <span className="text-terminal-textSecondary">Simple</span>
            </div>
          </div>
          
          {/* Simple line chart */}
          <div className="relative h-[calc(100%-40px)]">
            <svg className="w-full h-full" preserveAspectRatio="none">
              {/* Simple yield line */}
              <motion.path
                d={results.data.map((d, i) => {
                  const x = (i / weeks) * 100;
                  const y = 100 - (d.simple / maxValue) * 100;
                  return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                }).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-terminal-textMuted"
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : {}}
                transition={{ duration: 2 }}
              />
              
              {/* Compounded yield line */}
              <motion.path
                d={results.data.map((d, i) => {
                  const x = (i / weeks) * 100;
                  const y = 100 - (d.compounded / maxValue) * 100;
                  return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                }).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-green-500"
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : {}}
                transition={{ duration: 2, delay: 0.5 }}
              />
            </svg>
            
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] text-terminal-textMuted -translate-x-full pr-1">
              <span>${(maxValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span>${(maxValue / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span>$0</span>
            </div>
          </div>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 2 }}
        className="mt-6 text-center"
      >
        <p className="text-xs lg:text-sm text-terminal-textSecondary">
          <Sparkles className="w-4 h-4 inline mr-1 text-terminal-accent" />
          Converting USDC rewards to SHFL weekly lets you <span className="text-terminal-accent font-semibold">compound your returns</span> for significantly higher long-term gains!
        </p>
      </motion.div>
    </div>
  );
}

// Risk Factors Comparison
function RiskFactors() {
  const [ngrDrop, setNgrDrop] = useState(0);
  const [priceDrop, setPriceDrop] = useState(0);
  const [stakersIncrease, setStakersIncrease] = useState(0);
  
  const baseYield = 100;
  const adjustedYield = baseYield * (1 - ngrDrop / 100) * (1 - stakersIncrease / 100);
  const valueChange = -priceDrop + (adjustedYield / baseYield - 1) * 100;
  
  return (
    <div className="py-4 lg:py-8">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Controls */}
        <div className="space-y-4 lg:space-y-6">
          <h3 className="text-base lg:text-lg font-semibold text-terminal-text mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
            Risk Simulator
          </h3>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">NGR Drops</span>
              <span className="text-red-400 font-mono">-{ngrDrop}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              value={ngrDrop}
              onChange={(e) => setNgrDrop(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">SHFL Price Drops</span>
              <span className="text-red-400 font-mono">-{priceDrop}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              value={priceDrop}
              onChange={(e) => setPriceDrop(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Total Stakers Increase</span>
              <span className="text-orange-400 font-mono">+{stakersIncrease}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={stakersIncrease}
              onChange={(e) => setStakersIncrease(Number(e.target.value))}
              className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
        
        {/* Impact Display */}
        <div className="space-y-3 lg:space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <div className="p-3 lg:p-4 rounded-xl bg-terminal-card border border-terminal-border">
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Your Yield</div>
              <div className={cn(
                "text-xl lg:text-2xl font-bold",
                adjustedYield < baseYield ? "text-red-400" : "text-green-400"
              )}>
                {adjustedYield.toFixed(0)}%
              </div>
              <div className="text-[10px] lg:text-xs text-terminal-textMuted">of original</div>
            </div>
            
            <div className="p-3 lg:p-4 rounded-xl bg-terminal-card border border-terminal-border">
              <div className="text-[10px] lg:text-xs text-terminal-textMuted uppercase mb-1">Net Impact</div>
              <div className={cn(
                "text-xl lg:text-2xl font-bold",
                valueChange < 0 ? "text-red-400" : "text-green-400"
              )}>
                {valueChange > 0 ? "+" : ""}{valueChange.toFixed(1)}%
              </div>
              <div className="text-[10px] lg:text-xs text-terminal-textMuted">yield + price</div>
            </div>
          </div>
          
          {/* What You Control */}
          <div className="p-3 lg:p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <h4 className="text-xs lg:text-sm font-medium text-terminal-text mb-2 lg:mb-3">What You Control</h4>
            <div className="space-y-1.5 lg:space-y-2">
              {[
                "How much you stake",
                "When to unstake",
                "Whether to compound",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs lg:text-sm">
                  <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-green-400" />
                  <span className="text-terminal-textSecondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* What You Don't Control */}
          <div className="p-3 lg:p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <h4 className="text-xs lg:text-sm font-medium text-red-400 mb-2 lg:mb-3">What You Don&apos;t Control</h4>
            <div className="space-y-1.5 lg:space-y-2">
              {[
                "Weekly NGR (casino volume)",
                "SHFL price movements",
                "Other stakers' behavior",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs lg:text-sm">
                  <X className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-red-400" />
                  <span className="text-terminal-textSecondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main LearnPage Component
export default function LearnPage({ onBack, nextDrawTimestamp }: LearnPageProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  return (
    <div className="min-h-screen bg-terminal-black text-terminal-text relative">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-terminal-accent z-50 origin-left"
        style={{ scaleX }}
      />
      
      {/* Floating Particles */}
      <FloatingParticles />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-terminal-dark/90 backdrop-blur-sm border-b border-terminal-border">
        <div className="max-w-5xl mx-auto px-4 py-3 lg:py-4 flex items-center justify-between">
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 text-terminal-textSecondary hover:text-terminal-text transition-colors text-sm"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </motion.button>
          
          <div className="flex items-center gap-2">
            <img
              src="https://i.ibb.co/TDMBKTP7/shfl-logo-2.png"
              alt="SHFL"
              className="w-5 h-5 lg:w-6 lg:h-6"
            />
            <span className="font-semibold text-sm lg:text-base">Learn</span>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 mb-4 lg:mb-6">
              <Sparkles className="w-3 h-3 lg:w-4 lg:h-4 text-terminal-accent" />
              <span className="text-xs lg:text-sm text-terminal-accent">Interactive Guide</span>
            </div>
            
            <h1 className="text-3xl lg:text-6xl font-bold mb-4 lg:mb-6">
              How <span className="text-terminal-accent">SHFL Yield</span> Works
            </h1>
            
            <p className="text-base lg:text-xl text-terminal-textSecondary max-w-2xl mx-auto mb-6 lg:mb-8">
              Stake SHFL tokens, earn lottery tickets, receive weekly yield from Shuffle&apos;s casino revenue. 
              Let&apos;s break it down step by step.
            </p>
            
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-terminal-textMuted"
            >
              <ChevronDown className="w-6 h-6 lg:w-8 lg:h-8 mx-auto" />
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Content Sections */}
      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-16 lg:space-y-24">
        {/* Section 1: Revenue Flow */}
        <AnimatedSection>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-blue-400 font-medium">Section 1</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">The Revenue Flow</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              Follow the money from player bets to your wallet
            </p>
          </div>
          <RevenueFlowDiagram />
        </AnimatedSection>
        
        {/* Section 2: Your Piece of the Pie */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-terminal-accent font-medium">Section 2</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">Your Piece of the Pie</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              Calculate your share based on stake size
            </p>
          </div>
          <StakeSharePie />
        </AnimatedSection>
        
        {/* Section 3: The Ticket System */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-purple-400 font-medium">Section 3</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">The Ticket System</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              Convert SHFL to lottery tickets (1:1 ratio)
            </p>
          </div>
          <TicketVisualization />
        </AnimatedSection>
        
        {/* Section 4: Weekly Draw Simulator */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-green-400 font-medium">Section 4</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">Weekly Draw Simulator</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              Experience a full year of yield variance
            </p>
          </div>
          <DrawSimulator />
        </AnimatedSection>
        
        {/* Section 5: Step by Step Guide */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-yellow-400 font-medium">Section 5</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">How to Participate</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              From signup to weekly yield in 5 steps
            </p>
          </div>
          <StepByStepGuide nextDrawTimestamp={nextDrawTimestamp} />
        </AnimatedSection>
        
        {/* Section 6: Compounding Calculator - NEW */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-emerald-400 font-medium">Section 6</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">The Power of Compounding</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              See how reinvesting USDC rewards boosts your returns
            </p>
          </div>
          <CompoundingCalculator />
        </AnimatedSection>
        
        {/* Section 7: Risk Factors */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-6 lg:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 mb-3 lg:mb-4">
              <span className="text-[10px] lg:text-xs text-red-400 font-medium">Section 7</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-2">Understand the Risks</h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary">
              Model different scenarios and their impact
            </p>
          </div>
          <RiskFactors />
        </AnimatedSection>
        
        {/* CTA Section */}
        <AnimatedSection delay={0.1}>
          <div className="text-center py-8 lg:py-12 px-6 lg:px-8 rounded-2xl bg-gradient-to-br from-terminal-accent/20 to-purple-500/10 border border-terminal-accent/30">
            <Award className="w-12 h-12 lg:w-16 lg:h-16 text-terminal-accent mx-auto mb-4" />
            <h2 className="text-2xl lg:text-3xl font-bold text-terminal-text mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-sm lg:text-base text-terminal-textSecondary mb-6 max-w-md mx-auto">
              Head back to the dashboard to track current yields, analyze historical data, 
              and plan your staking strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                onClick={onBack}
                className="px-6 lg:px-8 py-3 lg:py-4 rounded-xl bg-terminal-accent text-white font-semibold flex items-center gap-2 justify-center hover:bg-terminal-accent/80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                Back to Dashboard
              </motion.button>
              <a
                href="https://shuffle.com/token"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 lg:px-8 py-3 lg:py-4 rounded-xl bg-terminal-card border border-terminal-border text-terminal-text font-semibold flex items-center gap-2 justify-center hover:border-terminal-accent transition-colors"
              >
                Start Staking
                <ExternalLink className="w-4 h-4 lg:w-5 lg:h-5" />
              </a>
            </div>
          </div>
        </AnimatedSection>
        
        {/* Disclaimer */}
        <div className="text-center text-[10px] lg:text-xs text-terminal-textMuted max-w-2xl mx-auto">
          <p>
            <strong>Disclaimer:</strong> This educational content is for informational purposes only. 
            The data, calculations, and projections shown may be inaccurate and should not be relied upon 
            for financial decisions. Past performance does not guarantee future results. 
            Cryptocurrency investments carry significant risk. Do your own research.
          </p>
        </div>
      </div>
    </div>
  );
}
