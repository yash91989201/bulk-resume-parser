import { NextResponse } from "next/server";
// UTILS
import { db } from "@/server/db";
// DB TABLES
import { parseableFileTable } from "@/server/db/schema";
// SCHEMAS
import { ParseableFilesInsertSchema } from "@/lib/schema";
// TYPES
import type { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await req.json();
    const reqJsonValidation = ParseableFilesInsertSchema.safeParse(body);

    if (!reqJsonValidation.success) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: "Invalid json body",
          error: reqJsonValidation.error,
        },
        { status: 422 },
      );
    }

    const parseableFiles = reqJsonValidation.data.parseableFiles;
    const parseableFilesInsertQuery = await db
      .insert(parseableFileTable)
      .values(parseableFiles);

    if (parseableFilesInsertQuery[0].affectedRows !== parseableFiles.length) {
      throw new Error("Some or all parseable files not updated in db");
    }

    return NextResponse.json(
      {
        status: "SUCCESS",
        message: "All parseable files for the task added in db",
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { status: "FAILED", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { status: "FAILED", message: "Unknown error occurred" },
      { status: 500 },
    );
  }
};
