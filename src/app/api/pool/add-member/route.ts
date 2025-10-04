// src/app/api/pool/add-member/route.ts
import { NextResponse } from "next/server";
import { ddbDocClient } from "@/lib/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "investment-tracker";

export async function POST(req: Request) {
  try {
    const { id, name, shares, initialInvestment } = await req.json();

    if (!id || !name || !shares || !initialInvestment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch existing pool data
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: "personalUser" },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ error: "Pool data not found" }, { status: 404 });
    }

    const poolData = result.Item.poolData;

    // Add new member
    const updatedMembers = [...poolData.members, { id, name, shares, initialInvestment }];

    // Recalculate totals (optional)
    const totalShares = updatedMembers.reduce((sum, m) => sum + m.shares, 0);
    const currentValue = result.Item.poolData.currentValue ?? 0;

    // Update DynamoDB
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...result.Item,
          poolData: {
            ...poolData,
            members: updatedMembers,
            totalShares,
            currentValue,
          },
        },
      })
    );

    return NextResponse.json({ success: true, poolData: { members: updatedMembers, totalShares, currentValue } });
  } catch (err) {
    console.error("Error adding member:", err);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
