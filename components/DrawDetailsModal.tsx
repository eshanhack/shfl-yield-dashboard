"use client";

import React, { useState, useEffect } from "react";
import { X, Trophy, Users, DollarSign, Loader2, Award, Target, Zap } from "lucide-react";
import { formatUSD } from "@/lib/calculations";

interface PrizeData {
  category: string;
  amount: number;
  winCount: number;
  win: number;
}

interface DrawDetails {
  drawNumber: number;
  date: string;
  prizePool: number;
  jackpotted: number;
  ngrAdded: number;
  singlesAdded: number;
  prizepoolSplit: string;
  totalNGRContribution: number;
  prizes?: PrizeData[];
  jackpotAmount?: number;
  totalWinners?: number;
  totalPaidOut?: number;
}

interface DrawDetailsModalProps {
  drawNumber: number | null;
  onClose: () => void;
}

const PRIZE_CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  JACKPOT: { label: "Jackpot", icon: <Trophy className="h-4 w-4" />, color: "text-yellow-400" },
  SECOND_PRIZE: { label: "Division 2", icon: <Award className="h-4 w-4" />, color: "text-orange-400" },
  THIRD_PRIZE: { label: "Division 3", icon: <Award className="h-4 w-4" />, color: "text-orange-300" },
  FOURTH_PRIZE: { label: "Division 4", icon: <Target className="h-4 w-4" />, color: "text-blue-400" },
  FIFTH_PRIZE: { label: "Division 5", icon: <Target className="h-4 w-4" />, color: "text-blue-300" },
  SIXTH_PRIZE: { label: "Division 6", icon: <Zap className="h-4 w-4" />, color: "text-green-400" },
  SEVENTH_PRIZE: { label: "Division 7", icon: <Zap className="h-4 w-4" />, color: "text-green-300" },
  EIGHTH_PRIZE: { label: "Division 8", icon: <Zap className="h-4 w-4" />, color: "text-gray-400" },
  NINTH_PRIZE: { label: "Division 9", icon: <Zap className="h-4 w-4" />, color: "text-gray-300" },
};

const PRIZE_ORDER = [
  "JACKPOT",
  "SECOND_PRIZE",
  "THIRD_PRIZE",
  "FOURTH_PRIZE",
  "FIFTH_PRIZE",
  "SIXTH_PRIZE",
  "SEVENTH_PRIZE",
  "EIGHTH_PRIZE",
  "NINTH_PRIZE",
];

export default function DrawDetailsModal({ drawNumber, onClose }: DrawDetailsModalProps) {
  const [details, setDetails] = useState<DrawDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!drawNumber) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/lottery-history?drawId=${drawNumber}`);
        const data = await response.json();

        if (data.success && data.draw) {
          setDetails(data.draw);
        } else {
          setError("Failed to fetch draw details");
        }
      } catch (err) {
        setError("Error loading draw details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [drawNumber]);

  if (!drawNumber) return null;

  const sortedPrizes = details?.prizes?.sort((a, b) => {
    return PRIZE_ORDER.indexOf(a.category) - PRIZE_ORDER.indexOf(b.category);
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#FF5500]/50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF5500]/20 p-2 rounded-lg">
              <Trophy className="h-6 w-6 text-[#FF5500]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono">Draw #{drawNumber}</h2>
              {details && (
                <p className="text-gray-400 text-sm">
                  {new Date(details.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#FF5500] animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Pool</p>
                  <p className="text-white font-mono text-lg">{formatUSD(details.prizePool)}</p>
                </div>
                <div className="bg-black border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">NGR Added</p>
                  <p className="text-[#FF5500] font-mono text-lg">{formatUSD(details.ngrAdded)}</p>
                </div>
                <div className="bg-black border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Singles Added</p>
                  <p className="text-orange-300 font-mono text-lg">{formatUSD(details.singlesAdded)}</p>
                </div>
                <div className="bg-black border border-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Jackpotted</p>
                  <p className="text-yellow-400 font-mono text-lg">{formatUSD(details.jackpotted)}</p>
                </div>
              </div>

              {/* Prize Split */}
              <div className="bg-black border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Prize Pool Split</p>
                <div className="flex flex-wrap gap-2">
                  {details.prizepoolSplit.split("-").map((split, index) => (
                    <span
                      key={index}
                      className="bg-[#FF5500]/20 text-[#FF5500] px-3 py-1 rounded text-sm font-mono"
                    >
                      Div {index + 1}: {split}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Prize Breakdown */}
              {sortedPrizes && sortedPrizes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#FF5500]" />
                    Prize Breakdown
                  </h3>
                  <div className="bg-black border border-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="text-left text-gray-400 text-xs uppercase tracking-wide px-4 py-3">Division</th>
                          <th className="text-right text-gray-400 text-xs uppercase tracking-wide px-4 py-3">Pool Amount</th>
                          <th className="text-right text-gray-400 text-xs uppercase tracking-wide px-4 py-3">Winners</th>
                          <th className="text-right text-gray-400 text-xs uppercase tracking-wide px-4 py-3">Prize/Winner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {sortedPrizes.map((prize) => {
                          const info = PRIZE_CATEGORY_LABELS[prize.category] || {
                            label: prize.category,
                            icon: <Zap className="h-4 w-4" />,
                            color: "text-gray-400",
                          };
                          const prizePerWinner = prize.winCount > 0 ? prize.amount / prize.winCount : prize.amount;
                          
                          return (
                            <tr key={prize.category} className="hover:bg-gray-900/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={info.color}>{info.icon}</span>
                                  <span className={`font-medium ${info.color}`}>{info.label}</span>
                                </div>
                              </td>
                              <td className="text-right px-4 py-3 font-mono text-white">
                                {formatUSD(prize.amount)}
                              </td>
                              <td className="text-right px-4 py-3">
                                <span className={`font-mono ${prize.winCount > 0 ? "text-green-400" : "text-gray-500"}`}>
                                  {prize.winCount}
                                </span>
                              </td>
                              <td className="text-right px-4 py-3 font-mono text-gray-300">
                                {prize.winCount > 0 ? formatUSD(prizePerWinner) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-900/50 border-t border-gray-700">
                        <tr>
                          <td className="px-4 py-3 font-semibold text-white">Total</td>
                          <td className="text-right px-4 py-3 font-mono text-[#FF5500] font-bold">
                            {formatUSD(sortedPrizes.reduce((sum, p) => sum + p.amount, 0))}
                          </td>
                          <td className="text-right px-4 py-3 font-mono text-green-400 font-bold">
                            {details.totalWinners || sortedPrizes.reduce((sum, p) => sum + p.winCount, 0)}
                          </td>
                          <td className="text-right px-4 py-3 font-mono text-gray-300">
                            {formatUSD(details.totalPaidOut || sortedPrizes.reduce((sum, p) => sum + p.win, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {sortedPrizes && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <p className="text-yellow-400 text-sm font-medium">Jackpot</p>
                    </div>
                    <p className="text-white font-mono text-xl font-bold">
                      {formatUSD(details.jackpotAmount || 0)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {sortedPrizes.find(p => p.category === "JACKPOT")?.winCount === 0 ? "Not Won" : "Won!"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-[#FF5500]/10 to-orange-600/5 border border-[#FF5500]/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-[#FF5500]" />
                      <p className="text-[#FF5500] text-sm font-medium">Total Winners</p>
                    </div>
                    <p className="text-white font-mono text-xl font-bold">
                      {details.totalWinners || sortedPrizes.reduce((sum, p) => sum + p.winCount, 0)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      across all divisions
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

