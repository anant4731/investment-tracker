import { NextResponse } from "next/server";
import crypto from "crypto";

const API_KEY = process.env.BINANCE_API_KEY!;
const API_SECRET = process.env.BINANCE_API_SECRET!;
const FUTURES_BASE_URL = "https://fapi.binance.com";

type FuturesAsset = {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  crossWalletBalance: string;
};

type FuturesAccountResponse = {
  assets: FuturesAsset[];
};

export async function GET() {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha256", API_SECRET)
      .update(queryString)
      .digest("hex");

    const url = `${FUTURES_BASE_URL}/fapi/v2/account?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data: FuturesAccountResponse = await response.json();

    const usdt = data.assets.find((a) => a.asset === "USDT");

    if (!usdt) {
      throw new Error("USDT balance not found");
    }

    const walletBalance = parseFloat(usdt.walletBalance);
    const unrealizedProfit = parseFloat(usdt.unrealizedProfit);
    const totalValue = walletBalance + unrealizedProfit;

    return NextResponse.json({
      success: true,
      totalValueUSDT: parseFloat(totalValue.toFixed(2)),
    });
  } catch (error) {
    console.error("Binance Futures Total Value Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Binance Futures total value",
        error: message,
      },
      { status: 500 }
    );
  }
}
