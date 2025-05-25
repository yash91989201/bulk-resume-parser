// UTILS
import { publishToQueue } from "@/server/utils";
import { parsingTaskTable } from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// SCHEMAS
import {
  CreateParsingTaskInput,
  StartParsingInput,
  DeleteParsingTaskInput,
} from "@/lib/schema";
// CONSTANTS
import { QUEUES } from "@/constants";
import { eq } from "drizzle-orm";

export const parsingTaskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateParsingTaskInput)
    .mutation(
      async ({
        ctx,
        input,
      }): Promise<ProcedureStatusType<{ taskId: string }>> => {
        try {
          const insertQueryRes = await ctx.db
            .insert(parsingTaskTable)
            .values({
              userId: ctx.session.user.id,
              taskName: input.taskName,
              totalFiles: input.totalFiles,
              extractionConfigId: input.extractionConfigId,
            })
            .$returningId();

          const insertedId = insertQueryRes[0]?.id;
          if (insertedId === undefined) {
            return {
              status: "FAILED",
              message: "Unable to create task",
            };
          }

          return {
            status: "SUCCESS",
            message: "Parsing task created",
            data: {
              taskId: insertedId,
            },
          };
        } catch (error) {
          if (error instanceof Error) {
            return {
              status: "FAILED",
              message: error.message,
            };
          }
          return {
            status: "FAILED",
            message: "Unknown error occurred",
          };
        }
      },
    ),

  startParsing: protectedProcedure
    .input(StartParsingInput)
    .mutation(async ({ ctx, input }) => {
      const queueName = input.extractFromArchive
        ? QUEUES.EXTRACT_ARCHIVE
        : QUEUES.CONVERSION_DIRECTOR;

      const isSuccess = await publishToQueue({
        queueName,
        message: JSON.stringify({
          userId: ctx.session.user.id,
          taskId: input.taskId,
        }),
      });

      if (isSuccess) {
        return {
          status: "SUCCESS",
          message: "Started parsing files",
        };
      }
      return {
        status: "FAILED",
        message: "Failed to parse files",
      };
    }),

  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.parsingTaskTable.findMany();
  }),

  delete: protectedProcedure
    .input(DeleteParsingTaskInput)
    .mutation(async ({ ctx, input }) => {
      const deleteQuery = await ctx.db
        .delete(parsingTaskTable)
        .where(eq(parsingTaskTable.id, input.taskId));

      if (deleteQuery[0].affectedRows === 0) {
        return {
          status: "FAILED",
          message: "Query failed",
        };
      }

      return {
        status: "SUCCESS",
        message: "Parsing task deleted",
      };
    }),
});
