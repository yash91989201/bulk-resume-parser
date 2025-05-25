import { db } from "@/server/db";
import { parsingTaskTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (taskId === null) {
      throw new Error("taskId is required in search params");
    }

    const task = await db.query.parsingTaskTable.findFirst({
      where: eq(parsingTaskTable.id, taskId), // Ensure taskId is of the correct type for parsingTaskTable.id
      with: {
        extractionConfig: true,
      },
    });

    if (!task) {
      return new Response("Task not found", { status: 404 });
    }

    if (!task.extractionConfig) {
      throw new Error("Extraction config not found for the task");
    }

    return NextResponse.json(
      {
        status: "SUCCESS",
        message: "Extraction config found",
        data: { prompt: task.extractionConfig.prompt },
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
