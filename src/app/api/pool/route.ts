import { NextResponse } from "next/server";
import crypto from "crypto";
import { ddbDocClient } from "@/lib/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

const BINANCE_API_KEY = process.env.BINANCE_API_KEY!;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET!;
const FUTURES_BASE_URL = "https://fapi.binance.com";
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME || "investment-tracker";

// Strongly typed interfaces
interface BinanceAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
}

interface BinanceAccountData {
  assets: BinanceAsset[];
}

interface PoolMember {
  name: string;
  contribution: number;
  profitShare: number;
}

interface PoolData {
  members: PoolMember[];
  totalPool: number;
}

interface PoolResponse {
  data: PoolData;
}

export async function GET() {
  try {
    // Run both in parallel
    const [binanceRes, poolRes] = await Promise.all([
      fetchBinanceData(),
      fetchPoolData(),
    ]);

    // Combine & compute any derived fields
    const combined = {
      success: true,
      totalValueUSDT: binanceRes.totalValueUSDT,
      poolData: poolRes.data,
      timestamp: new Date().toISOString(),
      portfolioValue: (poolRes.data?.totalPool ?? 0) + (binanceRes.totalValueUSDT ?? 0),
    };

    return NextResponse.json(combined);
  } catch (error) {
    console.error("Combined API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Failed to fetch combined data", error: message },
      { status: 500 }
    );
  }
}

async function fetchBinanceData(): Promise<{ totalValueUSDT: number }> {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto
    .createHmac("sha256", BINANCE_API_SECRET)
    .update(queryString)
    .digest("hex");

  const url = `${FUTURES_BASE_URL}/fapi/v2/account?${queryString}&signature=${signature}`;
  const response = await fetch(url, {
    headers: { "X-MBX-APIKEY": BINANCE_API_KEY },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Binance API error: ${err}`);
  }

  const data: BinanceAccountData = await response.json();

  const usdtAsset = data.assets.find((a) => a.asset === "USDT");
  if (!usdtAsset) throw new Error("USDT balance not found");

  const walletBalance = parseFloat(usdtAsset.walletBalance);
  const unrealizedProfit = parseFloat(usdtAsset.unrealizedProfit);
  const totalValue = walletBalance + unrealizedProfit;

  return { totalValueUSDT: parseFloat(totalValue.toFixed(2)) };
}

async function fetchPoolData(): Promise<PoolResponse> {
  const response = await ddbDocClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: "personalUser" },
    })
  );

  if (!response.Item) {
    throw new Error("Pool data not found");
  }

  return { data: response.Item.poolData as PoolData };
}
