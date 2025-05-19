import * as z from "zod";
import type {
  DetectionRuleType,
  ExtractionConfigInputType,
  ExtractionConfigV0Type,
  ExtractionConfigV1Type,
  SanitizationRuleType,
  ValidationRuleType,
} from "./types";

export const BaseFieldConfigSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
});

export const fieldConfigLabelToKey = (label: string): string => {
  return (
    label
      .trim()
      .toLowerCase()
      // 1️⃣ replace any whitespace (space, tab, newline) with “_”
      .replace(/\s+/g, "_")
      // 2️⃣ remove everything except letters, digits, or “_”
      .replace(/[^a-z0-9_]/g, "")
      // 3️⃣ collapse multiple underscores into one
      .replace(/_+/g, "_")
      // 3️⃣ collapse multiple hyphens into one
      .replace(/-+/g, "-")
      // 4️⃣ strip leading or trailing underscores
      .replace(/^_+|_+$/g, "")
  );
};

export const generateExtractionPrompt = (
  config: ExtractionConfigInputType["config"],
) => {
  switch (config.version) {
    case "v0":
      return generateV0Prompt(config);
    case "v1":
      return generateV1Prompt(config);
    default:
      return "";
  }
};

const generateV0Prompt = (config: ExtractionConfigV0Type) => {
  // Build core prompt sections
  const role = `
    You are an expert resume data extractor with deep expertise in structured information parsing and data normalization.
  `;

  const context = `
    You will be provided with a resume text that needs precise information extraction according to strict formatting rules.
    The extracted data must maintain professional terminology standards and comply with technical validation requirements.
  `;

  const action = `
    Analyze the resume text with maximum attention to detail and extract specified fields in exact required formats.
    Return ONLY a strictly valid JSON object following all rules and without any explanatory text.
  `;

  const fieldInstructions = config.fields
    .map((field) => {
      const label = field.label ?? field.key;
      return `• ${label}:
   - ${field.prompt}
   - Example: ${field.example ?? "null"}`;
    })
    .join("\n\n");

  const outputFormat = config.fields.reduce(
    (acc, field) => {
      acc[field.key] = "";
      return acc;
    },
    {} as Record<string, string>,
  );

  // Build comprehensive rules section
  const rules = [
    "1. Output MUST be STRICTLY a valid JSON with exact field names from specification with no extra text",
    "2. Validate and normalize ALL values before inclusion",
    "3. Handle ambiguous cases using priority: explicit mentions > contextual inference > null",
    "4. Clean data: Remove special characters, formatting artifacts, and non-printable characters",
    "5. Maintain case sensitivity as specified in field examples",
    "6. Return null for: Missing data, unparseable values, or failed validation",
  ].join("\n");

  return `
Role: ${role}

Context: ${context}

Action: ${action}

INSTRUCTIONS:

EXTRACT THESE FIELDS:
${fieldInstructions}

RULES:
${rules}

STRICT OUTPUT FORMAT:
${JSON.stringify(outputFormat, null, 2)}

RESUME TEXT:
{{resume_content}}
`;
};

// ----------------------------------------------------------------------------------------------------------------------------------

const detectionRuleToText = (rule: DetectionRuleType): string => {
  switch (rule.type) {
    case "regex":
      const { pattern, flags, target = "all", group = 0 } = rule.rule;
      return `– Use regex \`${pattern}\`${flags ? ` with flags \`${flags}\`` : ""} to extract ${target} match${target === "all" ? "es" : ""} (group ${group}).`;
    case "keyword":
      const {
        keywords,
        context_window = 0,
        strategy = "proximity",
      } = rule.rule;
      return `– Look for keywords [${keywords.join(", ")}] using ${strategy} within ±${context_window} words.`;
    case "section":
      const { section_headers, extraction_strategy = "first_occurrence" } =
        rule.rule;
      return `– In sections titled [${section_headers.join(", ")}], take the ${extraction_strategy === "first_occurrence" ? "first occurrence" : "most recent"}.`;
    case "custom":
      return `– ${rule.rule.prompt}`;
  }
};

const validationRuleToText = (rule: ValidationRuleType): string => {
  switch (rule.type) {
    case "regex":
      const { pattern, error_message } = rule.rule;
      return `– Must match regex \`${pattern}\`${error_message ? `; else: "${error_message}"` : ""}.`;
    case "length":
      const { min, max, error_message: lenMsg } = rule.rule;
      return `– Length must be${min != null ? ` ≥ ${min}` : ""}${max != null ? ` and ≤ ${max}` : ""}${lenMsg ? `; else: "${lenMsg}"` : ""}.`;
    case "allowed_values":
      const { values, case_sensitive } = rule.rule;
      return `– Value must be one of [${values.join(", ")}]${case_sensitive ? " (case‑sensitive)" : ""}.`;
    case "custom":
      return `– ${rule.rule}`;
    default:
      return "";
  }
};

