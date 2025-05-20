"use client";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
// UTILS
import { fieldConfigLabelToKey } from "@/lib/extraction-config";
// SCHEMA
import { ExtractionConfigV0FormSchema } from "@/lib/extraction-config/schema";
// TYPES
import type { SubmitHandler } from "react-hook-form";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";
// UI
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
// ICONS
import { Loader2, Minus, Plus } from "lucide-react";

export const ExtractionConfigV0Form = () => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: "",
      config: {
        version: "v0",
        name: "Simple Config",
        description: "Basic resume extraction config",
        fields: [],
      },
    },
    resolver: zodResolver(ExtractionConfigV0FormSchema),
  });

  const { control, handleSubmit, formState, reset } = form;

  const api = useTRPC();
  const {
    mutateAsync: createExtractionConfig,
    isPending: createExtractionConfigPending,
  } = useMutation(api.extractionConfig.create.mutationOptions());

  const onSubmit: SubmitHandler<ExtractionConfigV0FormType> = async (data) => {
    const fields = data.config.fields.map((field) => ({
      ...field,
      key: fieldConfigLabelToKey(field.label),
    }));

    const response = await createExtractionConfig({
      name: data.name,
      config: {
        ...data.config,
        fields,
      },
    });

    if (response.status === "SUCCESS") {
      toast.success(response.message);

      router.push("/dashboar/extraction-config");
    } else {
      toast.error(response.message);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">V0 Extraction Config Schema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Config Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter configuration name"
                      {...field}
                      className="max-w-md"
                    />
                  </FormControl>
                  <FormDescription>
                    Give your extraction configuration a descriptive name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Config Fields</FormLabel>
              <FormDescription>
                Specify fields that you want to extract
              </FormDescription>

              <ConfigFieldList />

              {formState.errors?.config?.fields?.message && (
                <p className="text-destructive text-sm">
                  {formState.errors.config.fields.message}
                </p>
              )}
            </div>

            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Reset
              </Button>
              <Button type="submit" disabled={createExtractionConfigPending}>
                {createExtractionConfigPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Save Config
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export const ConfigFieldList = () => {
  const { control } = useFormContext<ExtractionConfigV0FormType>();
  const { append, remove, fields } = useFieldArray({
    name: "config.fields",
    control,
  });

  const addField = () => {
    append({
      key: "",
      label: "",
      prompt: "",
      example: "",
    });
  };

  return (
    <div className="space-y-6">
      {fields.length === 0 ? (
        <div className="bg-muted/50 space-y-3 rounded-lg border border-dashed p-8 text-center">
          <FormDescription>No fields added yet</FormDescription>
          <Button type="button" variant="secondary" onClick={addField}>
            <Plus className="mr-2 size-4" /> Add Your First Field
          </Button>
        </div>
      ) : (
        <>
          {fields.map((_, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Field {idx + 1}</h4>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(idx)}
                    className="h-8 px-3"
                  >
                    <Minus className="mr-1 size-4" /> Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
                <FormField
                  name={`config.fields.${idx}.label`}
                  control={control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter field label" {...field} />
                      </FormControl>
                      <FormDescription>
                        Label of the field in result
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`config.fields.${idx}.prompt`}
                  control={control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter field prompt" {...field} />
                      </FormControl>
                      <FormDescription>
                        Prompt to extract the data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`config.fields.${idx}.example`}
                  control={control}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Example</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Give an example of required output"
                          className="min-h-24 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ))}

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={addField}
              className="border-dashed"
            >
              <Plus className="mr-2 size-4" /> Add Another Field
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
