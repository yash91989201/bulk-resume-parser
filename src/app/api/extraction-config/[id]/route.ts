import { db } from "@/server/db";
import { extractionConfigTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const extractionConfigId = (await params).id;

    const extractionConfig = await db.query.extractionConfigTable.findFirst({
      where: eq(extractionConfigTable.id, extractionConfigId),
    });

    if (!extractionConfig) {
      throw new Error("No extraction config found");
    }

    return NextResponse.json(
      {
        status: "SUCCESS",
        message: "Extraction config found.",
        data: {
          extractionConfig,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        status: "FAILED",
        message: "Unknown error occurred",
      },
      { status: 400 },
    );
  }
};
