import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Checkbox } from "@/ui/checkbox";
import { Button } from "@/ui/button";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RuleSection } from "./rule-section";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface FieldCardProps {
  index: number;
  onRemove: () => void;
}

export function FieldCard({ index, onRemove }: FieldCardProps) {
  const { control, watch } = useFormContext<ExtractionConfigV1FormType>();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-card overflow-hidden rounded-lg border shadow-sm transition-all">
      <div className="bg-muted/30 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
            {index + 1}
          </div>
          <h3 className="font-medium">
            {watch(`config.fields.${index}.label`) || `Field ${index + 1}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onRemove}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                name={`config.fields.${index}.label`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter field label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                name={`config.fields.${index}.description`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter field description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name={`config.fields.${index}.note`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Note</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Provide additional note for AI"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This note will guide the AI extraction process
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={control}
                name={`config.fields.${index}.required`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Required Field</FormLabel>
                      <FormDescription>
                        Will use default value if not found
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                name={`config.fields.${index}.default_value`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Value</FormLabel>
                    <FormControl>
                      <Input placeholder="Provide a default value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <RuleSection fieldIndex={index} />
          </div>
        </div>
      </div>
    </div>
  );
}
