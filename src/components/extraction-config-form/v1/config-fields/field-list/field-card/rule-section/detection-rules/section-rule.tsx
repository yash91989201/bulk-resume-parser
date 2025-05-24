import { useFormContext } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { FileText, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface SectionRuleProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function SectionRule({
  fieldIndex,
  ruleIndex,
  onRemove,
}: SectionRuleProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.detection_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Section Rule</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <FormField
        name={`${basePath}.section_headers`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Section Headers</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter section headers, separated by commas"
                {...field}
                value={
                  Array.isArray(field.value)
                    ? field.value.join(", ")
                    : field.value
                }
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(
                    value
                      .split(",")
                      .map((h) => h.trim())
                      .filter(Boolean),
                  );
                }}
              />
            </FormControl>
            <FormDescription>
              Headers that identify the sections to extract from
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name={`${basePath}.extraction_strategy`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Extraction Strategy</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <FormDescription>
              How to extract content when multiple sections match
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
