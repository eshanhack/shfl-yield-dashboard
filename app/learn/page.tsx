"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LearnPage from "@/components/LearnPage";
import GridBackground from "@/components/GridBackground";
import { fetchLotteryStats, fetchSHFLPrice } from "@/lib/api";

export default function LearnRoute() {
  const router = useRouter();
  const [nextDrawTimestamp, setNextDrawTimestamp] = useState<number | undefined>();
  const [shflPrice, setShflPrice] = useState<number | undefined>();
  const [totalTickets, setTotalTickets] = useState<number | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [stats, price] = await Promise.all([
          fetchLotteryStats(),
          fetchSHFLPrice()
        ]);
        setNextDrawTimestamp(stats.nextDrawTimestamp);
        setShflPrice(price.usd);
        setTotalTickets(stats.totalTickets);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  const handleBack = () => {
    router.push("/");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center">
        <GridBackground intensity="medium" interactive={false} />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-terminal-textSecondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-black relative">
      <GridBackground intensity="medium" interactive={true} />
      <div className="relative z-10">
        <LearnPage 
          onBack={handleBack} 
          nextDrawTimestamp={nextDrawTimestamp} 
          shflPrice={shflPrice}
          totalTickets={totalTickets}
        />
      </div>
    </div>
  );
}

