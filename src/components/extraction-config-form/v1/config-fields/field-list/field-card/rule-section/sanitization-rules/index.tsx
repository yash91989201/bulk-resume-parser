"use client";

import {
  type UseFormReturn,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { Button } from "@/ui/button";
import {
  Plus,
  Scissors,
  Crop,
  FileType,
  Code,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Separator } from "@/ui/separator";
import { RegexReplaceRule } from "./regex-replace-rule";
import { TrimRuleForm } from "./trim-rule";
import { FormatRuleForm } from "./format-rule";
import { CustomRuleForm } from "./custom-rule";
import type {
  ExtractionConfigV1FormType,
  SanitizationRuleType,
} from "@/lib/extraction-config/types";

interface RulesProps {
  fieldIndex: number;
}

export function SanitizationRules({ fieldIndex }: RulesProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const { fields, append, remove } = useFieldArray({
    name: `config.fields.${fieldIndex}.sanitization_schema.rules`,
    control,
  });

  const addRule = (type: SanitizationRuleType["type"]) => {
    switch (type) {
      case "regex_replace":
        append({
          type: "regex_replace",
          rule: {
            pattern: "",
            replacement: "",
            flags: "",
          },
        });
        break;
      case "trim":
        append({
          type: "trim",
          rule: {
            characters: "",
          },
        });
        break;
      case "format":
        append({
          type: "format",
          rule: {
            template: "",
            components: {},
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
        <h3 className="text-sm font-medium"> Rules</h3>
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
              onClick={() => addRule("regex_replace")}
              className="gap-2"
            >
              <Scissors className="h-4 w-4" /> Regex Replace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addRule("trim")} className="gap-2">
              <Crop className="h-4 w-4" /> Trim
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("format")}
              className="gap-2"
            >
              <FileType className="h-4 w-4" /> Format
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("custom")}
              className="gap-2"
            >
              <Code className="h-4 w-4" /> Custom
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {fields.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
          <div className="max-w-xs">
            <p className="text-muted-foreground text-sm">
              No sanitization rules added yet. rules clean and format the
              extracted data.
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
                {ruleType === "regex_replace" && (
                  <RegexReplaceRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "trim" && (
                  <TrimRuleForm
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "format" && (
                  <FormatRuleForm
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "custom" && (
                  <CustomRuleForm
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
