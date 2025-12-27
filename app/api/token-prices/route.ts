import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Binance symbols for major tokens
const BINANCE_TOKENS = [
  { symbol: "BTC", binanceSymbol: "BTCUSDT" },
  { symbol: "ETH", binanceSymbol: "ETHUSDT" },
  { symbol: "SOL", binanceSymbol: "SOLUSDT" },
  { symbol: "HYPE", binanceSymbol: "HYPEUSDT" },
];

// CoinGecko tokens (SHFL and RLB not on Binance)
const COINGECKO_TOKENS = [
  { id: "shuffle-2", symbol: "SHFL" },
  { id: "rollbit-coin", symbol: "RLB" },
];

interface PriceData {
  symbol: string;
  prices: [number, number][];
}

// Fetch from Binance Klines API
async function fetchBinanceData(binanceSymbol: string, symbol: string, days: number): Promise<PriceData> {
  try {
    // Calculate interval based on days
    let interval = "1h";
    let limit = days * 24;
    
    if (days <= 1) {
      interval = "5m";
      limit = 288; // 24 hours of 5-min candles
    } else if (days <= 7) {
      interval = "1h";
      limit = days * 24;
    } else if (days <= 30) {
      interval = "4h";
      limit = days * 6;
    } else {
      interval = "1d";
      limit = days;
    }
    
    // Cap limit at 1000 (Binance max)
    limit = Math.min(limit, 1000);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      console.error(`Binance API error for ${symbol}: ${response.status}`);
      return { symbol, prices: [] };
    }

    const data = await response.json();
    
    // Binance klines format: [openTime, open, high, low, close, volume, closeTime, ...]
    // We want [timestamp, closePrice]
    const prices: [number, number][] = data.map((candle: any[]) => [
      candle[0], // openTime (timestamp)
      parseFloat(candle[4]), // close price
    ]);

    return { symbol, prices };
  } catch (error) {
    console.error(`Error fetching ${symbol} from Binance:`, error);
    return { symbol, prices: [] };
  }
}

// Fetch from CoinGecko API
async function fetchCoinGeckoData(tokenId: string, symbol: string, days: number): Promise<PriceData> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "SHFLPro Dashboard",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko API error for ${symbol}: ${response.status}`);
      return { symbol, prices: [] };
    }

    const data = await response.json();
    return {
      symbol,
      prices: data.prices || [],
    };
  } catch (error) {
    console.error(`Error fetching ${symbol} from CoinGecko:`, error);
    return { symbol, prices: [] };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const results: PriceData[] = [];
  let allLive = true;

  // Fetch Binance tokens in parallel
  const binancePromises = BINANCE_TOKENS.map(token => 
    fetchBinanceData(token.binanceSymbol, token.symbol, days)
  );
  
  // Fetch CoinGecko tokens in parallel
  const coingeckoPromises = COINGECKO_TOKENS.map(token =>
    fetchCoinGeckoData(token.id, token.symbol, days)
  );

  // Wait for all requests
  const [binanceResults, coingeckoResults] = await Promise.all([
    Promise.all(binancePromises),
    Promise.all(coingeckoPromises),
  ]);

  // Combine results
  results.push(...binanceResults);
  results.push(...coingeckoResults);

  // Check if any failed
  for (const result of results) {
    if (result.prices.length === 0) {
      allLive = false;
      console.log(`No data for ${result.symbol}`);
    }
  }

  // Sort by preferred order
  const order = ["SHFL", "BTC", "ETH", "SOL", "RLB", "HYPE"];
  results.sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol));

  return NextResponse.json({
    success: true,
    data: results,
    source: allLive ? "live" : "partial",
    lastUpdated: new Date().toISOString(),
  });
}
