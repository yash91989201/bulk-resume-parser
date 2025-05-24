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
import { Crop, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface TrimRuleFormProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function TrimRuleForm({
  fieldIndex,
  ruleIndex,
  onRemove,
}: TrimRuleFormProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.sanitization_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300">
            <Crop className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Trim Rule</h4>
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
        name={`${basePath}.characters`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Characters to Trim</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter characters to trim (optional)"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Specific characters to trim from the beginning and end (leave
              empty to trim whitespace)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
