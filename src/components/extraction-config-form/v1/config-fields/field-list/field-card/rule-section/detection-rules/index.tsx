import {
  type UseFormReturn,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { Button } from "@/ui/button";
import { Plus, Regex, Key, FileText, Code, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Separator } from "@/ui/separator";
import { CustomRule } from "./custom-rule";
import { KeywordRule } from "./keyword-rule";
import { RegexRule } from "./regex-rule";
import { SectionRule } from "./section-rule";
import type {
  ExtractionConfigV1FormType,
  DetectionRuleType,
} from "@/lib/extraction-config/types";

interface DetectionRulesProps {
  fieldIndex: number;
}

export function DetectionRules({ fieldIndex }: DetectionRulesProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const { fields, append, remove } = useFieldArray({
    name: `config.fields.${fieldIndex}.detection_schema.rules`,
    control,
  });

  const addRule = (type: DetectionRuleType["type"]) => {
    switch (type) {
      case "regex":
        append({
          type: "regex",
          rule: {
            pattern: "",
            flags: "",
            target: "first",
            group: 0,
          },
        });
        break;
      case "keyword":
        append({
          type: "keyword",
          rule: {
            keywords: [],
            context_window: 0,
            strategy: "proximity",
          },
        });
        break;
      case "section":
        append({
          type: "section",
          rule: {
            section_headers: [],
            extraction_strategy: "first_occurrence",
          },
        });
        break;
      case "custom":
        append({
          type: "custom",
          rule: {
            prompt: "",
          },
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Detection Rules</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Rule</span>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => addRule("regex")}
              className="gap-2"
            >
              <Regex className="h-4 w-4" /> Regex Rule
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("keyword")}
              className="gap-2"
            >
              <Key className="h-4 w-4" /> Keyword Rule
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("section")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" /> Section Rule
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("custom")}
              className="gap-2"
            >
              <Code className="h-4 w-4" /> Custom Rule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {fields.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
          <div className="max-w-xs">
            <p className="text-muted-foreground text-sm">
              No detection rules added yet. Detection rules define how to
              extract data from the source.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const ruleType = field.type;
            return (
              <div
                key={field.id}
                className="bg-card rounded-lg border shadow-sm"
              >
                {ruleType === "regex" && (
                  <RegexRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "keyword" && (
                  <KeywordRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "section" && (
                  <SectionRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "custom" && (
                  <CustomRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
