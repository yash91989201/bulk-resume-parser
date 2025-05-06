import { useFieldArray, useFormContext } from "react-hook-form";
import type { ExtractionConfigFormType } from "@/lib/types";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Plus } from "lucide-react";
import { Checkbox } from "@/ui/checkbox";
import { DetectionSchemaForm } from "./detection-schema-form";

export const V1ConfigForm = () => {
  const { control } = useFormContext<ExtractionConfigFormType>();
  const { fields, append } = useFieldArray<ExtractionConfigFormType>({
    name: "config.fields",
    control: control,
  });

  return (
    <div>
      <div className="flex justify-between">
        <p>Extraction Config</p>
        <Button
          type="button"
          variant="link"
          onClick={() => {
            append({ key: "", label: "", prompt: "", example: "" });
          }}
        >
          <Plus className="size-4" />
          <span>New Field</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((_, index) => (
          <div key={index} className="grid grid-cols-2 gap-3">
            <FormField
              control={control}
              name={`config.fields.${index}.key`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Key name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`config.fields.${index}.label`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Label name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`config.fields.${index}.required`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Required</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`config.fields.${index}.default_value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Value</FormLabel>
                  <FormControl>
                    <Input placeholder="Default value" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DetectionSchemaForm index={index} />
          </div>
        ))}
      </div>
    </div>
  );
};
