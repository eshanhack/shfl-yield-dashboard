import { NextResponse } from "next/server";

export interface LotteryDrawData {
  drawNumber: number;
  date: string;
  prizePool: number;
  jackpotted: number;
  ngrAdded: number;
  singlesAdded: number;
  prizepoolSplit: string;
  // Calculated: Total NGR contribution = ngrAdded + (singlesAdded * 0.85)
  totalNGRContribution: number;
}

// Real lottery history data from https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history
const LOTTERY_HISTORY_DATA: LotteryDrawData[] = [
  // Latest draws first (reversed from the table which shows latest at bottom)
  { drawNumber: 62, date: "2025-12-19", prizePool: 1263612, jackpotted: 1064670, ngrAdded: 173555, singlesAdded: 29042, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 61, date: "2025-12-12", prizePool: 3103837, jackpotted: 33626, ngrAdded: 1201151, singlesAdded: 53543, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 60, date: "2025-12-05", prizePool: 3333438, jackpotted: 2845173, ngrAdded: 205120, singlesAdded: 55062, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 59, date: "2025-11-28", prizePool: 3259985, jackpotted: 2846781, ngrAdded: 431594, singlesAdded: 48357, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 58, date: "2025-11-21", prizePool: 3187332, jackpotted: 2686090, ngrAdded: 525537, singlesAdded: 59884, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 57, date: "2025-11-14", prizePool: 4474708, jackpotted: 2597636, ngrAdded: 529812, singlesAdded: 728536, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 56, date: "2025-11-07", prizePool: 2985268, jackpotted: 2392337, ngrAdded: 1515179, singlesAdded: 66133, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 55, date: "2025-10-31", prizePool: 2862620, jackpotted: 2161753, ngrAdded: 757382, singlesAdded: 30608, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 54, date: "2025-10-24", prizePool: 2715131, jackpotted: 2156693, ngrAdded: 675318, singlesAdded: 28717, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 53, date: "2025-10-17", prizePool: 2921000, jackpotted: 1939523, ngrAdded: 746891, singlesAdded: 30564, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 52, date: "2025-10-10", prizePool: 2349206, jackpotted: 1766321, ngrAdded: 1124115, singlesAdded: 25551, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 51, date: "2025-10-03", prizePool: 2285434, jackpotted: 1772430, ngrAdded: 551224, singlesAdded: 27957, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 50, date: "2025-09-26", prizePool: 2218722, jackpotted: 1572929, ngrAdded: 684209, singlesAdded: 21593, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 49, date: "2025-09-19", prizePool: 1762270, jackpotted: 1458965, ngrAdded: 738163, singlesAdded: 31651, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 48, date: "2025-09-12", prizePool: 2139778, jackpotted: 1405441, ngrAdded: 325178, singlesAdded: 28020, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 47, date: "2025-09-05", prizePool: 2038851, jackpotted: 1340232, ngrAdded: 771526, singlesAdded: 31859, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 46, date: "2025-08-29", prizePool: 978220, jackpotted: 791317, ngrAdded: 1215675, singlesAdded: 22493, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 45, date: "2025-08-22", prizePool: 965329, jackpotted: 711215, ngrAdded: 244512, singlesAdded: 10931, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 44, date: "2025-08-15", prizePool: 780653, jackpotted: 649242, ngrAdded: 305156, singlesAdded: 17382, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 43, date: "2025-08-08", prizePool: 802680, jackpotted: 545990, ngrAdded: 217282, singlesAdded: 17988, prizepoolSplit: "30-14-8-9-7-6-5-10-11", totalNGRContribution: 0 },
  { drawNumber: 42, date: "2025-08-01", prizePool: 668791, jackpotted: 500692, ngrAdded: 284000, singlesAdded: 13831, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 41, date: "2025-07-25", prizePool: 2902553, jackpotted: 0, ngrAdded: 205672, singlesAdded: 35583, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 40, date: "2025-07-18", prizePool: 2820005, jackpotted: 2535746, ngrAdded: 331224, singlesAdded: 47513, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 39, date: "2025-07-11", prizePool: 2833794, jackpotted: 2473348, ngrAdded: 299144, singlesAdded: 26343, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 38, date: "2025-07-04", prizePool: 2751679, jackpotted: 2496895, ngrAdded: 310556, singlesAdded: 37576, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 37, date: "2025-06-27", prizePool: 2756108, jackpotted: 2440967, ngrAdded: 273135, singlesAdded: 19726, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 36, date: "2025-06-20", prizePool: 2727721, jackpotted: 2424381, ngrAdded: 312001, singlesAdded: 33795, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 35, date: "2025-06-13", prizePool: 2734011, jackpotted: 2408416, ngrAdded: 285511, singlesAdded: 42539, prizepoolSplit: "5-13-9-10-10-10-15-13-15", totalNGRContribution: 0 },
  { drawNumber: 34, date: "2025-06-06", prizePool: 2688982, jackpotted: 2410180, ngrAdded: 281291, singlesAdded: 28009, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 33, date: "2025-05-30", prizePool: 2507473, jackpotted: 2301757, ngrAdded: 359216, singlesAdded: 20031, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 32, date: "2025-05-23", prizePool: 2582343, jackpotted: 2265454, ngrAdded: 221987, singlesAdded: 18323, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 31, date: "2025-05-16", prizePool: 2514187, jackpotted: 2262909, ngrAdded: 301111, singlesAdded: 43086, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
  { drawNumber: 30, date: "2025-05-09", prizePool: 2535255, jackpotted: 2165189, ngrAdded: 305912, singlesAdded: 49750, prizepoolSplit: "15-13-9-9-9-9-15-11-10", totalNGRContribution: 0 },
];

export async function GET() {
  // Calculate totalNGRContribution for each draw
  // Formula: ngrAdded + (singlesAdded * 0.85)
  const drawsWithNGR = LOTTERY_HISTORY_DATA.map(draw => ({
    ...draw,
    totalNGRContribution: draw.ngrAdded + (draw.singlesAdded * 0.85),
  }));

  // Calculate 4-week average NGR (from the latest 4 draws)
  const last4Draws = drawsWithNGR.slice(0, 4);
  const avgWeeklyNGR = last4Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / last4Draws.length;

  // Calculate 12-week average for longer-term view
  const last12Draws = drawsWithNGR.slice(0, 12);
  const avg12WeekNGR = last12Draws.reduce((sum, draw) => sum + draw.totalNGRContribution, 0) / last12Draws.length;

  return NextResponse.json({
    success: true,
    draws: drawsWithNGR,
    stats: {
      avgWeeklyNGR_4week: avgWeeklyNGR,
      avgWeeklyNGR_12week: avg12WeekNGR,
      last4DrawsNGR: last4Draws.map(d => ({
        drawNumber: d.drawNumber,
        ngrAdded: d.ngrAdded,
        singlesAdded: d.singlesAdded,
        totalNGRContribution: d.totalNGRContribution,
      })),
    },
    lastUpdated: new Date().toISOString(),
    source: "https://shfl.shuffle.com/shuffle-token-shfl/tokenomics/lottery-history",
  });
}