const sanitizationRuleToText = (rule: SanitizationRuleType): string => {
  switch (rule.type) {
    case "regex_replace":
      const { pattern, replacement, flags } = rule.rule;
      return `– Replace \`${pattern}\` → \`${replacement}\`${flags ? ` with flags \`${flags}\`` : ""}.`;
    case "trim":
      const chars = rule.rule.characters ?? "\\s";
      return `– Trim characters [${chars}].`;
    case "format":
      const { template, components } = rule.rule;
      return `– Format with template "${template}", components ${JSON.stringify(components)}.`;
    case "custom":
      return `– ${rule.rule}`;
  }
};

export function generateV1Prompt(config: ExtractionConfigV1Type): string {
  // 1) ROLE
  const role = `You are an expert resume parser and data-extraction engine, with deep experience in information extraction, data normalization, and schema-driven validation.`;

  // 2) CONTEXT
  const context = `You will receive a plain-text resume. Your goal is to extract every field defined below—applying detection, then validation, then sanitization—so that the final output is a strictly valid JSON object conforming exactly to the specified output schema.`;

  // 3) ACTION
  const action = `Analyze the resume with maximum precision. For each field, run all detection rules in order, validate each candidate value, apply sanitization rules, then normalization mappings. Finally, return ONLY the JSON object—no additional text or commentary.`;

  // 4) Per-field instructions
  const fieldsInstructions = config.fields
    .map((field) => {
      const lines: string[] = [];

      // Header
      lines.push(`• **${field.label ?? field.key}** (\`${field.key}\`)`);
      if (field.description)
        lines.push(`  – Description: ${field.description}`);
      if (field.note) lines.push(`  – Note: ${field.note}`);

      // Detection rules
      if (field.detection_schema) {
        lines.push(`  – Detection rules:`);
        field.detection_schema.rules.forEach((r) =>
          lines.push(`    ${detectionRuleToText(r)}`),
        );
      }

      // Validation rules
      if (field.validation_schema) {
        lines.push(`  – Validation rules:`);
        field.validation_schema.rules.forEach((r) =>
          lines.push(`    ${validationRuleToText(r)}`),
        );
      }

      // Sanitization rules
      if (field.sanitization_schema) {
        lines.push(`  – Sanitization rules:`);
        field.sanitization_schema.rules.forEach((r) =>
          lines.push(`    ${sanitizationRuleToText(r)}`),
        );
      }

      // Required / default
      lines.push(`  – Required: ${field.required}`);
      lines.push(`  – Default: ${field.default_value}`);

      // Output schema
      if (field.output_schema) {
        const out = field.output_schema;
        lines.push(`  – Output schema:`);
        lines.push(`    • Type: ${out.data_type}`);
        if (out.format) lines.push(`    • Format: ${out.format}`);
        if (out.cardinality)
          lines.push(`    • Cardinality: ${out.cardinality}`);
        if (out.examples)
          lines.push(`    • Examples: ${out.examples.join(", ")}`);
        if (out.normalization) {
          const m = out.normalization.rule;
          lines.push(
            `    • Normalization: map [${m.source.join(", ")}] → ${JSON.stringify(
              m.target,
            )}`,
          );
        }
      }

      return lines.join("\n");
    })
    .join("\n\n");

  // 5) Strict JSON template
  const template: Record<string, unknown> = {};
  for (const field of config.fields) {
    template[field.key] = field.default_value || null;
  }
  const templateJson = JSON.stringify(template, null, 2);

  // 6) Assemble prompt
  return [
    `Role:\n${role}`,
    `Context:\n${context}`,
    `Action:\n${action}`,
    `Instructions:\nExtract and process each field in this exact sequence: detection → validation → sanitization → normalization. Return exactly the JSON object below—no extra text.\n\nFields to extract:\n${fieldsInstructions}`,
    `Strict output format:\n\`\`\`json\n${templateJson}\n\`\`\``,
    `Resume text:\n{{resume_content}}`,
  ].join("\n\n");
}
