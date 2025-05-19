import type * as z from "zod";
import type {
  LoginSchema,
  SignupSchema,
  ParseableFileSchema,
  ParseableFileInsertSchema,
  ParsingTaskSchema,
  ParsingTaskInsertSchema,
  ParsingTaskUpdateSchema,
  ParseableFileUpdateSchema,
  ParsingTaskFormSchema,
  FileMetadataSchema,
  BucketFileInfoSchema,
  S3BucketSchema,
} from "./schema";

// DB TABLES TYPES
export type ParsingTaskType = z.infer<typeof ParsingTaskSchema>;
export type ParseableFileType = z.infer<typeof ParseableFileSchema>;

// DB TABLES INSERT TYPES
export type ParsingTaskInsertType = z.infer<typeof ParsingTaskInsertSchema>;
export type ParseableFileInsertType = z.infer<typeof ParseableFileInsertSchema>;

// DB TABLES INSERT TYPES
export type ParsingTaskUpdateType = z.infer<typeof ParsingTaskUpdateSchema>;
export type ParseableFileUpdateType = z.infer<typeof ParseableFileUpdateSchema>;

// FORM TYPES
export type ParsingTaskFormType = z.infer<typeof ParsingTaskFormSchema>;

// OTHER TYPES
export type FileMetadataType = z.infer<typeof FileMetadataSchema>;
export type BucketFileInfoType = z.infer<typeof BucketFileInfoSchema>;

// AUTH TYPES
export type LoginType = z.infer<typeof LoginSchema>;
export type SignupType = z.infer<typeof SignupSchema>;

export type S3BucketType = z.infer<typeof S3BucketSchema>;
