"use client";

import { cn } from "@/lib/utils";
import { Trophy, DollarSign, Coins } from "lucide-react";

export type DashboardSection = "lottery" | "revenue" | "token";

interface SectionSelectorProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
}

const sections: { id: DashboardSection; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: "lottery", 
    label: "Lottery", 
    icon: <Trophy className="w-4 h-4" />,
    description: "Yield & Staking Analytics"
  },
  { 
    id: "revenue", 
    label: "Revenue", 
    icon: <DollarSign className="w-4 h-4" />,
    description: "Shuffle.com Financials"
  },
  { 
    id: "token", 
    label: "Token", 
    icon: <Coins className="w-4 h-4" />,
    description: "SHFL vs Market"
  },
];

export default function SectionSelector({ activeSection, onSectionChange }: SectionSelectorProps) {
  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg p-1.5 mb-6">
      <div className="flex gap-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all duration-200",
              activeSection === section.id
                ? "bg-terminal-accent/20 border border-terminal-accent/50 text-terminal-accent shadow-glow-sm"
                : "hover:bg-terminal-border/50 text-terminal-textSecondary hover:text-terminal-text border border-transparent"
            )}
          >
            <span className={cn(
              "p-1.5 rounded-md transition-colors",
              activeSection === section.id 
                ? "bg-terminal-accent/30" 
                : "bg-terminal-border/50"
            )}>
              {section.icon}
            </span>
            <div className="text-left hidden sm:block">
              <div className={cn(
                "text-sm font-semibold",
                activeSection === section.id ? "text-terminal-accent" : ""
              )}>
                {section.label}
              </div>
              <div className="text-[10px] text-terminal-textMuted">
                {section.description}
              </div>
            </div>
            <span className="sm:hidden text-sm font-semibold">{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

