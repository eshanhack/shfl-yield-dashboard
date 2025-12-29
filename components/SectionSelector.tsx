"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    icon: <Trophy className="w-4 h-4" />,
    description: "Yield & Staking"
  },
  { 
    id: "revenue", 
    label: "Revenue", 
    shortLabel: "Revenue",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Shuffle Financials"
  },
  { 
    id: "token", 
    label: "Token", 
    shortLabel: "Token",
    icon: <Coins className="w-4 h-4" />,
    description: "SHFL vs Market"
  },
];

export default function SectionSelector({ activeSection, onSectionChange }: SectionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Calculate indicator position based on active tab
  useEffect(() => {
    if (!containerRef.current) return;
    
    const activeIndex = sections.findIndex(s => s.id === activeSection);
    const buttons = containerRef.current.querySelectorAll('button');
    const activeButton = buttons[activeIndex];
    
    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeSection]);

  return (
    <nav 
      className="bg-terminal-card border border-terminal-border rounded-lg p-1 sm:p-1.5"
      role="tablist"
      aria-label="Dashboard sections"
    >
      <div ref={containerRef} className="flex gap-0.5 sm:gap-1 lg:gap-1.5 relative">
        {/* Sliding indicator */}
        <motion.div
          className="absolute top-0 bottom-0 bg-terminal-accent/20 border border-terminal-accent/50 rounded-md pointer-events-none"
          style={{
            boxShadow: "0 0 12px rgba(138, 43, 226, 0.3)",
          }}
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
        
        {sections.map((section) => (
          <motion.button
            key={section.id}
            onClick={() => {
              if (activeSection !== section.id) {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
              onSectionChange(section.id);
            }}
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`${section.id}-panel`}
            tabIndex={activeSection === section.id ? 0 : -1}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 lg:px-5 py-2.5 sm:py-3 rounded-md",
              "min-h-[44px] sm:min-h-[48px] focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-card",
              "transition-colors duration-200",
              activeSection === section.id
                ? "text-terminal-accent"
                : "hover:bg-terminal-border/50 text-terminal-textSecondary hover:text-terminal-text"
            )}
          >
            <span className={cn(
              "p-1 sm:p-1.5 rounded-md transition-colors flex-shrink-0",
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
                "text-sm font-semibold",
                activeSection === section.id ? "text-terminal-accent" : ""
              )}>
                {section.label}
              </div>
              <div className="text-[10px] text-terminal-textMuted hidden md:block">
                {section.description}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </nav>
  );
}
