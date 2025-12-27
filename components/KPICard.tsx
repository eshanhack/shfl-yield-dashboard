"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  variant?: "default" | "accent" | "positive" | "negative";
  size?: "default" | "large";
  className?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  variant = "default",
  size = "default",
  className,
}: KPICardProps) {
  const variantStyles = {
    default: "border-terminal-border",
    accent: "border-terminal-accent/50 shadow-glow-sm",
    positive: "border-terminal-positive/30",
    negative: "border-terminal-negative/30",
  };

  const valueStyles = {
    default: "text-terminal-text",
    accent: "text-terminal-accent text-glow",
    positive: "text-terminal-positive",
    negative: "text-terminal-negative",
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return Minus;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const TrendIcon = getTrendIcon();
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <div
      className={cn(
        "bg-terminal-card border rounded-lg p-4 card-glow transition-all",
        variantStyles[variant],
        size === "large" && "p-6",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded bg-terminal-accent/10 border border-terminal-accent/20">
              <Icon className="w-4 h-4 text-terminal-accent" />
            </div>
          )}
          <span className="text-xs text-terminal-textSecondary uppercase tracking-wide font-medium">
            {title}
          </span>
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
              isPositiveChange && "text-terminal-positive bg-terminal-positive/10",
              isNegativeChange && "text-terminal-negative bg-terminal-negative/10",
              !isPositiveChange && !isNegativeChange && "text-terminal-textMuted bg-terminal-border/50"
            )}
          >
            <TrendIcon className="w-3 h-3" />
            <span>
              {isPositiveChange && "+"}
              {change.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className={cn("mb-1", size === "large" && "mb-2")}>
        <span
          className={cn(
            "font-bold tabular-nums",
            size === "default" ? "text-2xl" : "text-4xl",
            valueStyles[variant]
          )}
        >
          {value}
        </span>
      </div>

      {(subtitle || changeLabel) && (
        <div className="flex items-center gap-2">
          {subtitle && (
            <span className="text-xs text-terminal-textMuted">{subtitle}</span>
          )}
          {changeLabel && (
            <span className="text-xs text-terminal-textSecondary">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

