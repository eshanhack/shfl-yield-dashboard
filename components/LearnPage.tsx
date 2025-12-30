"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Coins,
  Ticket,
  TrendingUp,
  Calendar,
  Wallet,
  Lock,
  Gift,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  DollarSign,
  Users,
  Percent,
  Clock,
  Target,
  Zap,
  Award,
  PiggyBank,
  BarChart3,
  ArrowDown,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LearnPageProps {
  onBack: () => void;
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
      
      // Easing function
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
  
  // Calculate flow amounts
  const houseEdge = 0.03; // 3%
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
    <div ref={ref} className="relative py-8">
      {/* Betting Volume Slider */}
      <div className="mb-8 text-center">
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
        <div className="text-2xl font-bold text-terminal-accent mt-2">
          {formatMoney(bettingVolume)}
        </div>
      </div>
      
      {/* Flow Diagram */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
        {/* Players Bet */}
        <motion.div
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-500 min-w-[160px]",
            animationStep >= 0 
              ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 0 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <div className="text-center">
            <div className="text-xs text-terminal-textMuted uppercase mb-1">Players Bet</div>
            <div className="text-lg font-bold text-blue-400">{formatMoney(bettingVolume)}</div>
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div
          className="text-terminal-textMuted"
          animate={animationStep === 1 ? { x: [0, 10, 0], opacity: [0.5, 1, 0.5] } : {}}
        >
          <ArrowRight className="w-6 h-6 hidden lg:block" />
          <ArrowDown className="w-6 h-6 lg:hidden" />
        </motion.div>
        
        {/* GGR */}
        <motion.div
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-500 min-w-[160px]",
            animationStep >= 1 
              ? "bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 1 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Coins className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-center">
            <div className="text-xs text-terminal-textMuted uppercase mb-1">GGR (3%)</div>
            <div className="text-lg font-bold text-yellow-400">{formatMoney(ggr)}</div>
          </div>
          <div className="text-[10px] text-terminal-textMuted text-center mt-1">
            Gross Gaming Revenue
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div
          className="text-terminal-textMuted"
          animate={animationStep === 2 ? { x: [0, 10, 0], opacity: [0.5, 1, 0.5] } : {}}
        >
          <ArrowRight className="w-6 h-6 hidden lg:block" />
          <ArrowDown className="w-6 h-6 lg:hidden" />
        </motion.div>
        
        {/* NGR */}
        <motion.div
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-500 min-w-[160px]",
            animationStep >= 2 
              ? "bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep === 2 ? { scale: [1, 1.05, 1] } : {}}
        >
          <BarChart3 className="w-8 h-8 text-orange-400 mx-auto mb-2" />
          <div className="text-center">
            <div className="text-xs text-terminal-textMuted uppercase mb-1">NGR (50%)</div>
            <div className="text-lg font-bold text-orange-400">{formatMoney(ngr)}</div>
          </div>
          <div className="text-[10px] text-terminal-textMuted text-center mt-1">
            Net Gaming Revenue
          </div>
        </motion.div>
        
        {/* Arrow */}
        <motion.div
          className="text-terminal-textMuted"
          animate={animationStep === 3 ? { x: [0, 10, 0], opacity: [0.5, 1, 0.5] } : {}}
        >
          <ArrowRight className="w-6 h-6 hidden lg:block" />
          <ArrowDown className="w-6 h-6 lg:hidden" />
        </motion.div>
        
        {/* Lottery Pool */}
        <motion.div
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-500 min-w-[160px]",
            animationStep >= 3 
              ? "bg-terminal-accent/20 border-terminal-accent shadow-lg shadow-terminal-accent/20" 
              : "bg-terminal-card border-terminal-border"
          )}
          animate={animationStep >= 3 ? { scale: [1, 1.05, 1] } : {}}
        >
          <Gift className="w-8 h-8 text-terminal-accent mx-auto mb-2" />
          <div className="text-center">
            <div className="text-xs text-terminal-textMuted uppercase mb-1">Lottery (15%)</div>
            <div className="text-lg font-bold text-terminal-accent">{formatMoney(lotteryPool)}</div>
          </div>
          <div className="text-[10px] text-terminal-textMuted text-center mt-1">
            Your Yield Source 🎯
          </div>
        </motion.div>
      </div>
      
      {/* Explanation */}
      <motion.div
        className="mt-8 text-center max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-terminal-textSecondary text-sm">
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
  const totalStaked = 180000000; // ~180M staked
  const weeklyPool = 400000; // Example weekly lottery pool
  
  const userShare = userStake / totalStaked;
  const weeklyYield = weeklyPool * userShare;
  const annualYield = weeklyYield * 52;
  const apy = (annualYield / (userStake * 0.05)) * 100; // Assuming $0.05 per SHFL
  
  const animatedYield = useAnimatedCounter(Math.round(weeklyYield), 800, isInView);
  
  return (
    <div ref={ref} className="py-8">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* Pie Visualization */}
        <div className="relative flex justify-center">
          <div className="relative w-64 h-64">
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
              <div className="text-3xl font-bold text-terminal-accent">
                {(userShare * 100).toFixed(4)}%
              </div>
              <div className="text-xs text-terminal-textMuted">Your Share</div>
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
            <div className="w-64 h-64 rounded-full border-2 border-terminal-accent/30" />
          </motion.div>
        </div>
        
        {/* Controls & Results */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-terminal-textSecondary mb-2">
              How much SHFL would you stake?
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1000}
                max={500000}
                step={1000}
                value={userStake}
                onChange={(e) => setUserStake(Number(e.target.value))}
                className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-accent"
              />
              <div className="w-32 text-right">
                <span className="text-xl font-bold text-terminal-text">
                  {userStake.toLocaleString()}
                </span>
                <span className="text-sm text-terminal-textMuted ml-1">SHFL</span>
              </div>
            </div>
          </div>
          
          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              className="p-4 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Weekly Yield</div>
              <div className="text-2xl font-bold text-terminal-accent">
                ${animatedYield.toLocaleString()}
              </div>
            </motion.div>
            
            <motion.div
              className="p-4 rounded-xl bg-green-500/10 border border-green-500/30"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Annual Yield</div>
              <div className="text-2xl font-bold text-green-400">
                ${Math.round(annualYield).toLocaleString()}
              </div>
            </motion.div>
          </div>
          
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-400">Important</span>
            </div>
            <p className="text-xs text-terminal-textSecondary">
              Your slice of the pie depends on total staked SHFL. More stakers = smaller individual shares, 
              but also signals a healthy protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ticket System Visualization
