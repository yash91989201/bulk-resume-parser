import * as z from "zod/v4";

export const BaseFieldConfigSchema = z.object({
  key: z.string(),
  label: z
    .string()
    .min(4, { error: "Min. length 6 letters" })
    .regex(/^[a-zA-Z0-9 _-]+$/, {
      error:
        "Label may include letters, numbers, spaces, underscores, or hyphens—no other special characters.",
    })
    .transform((lbl) => lbl.trim()),
});

export const ExtractionConfigV0Schema = z.object({
  version: z.literal("v0"),
  name: z.literal("Simple Config"),
  description: z.literal("Basic resume extraction config"),
  fields: z
    .array(
      BaseFieldConfigSchema.extend({
        prompt: z.string().min(12, { error: "Min. length 12 letters" }),
        example: z.string().min(12, { error: "Min. length 12 letters" }),
      }),
    )
    .min(1, { error: "Config should have at least 1 field spec" }),
});

export const ExtractionConfigV0FormSchema = z.object({
  name: z.string(),
  config: ExtractionConfigV0Schema,
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
    section_headers: z.array(z.string()),
    extraction_strategy: z.enum(["first_occurrence", "most_recent"]).optional(),
  }),
});

export const CustomDetectionRuleSchema = z.object({
  type: z.literal("custom"),
  rule: z.object({
    prompt: z.string(),
  }),
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
  rule: z.object({
    prompt: z.string(),
  }),
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
  rule: z.object({
    prompt: z.string(),
  }),
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
  required: z.boolean(),
  default_value: z.string(),
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
}).refine(
  (data) => {
    if (data.required) {
      return data.default_value.length >= 4;
    }
    return true;
  },
  {
    message:
      "Default value must be at least 4 characters long for required fields.",
    path: ["default_value"],
  },
);

export const ExtractionConfigV1Schema = z.object({
  version: z.literal("v1"),
  name: z.literal("Detailed Config"),
  description: z.literal("Detailed resume extraction config"),
  fields: z.array(FieldConfigSchema),
});

export const ExtractionConfigV1FormSchema = z.object({
  name: z.string(),
  config: ExtractionConfigV1Schema,
});

export const ExtractionConfigSchema = z.discriminatedUnion("version", [
  ExtractionConfigV0Schema,
  ExtractionConfigV1Schema,
]);

export const ExtractionConfigInputSchema = z.object({
  name: z.string(),
  config: ExtractionConfigSchema,
});
