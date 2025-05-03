import { useFieldArray, useFormContext } from "react-hook-form";
// TYPES
import type { ExtractionConfigFormType } from "@/lib/types";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@ui/select";
import { Button } from "@ui/button";

export const DetectionSchemaForm = ({ index }: { index: number }) => {
  const { control, watch, setValue } =
    useFormContext<ExtractionConfigFormType>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `config.fields.${index}.detection_schema.rules`,
  });

  return (
    <div className="space-y-4">
      {fields.map((field, ruleIndex) => {
        const currentType = watch(
          `config.fields.${index}.detection_schema.rules.${ruleIndex}.type`,
        );

        return (
          <div key={field.id} className="border-l-2 pl-4">
            <FormField
              control={control}
              name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset rule structure when type changes
                      const rulePath =
                        `config.fields.${index}.detection_schema.rules.${ruleIndex}.rule` as const;
                      switch (value) {
                        case "regex":
                          setValue(rulePath, { pattern: "" });
                          break;
                        case "keyword":
                          setValue(rulePath, { keywords: [] });
                          break;
                        case "section":
                          setValue(rulePath, { section_headers: [] });
                          break;
                        case "custom":
                          setValue(rulePath, { prompt: "" });
                          break;
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rule type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="regex">Regular Expression</SelectItem>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="section">Section</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {currentType === "regex" && (
              <RegexRuleFields index={index} ruleIndex={ruleIndex} />
            )}

            {currentType === "keyword" && (
              <KeywordRuleFields index={index} ruleIndex={ruleIndex} />
            )}

            {currentType === "section" && (
              <SectionRuleFields index={index} ruleIndex={ruleIndex} />
            )}

            {currentType === "custom" && (
              <CustomRuleFields index={index} ruleIndex={ruleIndex} />
            )}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(ruleIndex)}
              className="mt-4"
            >
              Remove Rule
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ type: "regex", rule: { pattern: "" } })}
      >
        Add Detection Rule
      </Button>
    </div>
  );
};

// Regex Rule Component
const RegexRuleFields = ({
  index,
  ruleIndex,
}: {
  index: number;
  ruleIndex: number;
}) => {
  const { control } = useFormContext<ExtractionConfigFormType>();

  return (
    <div className="mt-4 space-y-4">
      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.pattern`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pattern</FormLabel>
            <FormControl>
              <Input placeholder="Enter regex pattern" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.flags`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Flags (optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., gi" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.target`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Target (optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="first">First</SelectItem>
                <SelectItem value="last">Last</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.group`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Enter group number"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Keyword Rule Component
const KeywordRuleFields = ({
  index,
  ruleIndex,
}: {
  index: number;
  ruleIndex: number;
}) => {
  const { control } = useFormContext<ExtractionConfigFormType>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `config.fields.${index}.detection_schema.rules`,
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
        <FormLabel>Keywords</FormLabel>
        {fields.map((_field, keywordIndex) => (
          <div key={keywordIndex} className="flex gap-2">
            <FormField
              control={control}
              name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.keywords.${keywordIndex}`}
              render={({ field }) => (
                <Input placeholder="Enter keyword" {...field} />
              )}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(keywordIndex)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              type: "keyword",
              rule: { keywords: [] },
            })
          }
        >
          Add Keyword
        </Button>
      </div>

      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.context_window`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Context Window (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Enter context window size"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.strategy`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Strategy (optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="proximity">Proximity</SelectItem>
                <SelectItem value="section">Section</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Section Rule Component
const SectionRuleFields = ({
  index,
  ruleIndex,
}: {
  index: number;
  ruleIndex: number;
}) => {
  const { control } = useFormContext<ExtractionConfigFormType>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `config.fields.${index}.detection_schema.rules`,
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
        <FormLabel>Section Headers</FormLabel>
        {fields.map((field, headerIndex) => (
          <div key={field.id} className="flex gap-2">
            <FormField
              control={control}
              name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.section_headers.${headerIndex}`}
              render={({ field }) => (
                <Input placeholder="Enter section header" {...field} />
              )}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(headerIndex)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              type: "section",
              rule: { section_headers: [""] },
            })
          }
        >
          Add Header
        </Button>
      </div>

      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.extraction_strategy`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Extraction Strategy (optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="first_occurrence">
                  First Occurrence
                </SelectItem>
                <SelectItem value="most_recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Custom Rule Component
const CustomRuleFields = ({
  index,
  ruleIndex,
}: {
  index: number;
  ruleIndex: number;
}) => {
  const { control } = useFormContext<ExtractionConfigFormType>();

  return (
    <div className="mt-4">
      <FormField
        control={control}
        name={`config.fields.${index}.detection_schema.rules.${ruleIndex}.rule.prompt`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom Rule Code</FormLabel>
            <FormControl>
              <Input placeholder="Enter custom rule code" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