function TicketSystem() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [stakeAmount, setStakeAmount] = useState(10000);
  const [lockDuration, setLockDuration] = useState(180);
  
  // Multipliers based on lock duration
  const multipliers: Record<number, number> = {
    30: 1.0,
    90: 1.25,
    180: 1.75,
    365: 2.5,
  };
  
  const baseTickets = stakeAmount;
  const multiplier = multipliers[lockDuration];
  const totalTickets = Math.floor(baseTickets * multiplier);
  
  return (
    <div ref={ref} className="py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
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
            <div className="text-xl font-bold text-terminal-text mt-2">
              {stakeAmount.toLocaleString()} SHFL
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-terminal-textSecondary mb-3">
              Lock Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(multipliers).map(([days, mult]) => (
                <motion.button
                  key={days}
                  onClick={() => setLockDuration(Number(days))}
                  className={cn(
                    "p-3 rounded-lg border transition-all text-center",
                    lockDuration === Number(days)
                      ? "bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                      : "bg-terminal-card border-terminal-border text-terminal-textSecondary hover:border-terminal-accent/50"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-lg font-bold">{days}d</div>
                  <div className="text-[10px] mt-1">{mult}x</div>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Calculation Breakdown */}
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Base Tickets</span>
              <span className="font-mono text-terminal-text">{baseTickets.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-terminal-textSecondary">Duration Multiplier</span>
              <span className="font-mono text-terminal-accent">×{multiplier}</span>
            </div>
            <div className="border-t border-terminal-border pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-terminal-text font-medium">Total Tickets</span>
                <span className="font-mono text-xl font-bold text-terminal-accent">
                  {totalTickets.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ticket Animation */}
        <div className="relative h-[300px] overflow-hidden rounded-xl bg-gradient-to-b from-terminal-accent/5 to-terminal-dark border border-terminal-border">
          {/* Falling tickets */}
          <AnimatePresence>
            {isInView && [...Array(Math.min(15, Math.floor(totalTickets / 1000)))].map((_, i) => (
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
                  delay: i * 0.3,
                  ease: "linear",
                }}
              >
                <div className="w-10 h-14 bg-gradient-to-br from-terminal-accent to-purple-500 rounded-lg shadow-lg flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Pool at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-terminal-accent/30 to-transparent flex items-end justify-center pb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-accent">
                {totalTickets.toLocaleString()}
              </div>
              <div className="text-xs text-terminal-textMuted">Tickets in Pool</div>
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
    
    // Simulate 52 weeks
    const interval = setInterval(() => {
      setCurrentWeek(prev => {
        const week = prev + 1;
        
        if (week > 52) {
          clearInterval(interval);
          setIsSimulating(false);
          return prev;
        }
        
        // Random weekly NGR between 200K and 600K (realistic variance)
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
    <div className="py-8">
      <div className="text-center mb-8">
        <p className="text-terminal-textSecondary mb-4">
          See how yield varies week to week with a 52-week simulation
        </p>
        <motion.button
          onClick={runSimulation}
          disabled={isSimulating}
          className={cn(
            "px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto",
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
                <RotateCcw className="w-5 h-5" />
              </motion.div>
              Week {currentWeek}/52
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
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
          className="space-y-6"
        >
          {/* Mini bar chart */}
          <div className="h-40 flex items-end gap-0.5 px-4 overflow-hidden">
            {results.map((value, i) => {
              const height = (value / (maxWeek || 1)) * 100;
              return (
                <motion.div
                  key={i}
                  className={cn(
                    "flex-1 min-w-[4px] rounded-t",
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30 text-center">
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Total Earned</div>
              <div className="text-xl font-bold text-terminal-accent">
                ${Math.round(totalEarned).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border text-center">
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Avg/Week</div>
              <div className="text-xl font-bold text-terminal-text">
                ${Math.round(avgWeekly).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Best Week</div>
              <div className="text-xl font-bold text-green-400">
                ${Math.round(maxWeek).toLocaleString()}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Worst Week</div>
              <div className="text-xl font-bold text-red-400">
                ${Math.round(minWeek).toLocaleString()}
              </div>
            </div>
          </div>
          
          {!isSimulating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-4 rounded-xl bg-terminal-card border border-terminal-border"
            >
              <Sparkles className="w-6 h-6 text-terminal-accent mx-auto mb-2" />
              <p className="text-sm text-terminal-textSecondary">
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

// Step by Step Guide
function StepByStepGuide() {
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [
    {
      icon: Wallet,
      title: "Connect Wallet",
      description: "Link your Web3 wallet to Shuffle.com",
      details: "Shuffle supports MetaMask, WalletConnect, and other popular wallets. Make sure you're on the Ethereum network.",
      color: "blue",
    },
    {
      icon: Coins,
      title: "Acquire SHFL",
      description: "Get SHFL tokens through Uniswap, CEX, or Shuffle",
      details: "You can swap ETH for SHFL on Uniswap, buy on exchanges like Gate.io, or earn SHFL by playing on Shuffle.",
      color: "yellow",
    },
    {
      icon: Lock,
      title: "Choose Lock Duration",
      description: "Longer locks = more tickets = higher yield",
      details: "30 days (1x), 90 days (1.25x), 180 days (1.75x), or 365 days (2.5x) multiplier on your ticket count.",
      color: "orange",
    },
    {
      icon: Ticket,
      title: "Stake Your SHFL",
      description: "Convert your SHFL into lottery tickets",
      details: "Navigate to the Staking page, enter your amount, confirm the transaction, and you're in!",
      color: "purple",
    },
    {
      icon: Calendar,
      title: "Weekly Draws",
      description: "Every Monday, lottery NGR is distributed",
      details: "You don't need to do anything - yield accrues automatically based on your ticket share.",
      color: "green",
    },
    {
      icon: TrendingUp,
      title: "Yield Accrues",
      description: "Watch your USDC rewards grow",
      details: "Claim your accumulated yield anytime, or let it compound for bigger future returns.",
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
    <div className="py-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <motion.button
              onClick={() => setActiveStep(i)}
              className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
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
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-bold">{i + 1}</span>
              )}
            </motion.button>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-8 sm:w-16 lg:w-24 h-1 mx-1 rounded transition-colors",
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
            "inline-flex p-4 rounded-2xl border mb-4",
            colorClasses[steps[activeStep].color]
          )}>
            {(() => {
              const Icon = steps[activeStep].icon;
              return <Icon className="w-12 h-12" />;
            })()}
          </div>
          
          <h3 className="text-2xl font-bold text-terminal-text mb-2">
            {steps[activeStep].title}
          </h3>
          <p className="text-lg text-terminal-textSecondary mb-4">
            {steps[activeStep].description}
          </p>
          <p className="text-sm text-terminal-textMuted max-w-md mx-auto">
            {steps[activeStep].details}
          </p>
        </motion.div>
      </AnimatePresence>
      
      {/* Navigation */}
      <div className="flex justify-center gap-4 mt-8">
        <motion.button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className={cn(
            "px-4 py-2 rounded-lg flex items-center gap-2",
            activeStep === 0
              ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed"
              : "bg-terminal-card border border-terminal-border text-terminal-text hover:border-terminal-accent"
          )}
          whileHover={activeStep > 0 ? { x: -5 } : {}}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </motion.button>
        <motion.button
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          className={cn(
            "px-4 py-2 rounded-lg flex items-center gap-2",
            activeStep === steps.length - 1
              ? "bg-terminal-border text-terminal-textMuted cursor-not-allowed"
              : "bg-terminal-accent text-white hover:bg-terminal-accent/80"
          )}
          whileHover={activeStep < steps.length - 1 ? { x: 5 } : {}}
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

// Risk Factors Comparison
function RiskFactors() {
  const [ngrDrop, setNgrDrop] = useState(0);
  const [priceDrop, setPriceDrop] = useState(0);
  const [stakersIncrease, setStakersIncrease] = useState(0);
  
  const baseYield = 100; // Normalized to 100
  const adjustedYield = baseYield * (1 - ngrDrop / 100) * (1 - stakersIncrease / 100);
  const valueChange = -priceDrop + (adjustedYield / baseYield - 1) * 100;
  
  return (
    <div className="py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-terminal-text mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Your Yield</div>
              <div className={cn(
                "text-2xl font-bold",
                adjustedYield < baseYield ? "text-red-400" : "text-green-400"
              )}>
                {adjustedYield.toFixed(0)}%
              </div>
              <div className="text-xs text-terminal-textMuted">of original</div>
            </div>
            
            <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
              <div className="text-xs text-terminal-textMuted uppercase mb-1">Net Value Impact</div>
              <div className={cn(
                "text-2xl font-bold",
                valueChange < 0 ? "text-red-400" : "text-green-400"
              )}>
                {valueChange > 0 ? "+" : ""}{valueChange.toFixed(1)}%
              </div>
              <div className="text-xs text-terminal-textMuted">yield + price</div>
            </div>
          </div>
          
          {/* What You Control */}
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border">
            <h4 className="text-sm font-medium text-terminal-text mb-3">What You Control</h4>
            <div className="space-y-2">
              {[
                "How much you stake",
                "Your lock duration",
                "When to exit",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-terminal-textSecondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* What You Don't Control */}
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <h4 className="text-sm font-medium text-red-400 mb-3">What You Don&apos;t Control</h4>
            <div className="space-y-2">
              {[
                "Weekly NGR (casino volume)",
                "SHFL price movements",
                "Other stakers' behavior",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <X className="w-4 h-4 text-red-400" />
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
export default function LearnPage({ onBack }: LearnPageProps) {
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 text-terminal-textSecondary hover:text-terminal-text transition-colors"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </motion.button>
          
          <div className="flex items-center gap-2">
            <img
              src="https://i.ibb.co/TDMBKTP7/shfl-logo-2.png"
              alt="SHFL"
              className="w-6 h-6"
            />
            <span className="font-semibold">Learn</span>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 mb-6">
              <Sparkles className="w-4 h-4 text-terminal-accent" />
              <span className="text-sm text-terminal-accent">Interactive Guide</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              How <span className="text-terminal-accent">SHFL Yield</span> Works
            </h1>
            
            <p className="text-lg lg:text-xl text-terminal-textSecondary max-w-2xl mx-auto mb-8">
              Stake SHFL tokens, earn lottery tickets, receive weekly yield from Shuffle&apos;s casino revenue. 
              Let&apos;s break it down step by step.
            </p>
            
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-terminal-textMuted"
            >
              <ChevronDown className="w-8 h-8 mx-auto" />
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Content Sections */}
      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-24">
        {/* Section 1: Revenue Flow */}
        <AnimatedSection>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 mb-4">
              <span className="text-xs text-blue-400 font-medium">Section 1</span>
            </div>
            <h2 className="text-3xl font-bold text-terminal-text mb-2">The Revenue Flow</h2>
            <p className="text-terminal-textSecondary">
              Follow the money from player bets to your wallet
            </p>
          </div>
          <RevenueFlowDiagram />
        </AnimatedSection>
        
        {/* Section 2: Your Piece of the Pie */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 mb-4">
              <span className="text-xs text-terminal-accent font-medium">Section 2</span>
            </div>
            <h2 className="text-3xl font-bold text-terminal-text mb-2">Your Piece of the Pie</h2>
            <p className="text-terminal-textSecondary">
              Calculate your share based on stake size
            </p>
          </div>
          <StakeSharePie />
        </AnimatedSection>
        
        {/* Section 3: The Ticket System */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4">
              <span className="text-xs text-purple-400 font-medium">Section 3</span>
            </div>
            <h2 className="text-3xl font-bold text-terminal-text mb-2">The Ticket System</h2>
            <p className="text-terminal-textSecondary">
              Convert SHFL to lottery tickets with multipliers
            </p>
          </div>
          <TicketSystem />
        </AnimatedSection>
        
        {/* Section 4: Weekly Draw Simulator */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 mb-4">
              <span className="text-xs text-green-400 font-medium">Section 4</span>
            </div>
            <h2 className="text-3xl font-bold text-terminal-text mb-2">Weekly Draw Simulator</h2>
            <p className="text-terminal-textSecondary">
              Experience a full year of yield variance
            </p>
          </div>
          <DrawSimulator />
        </AnimatedSection>
        
        {/* Section 5: Step by Step Guide */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4">
              <span className="text-xs text-yellow-400 font-medium">Section 5</span>
            </div>
            <h2 className="text-3xl font-bold text-terminal-text mb-2">How to Participate</h2>
            <p className="text-terminal-textSecondary">
              From wallet to weekly yield in 6 steps
            </p>
          </div>
          <StepByStepGuide />
        </AnimatedSection>
        
        {/* Section 6: Risk Factors */}
        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
              <span className="text-xs text-red-400 font-medium">Section 6</span>
            </div>
            <h2 className="text-3xl font-bold text-terminal-text mb-2">Understand the Risks</h2>
            <p className="text-terminal-textSecondary">
              Model different scenarios and their impact
            </p>
          </div>
          <RiskFactors />
        </AnimatedSection>
        
        {/* CTA Section */}
        <AnimatedSection delay={0.1}>
          <div className="text-center py-12 px-8 rounded-2xl bg-gradient-to-br from-terminal-accent/20 to-purple-500/10 border border-terminal-accent/30">
            <Award className="w-16 h-16 text-terminal-accent mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-terminal-text mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-terminal-textSecondary mb-6 max-w-md mx-auto">
              Head back to the dashboard to track current yields, analyze historical data, 
              and plan your staking strategy.
            </p>
            <motion.button
              onClick={onBack}
              className="px-8 py-4 rounded-xl bg-terminal-accent text-white font-semibold flex items-center gap-2 mx-auto hover:bg-terminal-accent/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </motion.button>
          </div>
        </AnimatedSection>
        
        {/* Disclaimer */}
        <div className="text-center text-xs text-terminal-textMuted max-w-2xl mx-auto">
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

