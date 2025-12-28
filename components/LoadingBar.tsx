"use client";

import { useEffect, useState } from "react";

interface LoadingBarProps {
  isLoading: boolean;
}

export default function LoadingBar({ isLoading }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(0);
      
      // Simulate progress
      const incrementProgress = () => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          // Slow down as we approach 90%
          const increment = Math.max(1, (90 - prev) / 10);
          return Math.min(90, prev + increment);
        });
        timer = setTimeout(incrementProgress, 200);
      };
      
      incrementProgress();
    } else {
      // Complete the progress
      setProgress(100);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-transparent overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-terminal-accent via-purple-400 to-terminal-accent transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 10px var(--terminal-accent), 0 0 20px var(--terminal-accent)",
        }}
      />
    </div>
  );
}

