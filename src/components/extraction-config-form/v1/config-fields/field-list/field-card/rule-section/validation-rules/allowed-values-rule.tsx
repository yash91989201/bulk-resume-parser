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
import { Checkbox } from "@/ui/checkbox";
import { ListFilter, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface AllowedValuesRuleProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function AllowedValuesRule({
  fieldIndex,
  ruleIndex,
  onRemove,
}: AllowedValuesRuleProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.validation_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <ListFilter className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Allowed Values Rule</h4>
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
        name={`${basePath}.values`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Allowed Values</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter allowed values, separated by commas"
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
                      .map((v) => v.trim())
                      .filter(Boolean),
                  );
                }}
              />
            </FormControl>
            <FormDescription>
              List of values that are considered valid
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${basePath}.case_sensitive`}
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Case Sensitive</FormLabel>
              <FormDescription>
                When enabled, values must match exactly including letter case
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
