// UTILS
import { extractionConfigTable } from "@/server/db/schema";
import { generateExtractionPrompt } from "@/lib/extraction-config";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// SCHEMAS
import { ExtractionConfigInputSchema } from "@/lib/extraction-config/schema";
import { DeleteExtractionConfigInput } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const extractionConfigRouter = createTRPCRouter({
  create: protectedProcedure
    .input(ExtractionConfigInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const prompt = generateExtractionPrompt(input.config);

        const queryRes = await ctx.db.insert(extractionConfigTable).values({
          name: input.name,
          config: input.config,
          prompt,
          userId: ctx.session.user.id,
        });

        if (queryRes[0].affectedRows === 0) {
          return {
            status: "FAILED",
            message: "Unable to save extraction config",
          };
        }

        return {
          status: "SUCCESS",
          message: "Extraction config saved successfully",
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
          message: "An unknown error occurred",
        };
      }
    }),

  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.extractionConfigTable.findMany();
  }),

  delete: protectedProcedure
    .input(DeleteExtractionConfigInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const deleteQuery = await ctx.db
          .delete(extractionConfigTable)
          .where(eq(extractionConfigTable.id, input.configId));

        if (deleteQuery[0].affectedRows === 0) {
          return {
            status: "FAILED",
            message: "Unable to delete config, 0 rows affected",
          };
        }
        return {
          status: "SUCCESS",
          message: "Extraction config deleted.",
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
          message: "An unknown error occurred",
        };
      }
    }),
});
