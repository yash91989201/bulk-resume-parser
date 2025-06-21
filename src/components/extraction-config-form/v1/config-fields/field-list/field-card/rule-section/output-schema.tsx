import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Input } from "@/ui/input";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface OutputSchemaProps {
  fieldIndex: number;
}

export function OutputSchema({ fieldIndex }: OutputSchemaProps) {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
  const basePath = `config.fields.${fieldIndex}.output_schema` as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          name={`${basePath}.data_type`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The expected data type of the extracted value
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name={`${basePath}.format`}
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Format</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The expected format of the extracted value
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name={`${basePath}.cardinality`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cardinality</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select cardinality (optional)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="single">Single Value</SelectItem>
                <SelectItem value="multiple">Multiple Values</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Whether to expect a single value or multiple values
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name={`${basePath}.examples`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Examples</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter examples, separated by commas"
                {...field}
                value={
                  Array.isArray(field.value)
                    ? field.value.join(",")
                    : field.value
                }
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(
                    value
                      .split(",")
                      .map((ex) => ex.trim())
                      .filter(Boolean),
                  );
                }}
              />
            </FormControl>
            <FormDescription>
              Example values to help guide the extraction process
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
