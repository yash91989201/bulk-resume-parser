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
import { FieldList } from "./field-list";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";

export const ConfigFields = () => {
  const { control } = useFormContext<ExtractionConfigV0FormType>();

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

      <FieldList />
    </div>
  );
};
