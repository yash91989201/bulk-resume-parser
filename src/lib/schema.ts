import * as z from "zod/v4";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
// DB TABLES
import { parsingTaskTable, parseableFileTable } from "@/server/db/schema";
import {
  ACCEPTED_FILE_TYPES,
  ACCEPTED_ARCHIVE_TYPES,
  TASK_FILE_UPLOAD_SIZE,
} from "@/constants";
import { formatFileSize } from "./utils";

// DB TABLES SCHEMAS
export const ParsingTaskSchema = createSelectSchema(parsingTaskTable);
export const ParseableFileSchema = createSelectSchema(parseableFileTable);

// DB TABLES INSERT SCHEMA
export const ParsingTaskInsertSchema = createInsertSchema(parsingTaskTable);
export const ParseableFileInsertSchema = createInsertSchema(parseableFileTable);
export const ParseableFilesInputSchema = z.object({
  parseableFiles: z.array(ParseableFileInsertSchema),
});

// DB TABLES UPDATE SCHEMA
export const ParsingTaskUpdateSchema = createUpdateSchema(parsingTaskTable);
export const ParseableFileUpdateSchema = createUpdateSchema(parseableFileTable);

export const DeleteParsingTaskInput = z.object({
  taskId: z.cuid2(),
});

export const DeleteExtractionConfigInput = z.object({
  configId: z.cuid2(),
});

export const S3BucketSchema = z.enum([
  "aggregated-results",
  "archive-files",
  "parseable-files",
  "processed-txt-files",
  "processed-json-files",
]);

export const BaseProcedureOutputSchema = z.object({
  status: z.enum(["SUCCESS", "FAILED"]),
  error: z.string(),
});

// FORM SCHEMAS
export const StartParsingInput = z.object({
  taskId: z.string(),
  extractFromArchive: z.boolean(),
});

export const ParsingTaskFormSchema = z.object({
  taskName: z.string().min(6, { error: "Min. 6 chars" }),
  extractionConfigId: z.cuid2({
    error: "Select Extraction Config",
  }),
  taskFiles: z
    .array(
      z.object({
        file: z.instanceof(File),
        progress: z.union([
          z.literal("PENDING"),
          z.literal("COMPLETE"),
          z.literal("ERROR"),
          z.number().min(0).max(100),
        ]),
        estimatedTimeRemaining: z.number().optional(),
      }),
    )
    .min(1, "At least one file is required")
    .refine((files) => {
      const allNonArchiveFiles = files.every(({ file }) =>
        ACCEPTED_FILE_TYPES.includes(file.type),
      );

      const allArchiveFiles = files.every(({ file }) =>
        ACCEPTED_ARCHIVE_TYPES.includes(file.type),
      );

      return allNonArchiveFiles || allArchiveFiles;
    }, "Files must be either a list of images, PDFs, Word documents, or a list of archive files (but not a mix of both).")
    .refine(
      (files) => {
        return (
          files.reduce((acc, { file }) => acc + file.size, 0) <
          TASK_FILE_UPLOAD_SIZE
        );
      },
      `Files size cannot exceed ${formatFileSize(TASK_FILE_UPLOAD_SIZE)}`,
    ),
});

// OTHER SCHEMAS
export const FileMetadataSchema = z.object({
  originalName: z.string(),
  contentType: z.string(),
  size: z.number(),
});

export const BucketFileInfoSchema = FileMetadataSchema.extend({
  bucketName: z.string(),
  fileName: z.string(),
  filePath: z.string(),
  presignedUrl: z.string(),
});

export const GetTaskFileUploadUrlInput = z.object({
  taskId: z.cuid2(),
  bucketName: S3BucketSchema,
  filesMetadata: z.array(FileMetadataSchema),
});

export const GetTaskFileUploadUrlOutput = z.object({
  bucketFilesInfo: z.array(BucketFileInfoSchema),
});

export const CreateParsingTaskInput = z.object({
  taskName: z.string(),
  totalFiles: z.number().optional(),
  extractionConfigId: z.cuid2({ error: "Extraction Config Required" }),
});

// AUTH SCHEMAS
export const LoginSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  password: z
    .string()
    .min(6, { error: "Password must be at least 6 characters" }),
});

export const SignupSchema = z
  .object({
    name: z.string(),
    email: z.email({ error: "Invalid email address" }),
    password: z
      .string()
      .min(6, { error: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const GetResultFileUrlInput = z.object({
  taskId: z.cuid2(),
});
