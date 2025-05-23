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
import { Separator } from "@/ui/separator";
import { ScrollArea } from "@/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
// ICONS
import {
  Loader2,
  Minus,
  Plus,
  Settings,
  FileText,
  Save,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

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
      router.push("/dashboard/extraction-config");
    } else {
      toast.error(response.message);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Extraction Configuration
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a new extraction configuration to process documents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => reset()} className="gap-2">
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={createExtractionConfigPending}
              className="gap-2"
            >
              {createExtractionConfigPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Config
            </Button>
          </div>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="general" className="gap-2">
                  <Settings className="size-4" />
                  General Settings
                </TabsTrigger>
                <TabsTrigger value="fields" className="gap-2">
                  <FileText className="size-4" />
                  Field Configuration
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <div className="bg-card rounded-lg border p-6 shadow-sm">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Configuration Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter a descriptive name for this configuration"
                            {...field}
                            className="max-w-md"
                          />
                        </FormControl>
                        <FormDescription>
                          This name will help you identify this configuration in
                          your dashboard
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-card rounded-lg border p-6 shadow-sm">
                  <h3 className="mb-2 text-base font-medium">
                    Configuration Details
                  </h3>
                  <div className="grid max-w-md grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Version</p>
                      <p className="text-muted-foreground text-sm">v0</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-muted-foreground text-sm">
                        Simple Config
                      </p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-muted-foreground text-sm">
                        Basic resume extraction config
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fields" className="space-y-6">
                <div className="bg-card rounded-lg border p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium">
                        Field Configuration
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Define the fields you want to extract from documents
                      </p>
                    </div>
                    {form.getValues().config.fields.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          form.getValues().config.fields.length < 10 &&
                          form.setValue("config.fields", [
                            ...form.getValues().config.fields,
                            { key: "", label: "", prompt: "", example: "" },
                          ])
                        }
                        className="gap-2"
                      >
                        <Plus className="size-4" /> Add Field
                      </Button>
                    )}
                  </div>

                  <ConfigFieldList />

                  {formState.errors?.config?.fields?.message && (
                    <div className="bg-destructive/10 text-destructive mt-4 flex items-center gap-2 rounded-md p-3">
                      <AlertCircle className="size-4" />
                      <p className="text-sm font-medium">
                        {formState.errors.config.fields.message}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
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

  if (fields.length === 0) {
    return (
      <div className="bg-muted/40 rounded-lg border border-dashed p-10 text-center">
        <div className="flex flex-col items-center justify-center space-y-3 py-4">
          <div className="bg-primary/10 rounded-full p-3">
            <FileText className="text-primary size-6" />
          </div>
          <h3 className="text-lg font-medium">No fields configured</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            Add fields to extract specific information from your documents. Each
            field needs a label, prompt, and example.
          </p>
          <Button type="button" onClick={addField} className="mt-2 gap-2">
            <Plus className="size-4" /> Add Your First Field
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px] pr-4">
      <div className="space-y-6">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="group bg-background relative rounded-lg border p-5 shadow-sm transition-all hover:shadow"
          >
            <div className="absolute top-4 right-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(idx)}
                className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0 opacity-70 hover:opacity-100"
              >
                <Minus className="size-4" />
                <span className="sr-only">Remove field</span>
              </Button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                {idx + 1}
              </div>
              <h4 className="text-base font-medium">Field {idx + 1}</h4>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                name={`config.fields.${idx}.label`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
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
                name={`config.fields.${idx}.prompt`}
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Extract the job title"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Instructions for extracting this data
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
                        placeholder="e.g., Senior Software Engineer at Acme Inc."
                        className="min-h-24 resize-none"
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
        ))}
      </div>
    </ScrollArea>
  );
};
