"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/ui/button";
import {
  Plus,
  CheckCircle,
  Ruler,
  ListFilter,
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
import { LengthRule } from "./length-rule";
import { AllowedValuesRule } from "./allowed-values-rule";
import { CustomRule } from "./custom-rule";
import type {
  ExtractionConfigV1FormType,
  ValidationRuleType,
} from "@/lib/extraction-config/types";

interface ValidationRulesProps {
  fieldIndex: number;
}

export function ValidationRules({ fieldIndex }: ValidationRulesProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const { fields, append, remove } = useFieldArray({
    name: `config.fields.${fieldIndex}.validation_schema.rules`,
    control,
  });

  const addRule = (type: ValidationRuleType["type"]) => {
    switch (type) {
      case "regex":
        append({
          type: "regex",
          rule: {
            pattern: "",
            error_message: "",
          },
        });
        break;
      case "length":
        append({
          type: "length",
          rule: {
            min: undefined,
            max: undefined,
            error_message: "",
          },
        });
        break;
      case "allowed_values":
        append({
          type: "allowed_values",
          rule: {
            values: [],
            case_sensitive: false,
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
        <h3 className="text-sm font-medium">Validation Rules</h3>
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
              <CheckCircle className="h-4 w-4" /> Regex Validation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("length")}
              className="gap-2"
            >
              <Ruler className="h-4 w-4" /> Length Validation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("allowed_values")}
              className="gap-2"
            >
              <ListFilter className="h-4 w-4" /> Allowed Values
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addRule("custom")}
              className="gap-2"
            >
              <Code className="h-4 w-4" /> Custom Validation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {fields.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
          <div className="max-w-xs">
            <p className="text-muted-foreground text-sm">
              No validation rules added yet. Validation rules ensure the
              extracted data meets specific criteria.
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
                  <RegexReplaceRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "length" && (
                  <LengthRule
                    fieldIndex={fieldIndex}
                    ruleIndex={index}
                    onRemove={() => remove(index)}
                  />
                )}
                {ruleType === "allowed_values" && (
                  <AllowedValuesRule
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
