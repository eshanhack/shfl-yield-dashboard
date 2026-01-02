import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const SHUFFLE_API = "https://shuffle.com/main-api/graphql/api/graphql";

const TOKEN_INFO_QUERY = `query tokenInfo {
  tokenInfo {
    priceInUsd
    twentyFourHourPercentageChange
    __typename
  }
}`;

export async function GET() {
  try {
    // Try Shuffle API first (most accurate)
    const shuffleRes = await fetch(SHUFFLE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        operationName: "tokenInfo",
        query: TOKEN_INFO_QUERY,
        variables: {},
      }),
      cache: "no-store",
    });

    if (shuffleRes.ok) {
      const data = await shuffleRes.json();
      const tokenInfo = data?.data?.tokenInfo;
      
      if (tokenInfo?.priceInUsd) {
        return NextResponse.json({
          success: true,
          price: {
            usd: parseFloat(tokenInfo.priceInUsd),
            usd_24h_change: parseFloat(tokenInfo.twentyFourHourPercentageChange) || 0,
          },
          source: "shuffle",
          timestamp: Date.now(),
        }, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    }

    // Fallback to CoinGecko
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=shuffle-2&vs_currencies=usd&include_24hr_change=true",
      { cache: "no-store" }
    );

    if (cgRes.ok) {
      const cgData = await cgRes.json();
      const shflData = cgData?.["shuffle-2"];
      
      if (shflData?.usd) {
        return NextResponse.json({
          success: true,
          price: {
            usd: shflData.usd,
            usd_24h_change: shflData.usd_24h_change || 0,
          },
          source: "coingecko",
          timestamp: Date.now(),
        }, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    }

    // If both fail, return error (NOT fake data)
    return NextResponse.json({
      success: false,
      error: "Unable to fetch price from any source",
      timestamp: Date.now(),
    }, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Price fetch failed",
      timestamp: Date.now(),
    }, {
      status: 500,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}

