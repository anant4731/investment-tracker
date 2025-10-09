import { NextResponse } from "next/server";

const BASE_URL = "https://fapi.binance.com/fapi/v1/fundingRate";

interface FundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  time: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "1y";

    const symbol = "BTCUSDT";
    const now = Date.now();

    // Map timeframe to duration in milliseconds
    const durations: Record<string, number> = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "1m": 30 * 24 * 60 * 60 * 1000,
      "3m": 90 * 24 * 60 * 60 * 1000,
      "6m": 180 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
      "all": 3 * 365 * 24 * 60 * 60 * 1000, // 3 years (approx)
    };

    const startTime = now - (durations[timeframe] ?? durations["1y"]);

    // Binance limits: 1000 entries max per call
    const url = `${BASE_URL}?symbol=${symbol}&limit=1000&startTime=${startTime}&endTime=${now}`;
    const res = await fetch(url);
    const data: FundingRate[] = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    // Group funding rates by date (YYYY-MM-DD)
    const daily: Record<string, number[]> = {};
    data.forEach((item) => {
      const date = new Date(item.fundingTime).toISOString().split("T")[0];
      if (!daily[date]) daily[date] = [];
      daily[date].push(parseFloat(item.fundingRate));
    });

    // Calculate daily averages
    const result = Object.entries(daily).map(([date, rates]) => ({
      date,
      avgFundingRate: rates.reduce((sum, r) => sum + r, 0) / rates.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Funding Rate Fetch Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
