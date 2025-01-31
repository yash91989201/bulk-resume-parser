// UTILS
import { publishToQueue } from "@/server/utils";
import { parsingTaskTable } from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// SCHEMAS
import { CreateParsingTaskInput, StartParsingInput } from "@/lib/schema";
// CONSTANTS
import { QUEUES } from "@/constants";

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
});
