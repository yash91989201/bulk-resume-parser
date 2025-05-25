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
import { Textarea } from "@/ui/textarea";
import { Button } from "@/ui/button";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";

export const FieldCard = ({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const { control, watch, formState } =
    useFormContext<ExtractionConfigV0FormType>();

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
            type="button"
            variant="ghost"
            size="icon"
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
            type="button"
            variant="ghost"
            size="icon"
            disabled={formState.isSubmitting}
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
                      <Input placeholder="e.g., Job Title" {...field} />
                    </FormControl>
                    <FormDescription>
                      How this field will be labeled in results
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name={`config.fields.${index}.prompt`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extraction Prompt</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Extract the job title from the resume"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Instructions for extracting this data from documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              name={`config.fields.${index}.example`}
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Example Output</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Senior Software Engineer at Acme Inc."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide an example of the expected output format
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
