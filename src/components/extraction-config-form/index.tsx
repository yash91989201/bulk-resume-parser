"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { type ExtractionConfigFormType } from "@/lib/types";
import { ExtractionConfigFormSchema } from "@/lib/schema";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/ui/select";
import { Input } from "@/ui/input";
import { ExtractionConfigSection } from "./extraction-config-section";
import { Button } from "@/ui/button";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";

export const ExtractionConfigForm = () => {
  const api = useTRPC();
  const { mutateAsync: createExtractionConfig } = useMutation(
    api.extractionConfig.create.mutationOptions(),
  );

  const form = useForm<ExtractionConfigFormType>({
    resolver: zodResolver(ExtractionConfigFormSchema),
    defaultValues: {
      name: "",
      config: {
        version: "v0",
        name: "Simple Config",
        description: "Basic resume extraction config",
        fields: [],
      },
    },
  });

  const { control, watch, handleSubmit, reset, setValue, formState } = form;

  console.log(formState.errors);

  const selectedConfigVersion = watch("config.version");

  const onSubmit: SubmitHandler<ExtractionConfigFormType> = async (data) => {
    console.log(data);

    const { status, message } = await createExtractionConfig(data);

    if (status === "SUCCESS") {
      toast.success("message");
    } else if (status === "FAILED") {
      toast.error(message);
    }

    reset({
      name: "",
      config: {
        version: "v0",
        name: "Simple Config",
        description: "Basic resume extraction config",
        fields: [],
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Config name</FormLabel>
              <FormControl>
                <Input placeholder="Config name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="config.version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select schema</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue("config.fields", []);
                  if (value === "v0") {
                    setValue("config.name", "Simple Config");
                    setValue(
                      "config.description",
                      "Basic resume extraction config",
                    );
                  } else {
                    setValue("config.name", "Detailed Config");
                    setValue(
                      "config.description",
                      "Detailed resume extraction config",
                    );
                  }
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a config schema" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="v0">Simple Schema</SelectItem>
                  <SelectItem value="v1">Detailed Schema</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <ExtractionConfigSection configVersion={selectedConfigVersion} />

        <Button>Save configuration</Button>
      </form>
    </Form>
  );
};
