import { eq } from "drizzle-orm";
// DB TABLES
import { parsingTaskTable } from "@/server/db/schema";
// UTILS
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
// SCHEMAS
import { GetResultFileUrlInput, GetTaskFileUploadUrlInput } from "@/lib/schema";
import type { BucketFileInfoType } from "@/lib/types";
import { createId } from "@paralleldrive/cuid2";
import { ACCEPTED_ARCHIVE_TYPES } from "@/constants";
import { getBucketFilePrefix } from "@/lib/utils";
import {
  InitiateMultipartUploadInput,
  GetMultipartUploadUrlInput,
  CompleteMultipartUploadInput,
  AbortMultipartUploadInput,
} from "@/lib/schema";

export const presignedUrlRouter = createTRPCRouter({
  getTaskFileUploadUrl: protectedProcedure
    .input(GetTaskFileUploadUrlInput)
    .mutation(async ({ ctx, input }) => {
      try {
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
          status: "SUCCESS",
          message: "File upload url for task is created",
          data: { bucketFilesInfo },
        };
      } catch (error) {
        console.log(error);
        return {
          status: "FAILED",
          message: "Failed to create file upload url",
        };
      }
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

  // Multipart upload endpoints
  initiateMultipartUpload: protectedProcedure
    .input(InitiateMultipartUploadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const { bucketName, filePath } = input;

        const uploadId = await ctx.s3.initiateMultipartUpload({
          bucketName,
          fileName: filePath,
        });

        return {
          status: "SUCCESS" as const,
          message: "Multipart upload initiated",
          data: { uploadId },
        };
      } catch (error) {
        console.error(error);
        return {
          status: "FAILED" as const,
          message: "Failed to initiate multipart upload",
        };
      }
    }),

  getMultipartUploadUrl: protectedProcedure
    .input(GetMultipartUploadUrlInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const { bucketName, fileName, uploadId, partNumber } = input;

        const presignedUrl = await ctx.s3.createMultipartUploadUrl({
          bucketName,
          fileName,
          uploadId,
          partNumber,
        });

        return {
          status: "SUCCESS" as const,
          message: "Presigned URL created",
          data: { presignedUrl, partNumber },
        };
      } catch (error) {
        console.error(error);
        return {
          status: "FAILED" as const,
          message: "Failed to create presigned URL",
        };
      }
    }),

  completeMultipartUpload: protectedProcedure
    .input(CompleteMultipartUploadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const { bucketName, fileName, uploadId, parts } = input;

        await ctx.s3.completeMultipartUpload({
          bucketName,
          fileName,
          uploadId,
          parts,
        });

        return {
          status: "SUCCESS" as const,
          message: "Multipart upload completed",
        };
      } catch (error) {
        console.error(error);
        return {
          status: "FAILED" as const,
          message: "Failed to complete multipart upload",
        };
      }
    }),

  abortMultipartUpload: protectedProcedure
    .input(AbortMultipartUploadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const { bucketName, fileName, uploadId } = input;

        await ctx.s3.abortMultipartUpload({
          bucketName,
          fileName,
          uploadId,
        });

        return {
          status: "SUCCESS" as const,
          message: "Multipart upload aborted",
        };
      } catch (error) {
        console.error(error);
        return {
          status: "FAILED" as const,
          message: "Failed to abort multipart upload",
        };
      }
    }),
});
