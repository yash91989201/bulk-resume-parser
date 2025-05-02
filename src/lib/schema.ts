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
        estimatedTimeRemaining: z.number().optional(),
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

export const BaseFieldConfigSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
});

export const ExtractionConfigV0Schema = z.object({
  version: z.literal("v0"),
  name: z.literal("Simple Config"),
  description: z.literal("Basic resume extraction config"),
  fields: z.array(
    BaseFieldConfigSchema.extend({
      prompt: z.string(),
      example: z.string(),
    }),
  ),
});

export const RegexDetectionRuleSchema = z.object({
  type: z.literal("regex"),
  rule: z.object({
    pattern: z.string(),
    flags: z.string().optional(),
    target: z.enum(["all", "first", "last"]).optional(),
    group: z.number().int().optional(),
  }),
});

export const KeywordDetectionRuleSchema = z.object({
  type: z.literal("keyword"),
  rule: z.object({
    keywords: z.array(z.string()),
    context_window: z.number().int().optional(),
    strategy: z.enum(["proximity", "section"]).optional(),
  }),
});

export const SectionDetectionRuleSchema = z.object({
  type: z.literal("section"),
  rule: z.object({
    section_header: z.array(z.string()),
    extraction_strategy: z.enum(["first_occurrence", "most_recent"]).optional(),
  }),
});

export const CustomDetectionRuleSchema = z.object({
  type: z.literal("custom"),
  rule: z.string(),
});

export const DetectionRuleSchema = z.discriminatedUnion("type", [
  RegexDetectionRuleSchema,
  KeywordDetectionRuleSchema,
  SectionDetectionRuleSchema,
  CustomDetectionRuleSchema,
]);

export const RegexValidationRuleSchema = z.object({
  type: z.literal("regex"),
  rule: z.object({
    pattern: z.string(),
    error_message: z.string().optional(),
  }),
});

export const LengthValidationRuleSchema = z.object({
  type: z.literal("length"),
  rule: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    error_message: z.string().optional(),
  }),
});

export const AllowedValuesValidationRuleSchema = z.object({
  type: z.literal("allowed_values"),
  rule: z.object({
    values: z.array(z.any()),
    case_sensitive: z.boolean().optional(),
  }),
});

export const CustomValidationRuleSchema = z.object({
  type: z.literal("custom"),
  rule: z.string(),
});

export const ValidationRuleSchema = z.discriminatedUnion("type", [
  RegexValidationRuleSchema,
  LengthValidationRuleSchema,
  AllowedValuesValidationRuleSchema,
  CustomValidationRuleSchema,
]);

export const RegexReplaceSanitizationRuleSchema = z.object({
  type: z.literal("regex_replace"),
  rule: z.object({
    pattern: z.string(),
    replacement: z.string(),
    flags: z.string().optional(),
  }),
});

export const TrimSanitizationRuleSchema = z.object({
  type: z.literal("trim"),
  rule: z.object({
    characters: z.string().optional(),
  }),
});

export const FormatSanitizationRuleSchema = z.object({
  type: z.literal("format"),
  rule: z.object({
    template: z.string(),
    components: z.record(z.string(), z.string()),
  }),
});

export const CustomSanitizationRuleSchema = z.object({
  type: z.literal("custom"),
  rule: z.string(),
});

export const SanitizationRuleSchema = z.discriminatedUnion("type", [
  RegexReplaceSanitizationRuleSchema,
  TrimSanitizationRuleSchema,
  FormatSanitizationRuleSchema,
  CustomSanitizationRuleSchema,
]);

export const OutputNormalizationMappingSchema = z.object({
  source: z.array(z.any()),
  target: z.any(),
});

export const FieldOutputSchema = z.object({
  data_type: z.enum(["string", "number", "array", "object"]),
  format: z.enum(["email", "phone", "url", "text", "custom"]).optional(),
  cardinality: z.enum(["single", "multiple"]).optional(),
  examples: z.array(z.string()).optional(),
  normalization: z
    .object({
      type: z.literal("mapping"),
      rule: OutputNormalizationMappingSchema,
    })
    .optional(),
});

export const FieldConfigSchema = BaseFieldConfigSchema.extend({
  description: z.string().optional(),
  note: z.string().optional(),
  required: z.boolean().optional(),
  default_value: z.any().optional(),
  detection_schema: z
    .object({
      rules: z.array(DetectionRuleSchema),
    })
    .optional(),
  validation_schema: z
    .object({
      rules: z.array(ValidationRuleSchema),
    })
    .optional(),
  sanitization_schema: z
    .object({
      rules: z.array(SanitizationRuleSchema),
    })
    .optional(),
  output_schema: FieldOutputSchema.optional(),
});

export const ExtractionConfigV1Schema = z.object({
  version: z.literal("v1"),
  name: z.literal("Detailed Config"),
  description: z.literal("Detailed resume extraction config"),
  fields: z.array(FieldConfigSchema),
});

export const ExtractionConfigSchema = z.discriminatedUnion("version", [
  ExtractionConfigV0Schema,
  ExtractionConfigV1Schema,
]);

export const ExtractionConfigFormSchema = z.object({
  name: z.string(),
  config: ExtractionConfigSchema,
});
