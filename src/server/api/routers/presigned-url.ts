import { eq } from "drizzle-orm";
// DB TABLES
import { parsingTaskTable } from "@/server/db/schema";
// UTILS
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// SCHEMAS
import {
  GetResultFileUrlInput,
  GetTaskFileUploadUrlInput,
  GetTaskFileUploadUrlOutput,
} from "@/lib/schema";
import type { BucketFileInfoType } from "@/lib/types";
import { createId } from "@paralleldrive/cuid2";
import { ACCEPTED_ARCHIVE_TYPES } from "@/constants";
import { getBucketFilePrefix } from "@/lib/utils";

export const presignedUrlRouter = createTRPCRouter({
  getTaskFileUploadUrl: protectedProcedure
    .input(GetTaskFileUploadUrlInput)
    .output(GetTaskFileUploadUrlOutput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { taskId, bucketName, filesMetadata } = input;

      const bucketFilesInfo: BucketFileInfoType[] = await Promise.all(
        filesMetadata.map(async (file) => {
          const fileName = `${createId()}-${file.originalName}`;
          const isArchiveFile = ACCEPTED_ARCHIVE_TYPES.includes(
            file.contentType,
          );

          const filePrefix = getBucketFilePrefix(file.contentType);
          const filePath = isArchiveFile
            ? `${userId}/${taskId}/${fileName}`
            : `${userId}/${taskId}/${filePrefix}/${fileName}`;

          const presignedUrl = await ctx.s3.createUploadUrl({
            bucketName,
            fileName: filePath,
          });

          return {
            filePath,
            fileName,
            originalName: file.originalName,
            size: file.size,
            contentType: file.contentType,
            bucketName,
            presignedUrl,
          };
        }),
      );

      return {
        bucketFilesInfo,
      };
    }),

  getSheetDownloadUrl: protectedProcedure
    .input(GetResultFileUrlInput)
    .mutation(async ({ ctx, input }) => {
      const parsingTask = await ctx.db.query.parsingTaskTable.findFirst({
        where: eq(parsingTaskTable.id, input.taskId),
      });

      if (!parsingTask) {
        throw new Error("Parsing task not found");
      }

      const sheetFilePath = parsingTask.sheetFilePath ?? "";

      const downloadUrl = await ctx.s3.createDownloadUrl({
        bucketName: "aggregated-results",
        fileName: sheetFilePath,
      });

      return downloadUrl;
    }),

  getJsonDownloadUrl: protectedProcedure
    .input(GetResultFileUrlInput)
    .mutation(async ({ ctx, input }) => {
      const parsingTask = await ctx.db.query.parsingTaskTable.findFirst({
        where: eq(parsingTaskTable.id, input.taskId),
      });

      if (!parsingTask) {
        throw new Error("Parsing task not found");
      }

      const jsonFilePath = parsingTask.jsonFilePath ?? "";

      const downloadUrl = await ctx.s3.createDownloadUrl({
        bucketName: "aggregated-results",
        fileName: jsonFilePath,
      });

      return downloadUrl;
    }),
});
