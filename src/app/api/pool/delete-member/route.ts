// src/app/api/pool/delete-member/route.ts
import { NextResponse } from "next/server";
import { ddbDocClient } from "@/lib/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "investment-tracker";

// ---------------- Types ----------------
type Member = {
  id: string;
  name: string;
  shares: number;
  initialInvestment: number;
};

type PoolData = {
  members: Member[];
  totalShares: number;
  currentValue: number;
};

type DBItem = {
  id: string;
  poolData: PoolData;
};

// ---------------- Handler ----------------
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 });
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

    const dbItem = result.Item as DBItem;
    const poolData = dbItem.poolData;

    // Filter out the member
    const updatedMembers = poolData.members.filter((m: Member) => m.id !== id);

    if (updatedMembers.length === poolData.members.length) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Recalculate totals
    const totalShares = updatedMembers.reduce((sum, m) => sum + m.shares, 0);
    const currentValue = poolData.currentValue ?? 0;

    // Update DynamoDB
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...dbItem,
          poolData: {
            ...poolData,
            members: updatedMembers,
            totalShares,
            currentValue,
          },
        },
      })
    );

    return NextResponse.json({
      success: true,
      message: `Member with id ${id} deleted successfully`,
      poolData: { members: updatedMembers, totalShares, currentValue },
    });
  } catch (err) {
    console.error("Error deleting member:", err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
