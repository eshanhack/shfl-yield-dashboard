"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardSection } from "./SectionSelector";

interface SectionConfig {
  id: string;
  label: string;
  shortLabel?: string;
}

const SECTION_CONFIGS: Record<DashboardSection, SectionConfig[]> = {
  lottery: [
    { id: "yield-calculator", label: "Yield Calculator", shortLabel: "Calculator" },
    { id: "ngr-chart", label: "NGR vs Price", shortLabel: "Chart" },
    { id: "ticket-ev", label: "Ticket EV", shortLabel: "EV" },
    { id: "sensitivity", label: "Sensitivity Table", shortLabel: "Sensitivity" },
    { id: "jackpot-frequency", label: "Jackpot Frequency", shortLabel: "Jackpot" },
    { id: "lottery-history", label: "Lottery History", shortLabel: "History" },
  ],
  revenue: [
    { id: "shuffle-revenue", label: "Shuffle Revenue", shortLabel: "Revenue" },
    { id: "revenue-analysis", label: "Revenue Analysis", shortLabel: "Analysis" },
    { id: "revenue-chart", label: "Revenue History", shortLabel: "Chart" },
  ],
  token: [
    { id: "price-returns", label: "Price Returns", shortLabel: "Returns" },
    { id: "token-valuation", label: "Token Valuation", shortLabel: "Valuation" },
  ],
};

interface SubNavigationProps {
  activeSection: DashboardSection;
}

export default function SubNavigation({ activeSection }: SubNavigationProps) {
  const [activeId, setActiveId] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  
  const sections = SECTION_CONFIGS[activeSection];

  // Update indicator position
  useEffect(() => {
    if (!containerRef.current || !activeId) return;
    
    const activeIndex = sections.findIndex(s => s.id === activeId);
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
  }, [activeId, sections]);

  // Set up intersection observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const timeout = setTimeout(() => {
      const sectionElements = sections
        .map(s => document.getElementById(s.id))
        .filter(Boolean) as HTMLElement[];

      if (sectionElements.length === 0) return;

      const visibleSections = new Map<string, number>();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visibleSections.set(entry.target.id, entry.boundingClientRect.top);
            } else {
              visibleSections.delete(entry.target.id);
            }
          });

          if (visibleSections.size > 0) {
            let closestId = "";
            let closestDistance = Infinity;
            
            visibleSections.forEach((top, id) => {
              const distance = Math.abs(top - 150);
              if (distance < closestDistance) {
                closestDistance = distance;
                closestId = id;
              }
            });

            if (closestId) {
              setActiveId(closestId);
            }
          }
        },
        {
          rootMargin: "-100px 0px -60% 0px",
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      );

      sectionElements.forEach((el) => {
        observerRef.current?.observe(el);
      });

      if (sectionElements[0]) {
        setActiveId(sectionElements[0].id);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      observerRef.current?.disconnect();
    };
  }, [activeSection, sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -220;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
      
      setActiveId(sectionId);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider mr-2 flex-shrink-0 hidden sm:block">
          Jump to:
        </span>
        <div ref={containerRef} className="flex items-center gap-1 relative">
          {/* Sliding indicator */}
          {indicatorStyle.width > 0 && (
            <motion.div
              className="absolute top-0 bottom-0 bg-terminal-accent/20 border border-terminal-accent/30 rounded-md pointer-events-none"
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
          )}
          
          {sections.map((section) => (
            <motion.button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "relative z-10 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md whitespace-nowrap",
                "hover:bg-terminal-accent/10 hover:text-terminal-accent transition-colors duration-150",
                activeId === section.id
                  ? "text-terminal-accent"
                  : "text-terminal-textSecondary"
              )}
            >
              <span className="sm:hidden">{section.shortLabel || section.label}</span>
              <span className="hidden sm:inline">{section.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
