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
  ExtractionConfigFormSchema,
  ExtractionConfigSchema,
  ExtractionConfigV0Schema,
  ExtractionConfigV1Schema,
  FieldConfigSchema,
  DetectionRuleSchema,
  ValidationRuleSchema,
  SanitizationRuleSchema,
  FieldOutputSchema,
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

export type ExtractionConfigType = z.infer<typeof ExtractionConfigSchema>;
export type FieldConfigV1Type = z.infer<typeof FieldConfigSchema>;
export type DetectionRuleType = z.infer<typeof DetectionRuleSchema>;
export type ValidationRuleType = z.infer<typeof ValidationRuleSchema>;
export type SanitizationRuleType = z.infer<typeof SanitizationRuleSchema>;
export type FieldOutputSchemaType = z.infer<typeof FieldOutputSchema>;
export type ExtractionConfigV0Type = z.infer<typeof ExtractionConfigV0Schema>;
export type ExtractionConfigV1Type = z.infer<typeof ExtractionConfigV1Schema>;
export type ExtractionConfigFormType = z.infer<
  typeof ExtractionConfigFormSchema
>;

// OTHER TYPES
export type FileMetadataType = z.infer<typeof FileMetadataSchema>;
export type BucketFileInfoType = z.infer<typeof BucketFileInfoSchema>;

// AUTH TYPES
export type LoginType = z.infer<typeof LoginSchema>;
export type SignupType = z.infer<typeof SignupSchema>;
