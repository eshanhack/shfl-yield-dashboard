"use client";

import { cn } from "@/lib/utils";
import { Trophy, DollarSign, Coins } from "lucide-react";

export type DashboardSection = "lottery" | "revenue" | "token";

interface SectionSelectorProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
}

const sections: { id: DashboardSection; label: string; shortLabel: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: "lottery", 
    label: "Lottery", 
    shortLabel: "Lottery",
    icon: <Trophy className="w-4 h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5" />,
    description: "Yield & Staking"
  },
  { 
    id: "revenue", 
    label: "Revenue", 
    shortLabel: "Revenue",
    icon: <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5" />,
    description: "Shuffle Financials"
  },
  { 
    id: "token", 
    label: "Token", 
    shortLabel: "Token",
    icon: <Coins className="w-4 h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5" />,
    description: "SHFL vs Market"
  },
];

export default function SectionSelector({ activeSection, onSectionChange }: SectionSelectorProps) {
  return (
    <nav 
      className="bg-terminal-card border border-terminal-border rounded-lg p-1 sm:p-1.5 lg:p-1.5 xl:p-2 mb-4 sm:mb-6 lg:mb-6"
      role="tablist"
      aria-label="Dashboard sections"
    >
      <div className="flex gap-0.5 sm:gap-1 lg:gap-1.5 xl:gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`${section.id}-panel`}
            tabIndex={activeSection === section.id ? 0 : -1}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 px-2 sm:px-4 lg:px-4 xl:px-5 py-2.5 sm:py-3 lg:py-3 xl:py-3.5 rounded-md lg:rounded-lg transition-all duration-200",
              "min-h-[44px] sm:min-h-[48px] lg:min-h-[52px] xl:min-h-[56px] focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-card",
              activeSection === section.id
                ? "bg-terminal-accent/20 border border-terminal-accent/50 text-terminal-accent shadow-glow-sm"
                : "hover:bg-terminal-border/50 text-terminal-textSecondary hover:text-terminal-text border border-transparent"
            )}
          >
            <span className={cn(
              "p-1 sm:p-1.5 lg:p-1.5 xl:p-2 rounded-md transition-colors flex-shrink-0",
              activeSection === section.id 
                ? "bg-terminal-accent/30" 
                : "bg-terminal-border/50"
            )}>
              {section.icon}
            </span>
            
            {/* Mobile: Short label only */}
            <span className="sm:hidden text-xs font-semibold">{section.shortLabel}</span>
            
            {/* Tablet+: Full layout */}
            <div className="text-left hidden sm:block">
              <div className={cn(
                "text-sm lg:text-base xl:text-base font-semibold",
                activeSection === section.id ? "text-terminal-accent" : ""
              )}>
                {section.label}
              </div>
              <div className="text-[10px] lg:text-xs xl:text-xs text-terminal-textMuted hidden md:block">
                {section.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}
