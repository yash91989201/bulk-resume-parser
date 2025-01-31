import * as z from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
// DB TABLES
import { parsingTaskTable, parseableFileTable } from "@/server/db/schema";
import { ACCEPTED_FILE_TYPES } from "@/constants";

// DB TABLES SCHEMAS
export const ParsingTaskSchema = createSelectSchema(parsingTaskTable);
export const ParseableFileSchema = createSelectSchema(parseableFileTable);

// DB TABLES INSERT SCHEMA
export const ParsingTaskInsertSchema = createInsertSchema(parsingTaskTable);
export const ParseableFileInsertSchema = createInsertSchema(parseableFileTable);
export const ParseableFilesInsertSchema = z.object({
  parseableFiles: z.array(ParseableFileInsertSchema),
});

// DB TABLES UPDATE SCHEMA
export const ParsingTaskUpdateSchema = createUpdateSchema(parsingTaskTable);
export const ParseableFileUpdateSchema = createUpdateSchema(parseableFileTable);

// FORM SCHEMAS
export const StartParsingInput = z.object({
  taskId: z.string(),
  extractFromArchive: z.boolean(),
});

export const ParsingTaskFormSchema = z.object({
  taskName: z.string().min(6, { message: "Min. 6 chars" }),
  taskFilesState: z
    .array(
      z.object({
        file: z.instanceof(File),
        progress: z.union([
          z.literal("PENDING"),
          z.literal("COMPLETE"),
          z.literal("ERROR"),
          z.number().min(0).max(100),
        ]),
      }),
    )
    .min(1, "At least one file is required")
    .refine((files) => {
      const allNonArchiveFiles = files.every(({ file }) =>
        ACCEPTED_FILE_TYPES.FILES.includes(file.type),
      );

      const allArchiveFiles = files.every(({ file }) =>
        ACCEPTED_FILE_TYPES.ARCHIVE_FILES.includes(file.type),
      );

      return allNonArchiveFiles || allArchiveFiles;
    }, "Files must be either a list of images, PDFs, Word documents, or a list of archive files (but not a mix of both)."),
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

export const CreatePresignedUrlApiInput = z.object({
  filesMetadata: z.array(FileMetadataSchema),
});

export const CreateParsingTaskInput = z.object({
  taskName: z.string(),
  totalFiles: z.number().optional(),
});

// AUTH SCHEMAS
export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export const SignupSchema = z
  .object({
    name: z.string(),
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
