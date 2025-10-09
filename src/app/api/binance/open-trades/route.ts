import { NextResponse } from "next/server";
import crypto from "crypto";

const API_KEY = process.env.BINANCE_API_KEY!;
const API_SECRET = process.env.BINANCE_API_SECRET!;
const FUTURES_BASE_URL = "https://fapi.binance.com";

type FuturesPosition = {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  positionSide: string;
};

export async function GET() {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha256", API_SECRET)
      .update(queryString)
      .digest("hex");

    const url = `${FUTURES_BASE_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data: FuturesPosition[] = await response.json();

    // Filter out only open positions (non-zero amount)
    const openPositions = data
      .filter((p) => parseFloat(p.positionAmt) !== 0)
      .map((p, index) => {
        const amount = Math.abs(parseFloat(p.positionAmt));
        const avgBuyPrice = parseFloat(p.entryPrice);
        const currentPrice = parseFloat(p.markPrice);
        const profit = parseFloat(p.unRealizedProfit);
        const isProfit = profit >= 0;

        return {
          id: index + 1,
          symbol: p.symbol.replace("USDT", ""),
          name: p.symbol.replace("USDT", ""),
          amount,
          avgBuyPrice,
          currentPrice,
          profit,
          profitPercent:
            ((profit / (amount * avgBuyPrice)) * 100).toFixed(2) + "%",
          color: isProfit
            ? "from-green-500 to-emerald-600"
            : "from-red-500 to-red-600",
          icon: p.symbol.startsWith("BTC")
            ? "₿"
            : p.symbol.startsWith("ETH")
            ? "Ξ"
            : "◎",
        };
      });

    return NextResponse.json(openPositions);
  } catch (error) {
    console.error("Binance Open Trades Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Binance open futures trades",
        error: message,
      },
      { status: 500 }
    );
  }
}
