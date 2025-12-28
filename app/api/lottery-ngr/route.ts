import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Scraper server URL (on Render, this would be the internal service URL or external URL)
const SCRAPER_URL = process.env.SCRAPER_URL || "http://localhost:3001";

interface NGRResult {
  drawNumber: number;
  success: boolean;
  ngrAdded?: number;
  currentTotalPrizes?: number;
  previousTotalPrizes?: number;
  previousPayouts?: number;
  previousRollover?: number;
  breakdown?: {
    formula: string;
    result: string;
  };
  error?: string;
}

interface ScraperResponse {
  success: boolean;
  results: NGRResult[];
  scrapedAt?: string;
  error?: string;
}

/**
 * Fetch NGR data from the scraper service
 */
async function fetchNGRFromScraper(draws: number[]): Promise<ScraperResponse> {
  try {
    const drawsParam = draws.join(",");
    const response = await fetch(`${SCRAPER_URL}/api/lottery-ngr?draws=${drawsParam}`, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Scraper returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from scraper:", error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Alternative: Use Shuffle GraphQL API directly (faster, more reliable)
 */
async function fetchNGRFromGraphQL(draws: number[]): Promise<ScraperResponse> {
  const LOTTERY_GRAPHQL_ENDPOINT = "https://shuffle.com/main-api/graphql/lottery/graphql-lottery";
  
  const GET_PRIZES_QUERY = `query getPrizesAndResults($drawId: Float) {
    prizesAndResults(drawId: $drawId) {
      category
      currency
      amount
      winCount
      win
      __typename
    }
  }`;

  const results: NGRResult[] = [];
  const prizeCache: Map<number, { totalPrizes: number; totalPayouts: number }> = new Map();

  // Fetch prizes for all needed draws (target + previous)
  const allDrawsNeeded = new Set<number>();
  for (const draw of draws) {
    allDrawsNeeded.add(draw);
    allDrawsNeeded.add(draw - 1);
  }

  // Batch fetch prizes
  const fetchPromises = Array.from(allDrawsNeeded).map(async (drawId) => {
    try {
      const response = await fetch(LOTTERY_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://shuffle.com",
          "Referer": "https://shuffle.com/lottery",
        },
        body: JSON.stringify({
          operationName: "getPrizesAndResults",
          query: GET_PRIZES_QUERY,
          variables: { drawId },
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        console.error(`Failed to fetch prizes for draw ${drawId}: ${response.status}`);
        return;
      }

      const data = await response.json();
      const prizes = data.data?.prizesAndResults;

      if (!prizes || !Array.isArray(prizes)) {
        console.error(`No prize data for draw ${drawId}`);
        return;
      }

      // Calculate totals
      const totalPrizes = prizes.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
      const totalPayouts = prizes.reduce((sum: number, p: any) => sum + (p.win || 0), 0);

      prizeCache.set(drawId, { totalPrizes, totalPayouts });
    } catch (error) {
      console.error(`Error fetching prizes for draw ${drawId}:`, error);
    }
  });

  await Promise.all(fetchPromises);

  // Calculate NGR for each requested draw
  for (const drawNumber of draws) {
    const current = prizeCache.get(drawNumber);
    const previous = prizeCache.get(drawNumber - 1);

    if (!current || !previous) {
      results.push({
        drawNumber,
        success: false,
        error: `Missing data for draw ${drawNumber} or ${drawNumber - 1}`,
      });
      continue;
    }

    // NGR = Current prizes - (Previous prizes - Previous payouts)
    const previousRollover = previous.totalPrizes - previous.totalPayouts;
    const ngrAdded = current.totalPrizes - previousRollover;

    results.push({
      drawNumber,
      success: true,
      ngrAdded: Math.round(ngrAdded),
      currentTotalPrizes: Math.round(current.totalPrizes),
      previousTotalPrizes: Math.round(previous.totalPrizes),
      previousPayouts: Math.round(previous.totalPayouts),
      previousRollover: Math.round(previousRollover),
      breakdown: {
        formula: `NGR = CurrentPrizes - (PrevPrizes - PrevPayouts)`,
        result: `NGR = $${current.totalPrizes.toLocaleString()} - ($${previous.totalPrizes.toLocaleString()} - $${previous.totalPayouts.toLocaleString()}) = $${Math.round(ngrAdded).toLocaleString()}`,
      },
    });
  }

  return {
    success: true,
    results,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/lottery-ngr
 * 
 * Query params:
 *   - draws: comma-separated draw numbers (e.g., "60,61,62")
 *   - method: "graphql" (default) or "scraper"
 * 
 * Returns calculated NGR for each draw based on prize pool differences
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const drawsParam = searchParams.get("draws");
  const method = searchParams.get("method") || "graphql";

  if (!drawsParam) {
    return NextResponse.json({
      success: false,
      error: "Missing 'draws' parameter",
      usage: "/api/lottery-ngr?draws=60,61,62",
      example: "/api/lottery-ngr?draws=64",
    }, { status: 400 });
  }

  // Parse draw numbers
  const draws = drawsParam
    .split(",")
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n > 1);

  if (draws.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No valid draw numbers provided",
    }, { status: 400 });
  }

  let result: ScraperResponse;

  if (method === "scraper") {
    // Use Puppeteer scraper (slower but works if GraphQL is down)
    result = await fetchNGRFromScraper(draws);
  } else {
    // Use GraphQL API (faster, preferred)
    result = await fetchNGRFromGraphQL(draws);
  }

  return NextResponse.json({
    ...result,
    method,
    explanation: {
      formula: "NGR Added = Current Draw Total Prizes - (Previous Draw Total Prizes - Previous Draw Payouts)",
      note: "This calculates how much new NGR was added to the prize pool between draws",
      source: method === "scraper" 
        ? "Scraped from shuffle.com/lottery via Puppeteer" 
        : "Shuffle GraphQL API (prizesAndResults)",
    },
  });
}

