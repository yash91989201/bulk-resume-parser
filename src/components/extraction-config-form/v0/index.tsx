"use client";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
// UI
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
// SCHEMA
import { ExtractionConfigV0FormSchema } from "@/lib/extraction-config/schema";
// TYPES
import type { SubmitHandler } from "react-hook-form";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";
// ICONS
import { Loader2, Minus, Plus } from "lucide-react";
import { fieldConfigLabelToKey } from "@/lib/extraction-config";
import { useRouter } from "next/navigation";

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

  const { control, handleSubmit } = form;

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
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Config Name</FormLabel>
              <FormControl>
                <Input placeholder="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ConfigFieldList />

        <Button>
          {createExtractionConfigPending && (
            <Loader2 className="mr-1 size-4 animate-spin" />
          )}
          Save Config
        </Button>
      </form>
    </Form>
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
    <div>
      <div>
        <Button type="button" variant="secondary" onClick={() => addField()}>
          <Plus className="size-4" />
        </Button>
      </div>
      {fields.map((_, idx) => (
        <div key={idx}>
          <div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => remove(idx)}
            >
              <Minus className="size-4" />
            </Button>
            <FormField
              name={`config.fields.${idx}.label`}
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="label" {...field} />
                  </FormControl>
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
                    <Input placeholder="prompt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name={`config.fields.${idx}.example`}
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Example</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Give an example of required output"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
