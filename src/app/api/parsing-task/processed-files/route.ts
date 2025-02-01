import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
// UTILS
import { db } from "@/server/db";
// DB TABLES
import { parsingTaskTable } from "@/server/db/schema";
// SCHEMAS
import { ParsingTaskUpdateSchema } from "@/lib/schema";
// TYPES
import type { NextRequest } from "next/server";

export const PATCH = async (req: NextRequest) => {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (taskId === null) {
      throw new Error("task_id required in query param");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await req.json();
    const reqJsonValidation = ParsingTaskUpdateSchema.pick({
      processedFiles: true,
    }).safeParse(body);

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

    const processedFiles = reqJsonValidation.data.processedFiles;

    if (processedFiles === undefined) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: "Provide the count of processed files",
          error: reqJsonValidation.error,
        },
        { status: 422 },
      );
    }

    await db.execute(sql`
      UPDATE ${parsingTaskTable}
        SET ${parsingTaskTable.processedFiles} = ${parsingTaskTable.processedFiles} + ${processedFiles}
      WHERE ${parsingTaskTable.id} = ${taskId}
    `);

    return NextResponse.json(
      { status: "SUCCESS", message: "parsing task updated" },
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
