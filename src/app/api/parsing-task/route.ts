import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
// UTILS
import { db } from "@/server/db";
// DB TABLES
import { parsingTaskTable } from "@/server/db/schema";
// SCHEMAS
import { ParsingTaskUpdateSchema } from "@/lib/schema";
// TYPES
import type { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (taskId === null) {
      throw new Error("taskId required in query param");
    }

    const parsingTask = await db.query.parsingTaskTable.findFirst({
      where: eq(parsingTaskTable.id, taskId),
    });

    return NextResponse.json(
      {
        status: "SUCCESS",
        message: "parsing task found",
        data: { parsingTask },
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

export const PATCH = async (req: NextRequest) => {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (taskId === null) {
      throw new Error("task_id required in query param");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await req.json();
    const reqJsonValidation = ParsingTaskUpdateSchema.safeParse(body);

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

    const updateQueryRes = await db
      .update(parsingTaskTable)
      .set(reqJsonValidation.data)
      .where(eq(parsingTaskTable.id, taskId));

    if (updateQueryRes[0].affectedRows === 0) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: "failed to update parsing task 0 affected rows",
        },
        { status: 200 },
      );
    }

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
