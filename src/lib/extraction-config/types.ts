import type { z } from "zod";
import type {
  FieldConfigSchema,
  DetectionRuleSchema,
  ValidationRuleSchema,
  SanitizationRuleSchema,
  FieldOutputSchema,
  ExtractionConfigV0Schema,
  ExtractionConfigV0FormSchema,
  ExtractionConfigV1Schema,
  ExtractionConfigInputSchema,
  ExtractionConfigSchema,
  ExtractionConfigV1FormSchema,
} from "./schema";

export type FieldConfigV1Type = z.infer<typeof FieldConfigSchema>;
export type DetectionRuleType = z.infer<typeof DetectionRuleSchema>;
export type ValidationRuleType = z.infer<typeof ValidationRuleSchema>;
export type SanitizationRuleType = z.infer<typeof SanitizationRuleSchema>;
export type FieldOutputSchemaType = z.infer<typeof FieldOutputSchema>;
export type ExtractionConfigV0Type = z.infer<typeof ExtractionConfigV0Schema>;
export type ExtractionConfigV0FormType = z.infer<
  typeof ExtractionConfigV0FormSchema
>;
export type ExtractionConfigV1FormType = z.infer<
  typeof ExtractionConfigV1FormSchema
>;
export type ExtractionConfigV1Type = z.infer<typeof ExtractionConfigV1Schema>;
export type ExtractionConfigInputType = z.infer<
  typeof ExtractionConfigInputSchema
>;
export type ExtractionConfigType = z.infer<typeof ExtractionConfigSchema>;
