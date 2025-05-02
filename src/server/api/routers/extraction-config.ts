// UTILS
import { extractionConfigTable } from "@/server/db/schema";
import { generateExtractionPrompt } from "@lib/extraction-config";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// SCHEMAS
import { ExtractionConfigFormSchema } from "@/lib/schema";

export const extractionConfigRouter = createTRPCRouter({
  create: protectedProcedure
    .input(ExtractionConfigFormSchema)
    .mutation(async ({ ctx, input }) => {
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
    }),
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.extractionConfigTable.findMany();
  }),
});
