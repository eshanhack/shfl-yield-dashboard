"use client";

import { useEffect, useState, useRef } from "react";

interface LoadingBarProps {
  isLoading: boolean;
}

export default function LoadingBar({ isLoading }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>();

  useEffect(() => {
    let hideTimer: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(0);
      
      // High-speed progress animation using RAF for smoothness
      let startTime = performance.now();
      const duration = 2000; // 2 seconds to reach 90%
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        // Ease out cubic for fast start, slow finish
        const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
        setProgress(easedProgress * 90);
        
        if (rawProgress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      
      rafRef.current = requestAnimationFrame(animate);
    } else if (visible) {
      // Complete the progress quickly
      setProgress(100);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(hideTimer);
    };
  }, [isLoading, visible]);

  if (!visible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] bg-transparent overflow-hidden pointer-events-none"
      style={{ 
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-terminal-accent via-purple-400 to-terminal-accent"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 8px var(--terminal-accent)",
          transition: progress === 100 ? "width 150ms ease-out" : "none",
          willChange: "width",
          transform: "translateZ(0)", // Force GPU layer
        }}
      />
    </div>
  );
}
