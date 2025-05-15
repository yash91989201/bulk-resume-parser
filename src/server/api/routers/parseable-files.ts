import { ParseableFilesInputSchema } from "@/lib/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { parseableFileTable } from "@/server/db/schema";

export const parseableFilesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(ParseableFilesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const insertQueryRes = await ctx.db
        .insert(parseableFileTable)
        .values(input.parseableFiles);

      if (insertQueryRes[0].affectedRows !== input.parseableFiles.length) {
        return {
          status: "FAILED",
          message: "Some or all parseable files not updated in db",
        };
      }

      return {
        status: "SUCCESS",
        message: "Parseable files added to db",
      };
    }),
});
