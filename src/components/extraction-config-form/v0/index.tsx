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
import { Textarea } from "@/ui/textarea";

export const V0ConfigForm = () => {
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
              name={`config.fields.${index}.prompt`}
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Extraction Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Prompt text"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`config.fields.${index}.example`}
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Example</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Example result"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
