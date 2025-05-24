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
import { FieldsListV0 } from "./field-list";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";

export function ConfigFields() {
  const { control } = useFormContext<ExtractionConfigV0FormType>();

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-lg border p-6 shadow-sm">
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
                  This name will be used to identify your extraction
                  configuration
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-semibold">Configuration Details</h3>
          <p className="text-muted-foreground text-sm">
            Basic information about this configuration
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Version</p>
            <p className="text-muted-foreground text-sm">v0 (Simple)</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Type</p>
            <p className="text-muted-foreground text-sm">Simple Config</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Description</p>
            <p className="text-muted-foreground text-sm">
              Basic resume extraction config
            </p>
          </div>
        </div>
      </div>

      <FieldsListV0 />
    </div>
  );
}
