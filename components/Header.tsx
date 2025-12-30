"use client";

import { useState, useEffect } from "react";
import { Activity, Clock, TrendingUp, TrendingDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CurrencySelector from "./CurrencySelector";
import InfoTooltip, { TOOLTIPS } from "./InfoTooltip";

interface HeaderProps {
  price: number;
  priceChange24h: number;
  nextDrawTimestamp: number;
}

export default function Header({ price, priceChange24h, nextDrawTimestamp }: HeaderProps) {
  const [timeToNextDraw, setTimeToNextDraw] = useState("");
  const [isPriceUpdating, setIsPriceUpdating] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(price);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = nextDrawTimestamp - now;

      if (diff <= 0) {
        setTimeToNextDraw("DRAW LIVE");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeToNextDraw(
        `${days}D ${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextDrawTimestamp]);

  // Animate price changes
  useEffect(() => {
    if (price !== displayPrice) {
      setIsPriceUpdating(true);
      setDisplayPrice(price);
      const timeout = setTimeout(() => setIsPriceUpdating(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [price, displayPrice]);

  const isPositive = priceChange24h >= 0;

  return (
    <header className="border-b border-terminal-border bg-terminal-dark/50 backdrop-blur-sm">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 py-2 sm:py-3">
        {/* Mobile Layout */}
        <div className="flex items-center justify-between lg:hidden">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="https://i.ibb.co/8gPPNMxd/shfl-pro-logo.png"
              alt="SHFL Pro"
              className="w-7 h-7 sm:w-8 sm:h-8 animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight">
                SHFL<span className="text-terminal-accent">Pro</span>
              </h1>
              <p className="text-[9px] text-terminal-textSecondary tracking-wide hidden sm:block">
                TERMINAL v1.0
              </p>
            </div>
          </div>

          {/* Mobile Stats Row */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Compact Price */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm sm:text-base font-bold tabular-nums",
                  isPriceUpdating && "price-update text-terminal-accent"
                )}
              >
                ${displayPrice.toFixed(4)}
              </span>
              <div
                className={cn(
                  "flex items-center text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded",
                  isPositive
                    ? "text-terminal-positive bg-terminal-positive/10"
                    : "text-terminal-negative bg-terminal-negative/10"
                )}
              >
                {isPositive ? "+" : ""}{priceChange24h.toFixed(1)}%
              </div>
            </div>

            {/* Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-terminal-border/50 rounded-lg touch-target"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-terminal-border space-y-3 animate-dropdown">
            {/* Next Draw */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-terminal-textMuted" />
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide">
                  Next Draw
                </span>
              </div>
              <span
                className={cn(
                  "text-base font-bold tabular-nums",
                  timeToNextDraw === "DRAW LIVE" && "text-terminal-positive animate-pulse"
                )}
              >
                {timeToNextDraw}
              </span>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-terminal-textSecondary">Currency</span>
              <CurrencySelector />
            </div>

            {/* Live Status */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-positive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-positive"></span>
                </span>
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide">
                  Live Data
                </span>
              </div>
              <div className="text-xs text-terminal-textMuted">
                {new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="https://i.ibb.co/8gPPNMxd/shfl-pro-logo.png"
                alt="SHFL Pro"
                className="w-8 h-8 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight">
                    SHFL<span className="text-terminal-accent">Pro</span>
                  </h1>
                  <InfoTooltip content={TOOLTIPS.shfl} title="What is SHFL?" />
                </div>
                <p className="text-[10px] text-terminal-textSecondary tracking-wide">
                  TERMINAL v1.0
                </p>
              </div>
            </div>
          </div>

          {/* Center: Live Stats */}
          <div className="flex items-center gap-6">
            {/* SHFL/USDC Price Ticker */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Activity 
                  className={cn(
                    "w-3.5 h-3.5",
                    isPriceUpdating ? "text-terminal-accent animate-pulse" : "text-terminal-textMuted"
                  )} 
                />
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide">
                  SHFL/USDC
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    isPriceUpdating && "price-update text-terminal-accent"
                  )}
                >
                  ${displayPrice.toFixed(4)}
                </span>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                    isPositive
                      ? "text-terminal-positive bg-terminal-positive/10"
                      : "text-terminal-negative bg-terminal-negative/10"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-terminal-border" />

            {/* Next Draw Countdown */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-terminal-textMuted" />
                <span className="text-xs text-terminal-textSecondary uppercase tracking-wide">
                  Next Draw
                </span>
                <InfoTooltip content={TOOLTIPS.lottery} title="Weekly Lottery" />
              </div>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  timeToNextDraw === "DRAW LIVE" && "text-terminal-positive animate-pulse"
                )}
              >
                {timeToNextDraw}
              </span>
            </div>
          </div>

          {/* Right: Status & Currency */}
          <div className="flex items-center gap-3">
            <CurrencySelector />
            <div className="w-px h-5 bg-terminal-border" />
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-positive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-positive"></span>
              </span>
              <span className="text-xs text-terminal-textSecondary uppercase tracking-wide">
                Live
              </span>
            </div>
            <div className="text-xs text-terminal-textMuted">
              {new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
