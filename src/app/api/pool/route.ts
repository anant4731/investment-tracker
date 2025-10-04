// src/app/api/pool/route.ts
import { NextResponse } from "next/server";
import { ddbDocClient } from "@/lib/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME || "investment-tracker";
console.log("here")
type PoolData = {
  members: {
    name: string;
    contribution: number;
    profitShare: number;
  }[];
  totalPool: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function GET() {
  try {
    const response = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: "personalUser" },
      })
    );

    if (!response.Item) {
      return NextResponse.json(
        { success: false, error: "Pool data not found" },
        { status: 404 }
      );
    }

    const poolData: PoolData = response.Item.poolData;

    return NextResponse.json({ success: true, data: poolData }, { status: 200 });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching pool data:", err);
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch pool data" },
      { status: 500 }
    );
  }
}
