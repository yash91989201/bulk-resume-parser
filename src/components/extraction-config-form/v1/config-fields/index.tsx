"use client";

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
import { FieldsList } from "./field-list";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

export function ConfigFields() {
  const { control } = useFormContext<ExtractionConfigV1FormType>();

  return (
    <div className="space-y-8">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <div className="space-y-2">
              <FormLabel className="text-base font-semibold">
                Configuration Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter a descriptive name for this configuration"
                  {...field}
                  className="max-w-md"
                />
              </FormControl>
              <FormDescription className="text-muted-foreground">
                This name will be used to identify your extraction configuration
              </FormDescription>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FieldsList />
    </div>
  );
}
