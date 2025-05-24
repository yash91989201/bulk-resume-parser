import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/ui/form";
import { Textarea } from "@/ui/textarea";
import { Button } from "@/ui/button";
import { Code, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface CustomRuleProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function CustomRuleForm({
  fieldIndex,
  ruleIndex,
  onRemove,
}: CustomRuleProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.sanitization_schema.rules.${ruleIndex}.rule` as const;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
            <Code className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Custom Sanitization Rule</h4>
        </div>
        <Button
          variant="ghost"
          type="button"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <FormField
        name={`${basePath}.prompt`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom Sanitization Logic</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter custom sanitization logic"
                className="min-h-[100px] font-mono text-sm"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Custom JavaScript function to clean and format the extracted
              value. Return the sanitized value.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
