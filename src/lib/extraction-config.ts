import {
  type ExtractionConfigV0Type,
  type ExtractionConfigV1Type,
  type ExtractionConfigType,
} from "./types";

export const generateExtractionPrompt = (config: ExtractionConfigType) => {
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

const generateV1Prompt = (config: ExtractionConfigV1Type) => {
  return config.version;
};
