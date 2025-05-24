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
import { Ruler, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface LengthRuleFormProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function LengthRule({
  fieldIndex,
  ruleIndex,
  onRemove,
}: LengthRuleFormProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.validation_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
            <Ruler className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Length Validation Rule</h4>
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
          name={`${basePath}.min`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Length</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter minimum length"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value =
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Minimum allowed length (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={`${basePath}.max`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Length</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter maximum length"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value =
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Maximum allowed length (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name={`${basePath}.error_message`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Error Message</FormLabel>
            <FormControl>
              <Input placeholder="Enter error message (optional)" {...field} />
            </FormControl>
            <FormDescription>
              Custom error message when validation fails
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
