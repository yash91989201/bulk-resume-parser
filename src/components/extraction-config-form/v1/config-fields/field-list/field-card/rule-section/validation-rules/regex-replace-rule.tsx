"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Regex, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface RegexRuleFormProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function RegexReplaceRule({
  fieldIndex,
  ruleIndex,
  onRemove,
}: RegexRuleFormProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.detection_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Regex className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Regex Rule</h4>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          name={`${basePath}.pattern`}
          control={control}
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
          name={`${basePath}.flags`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flags</FormLabel>
              <FormControl>
                <Input placeholder="e.g., gi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          name={`${basePath}.target`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="first">First Match</SelectItem>
                  <SelectItem value="last">Last Match</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name={`${basePath}.group`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capture Group</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={(e) =>
                    field.onChange(Number.parseInt(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
