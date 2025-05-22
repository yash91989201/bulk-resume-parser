"use client";

import { useFormContext, type UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Scissors, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface RegexReplaceRuleFormProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function RegexReplaceRule({
  fieldIndex,
  ruleIndex,
  onRemove,
}: RegexReplaceRuleFormProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.sanitization_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300">
            <Scissors className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Regex Replace Rule</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <FormField
        name={`${basePath}.pattern`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pattern</FormLabel>
            <FormControl>
              <Input placeholder="Enter regex pattern" {...field} />
            </FormControl>
            <FormDescription>
              Regular expression pattern to match text for replacement
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name={`${basePath}.replacement`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Replacement</FormLabel>
            <FormControl>
              <Input placeholder="Enter replacement text" {...field} />
            </FormControl>
            <FormDescription>
              Text to replace matched patterns with
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name={`${basePath}.flags`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Flags</FormLabel>
            <FormControl>
              <Input placeholder="e.g., gi" {...field} />
            </FormControl>
            <FormDescription>
              Regex flags (g for global, i for case-insensitive, etc.)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
