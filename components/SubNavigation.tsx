"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { DashboardSection } from "./SectionSelector";

interface SectionConfig {
  id: string;
  label: string;
  shortLabel?: string; // For mobile
}

// Section configurations per tab
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
  const [isSticky, setIsSticky] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const sections = SECTION_CONFIGS[activeSection];

  // Set up intersection observer to track visible sections
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Small delay to let DOM update after tab switch
    const timeout = setTimeout(() => {
      const sectionElements = sections
        .map(s => document.getElementById(s.id))
        .filter(Boolean) as HTMLElement[];

      if (sectionElements.length === 0) return;

      // Track which sections are visible and their positions
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

          // Find the section closest to top of viewport
          if (visibleSections.size > 0) {
            let closestId = "";
            let closestDistance = Infinity;
            
            visibleSections.forEach((top, id) => {
              const distance = Math.abs(top - 150); // 150px from top is "active zone"
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

      // Set initial active section
      if (sectionElements[0]) {
        setActiveId(sectionElements[0].id);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      observerRef.current?.disconnect();
    };
  }, [activeSection, sections]);

  // Track sticky state
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -120; // Account for sticky header + sub-nav
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
      
      setActiveId(sectionId);
    }
  };

  return (
    <div
      ref={navRef}
      className={cn(
        // Sticky positioning - use relative wrapper approach
        "sticky top-0 z-40 mb-4 sm:mb-5",
        // GPU acceleration
        "will-change-transform transform-gpu"
      )}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* Inner container with negative margins for full-width background */}
      <div
        className={cn(
          "-mx-3 sm:-mx-4 lg:-mx-8 xl:-mx-12 px-3 sm:px-4 lg:px-8 xl:px-12",
          "transition-all duration-200",
          // Always use solid black background to match page - no gap possible
          "bg-terminal-black",
          isSticky 
            ? "border-b border-terminal-border/50 py-2 shadow-lg" 
            : "py-1"
        )}
        style={{
          // Extend background 2px below to cover any sub-pixel gaps
          paddingBottom: isSticky ? "calc(0.5rem + 2px)" : "calc(0.25rem + 2px)",
          marginBottom: "-2px",
        }}
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-terminal-textMuted uppercase tracking-wider mr-2 flex-shrink-0 hidden sm:block">
          Jump to:
        </span>
        <div className="flex items-center gap-1">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap",
                "hover:bg-terminal-accent/10 hover:text-terminal-accent",
                activeId === section.id
                  ? "bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30"
                  : "text-terminal-textSecondary border border-transparent"
              )}
            >
              <span className="sm:hidden">{section.shortLabel || section.label}</span>
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

