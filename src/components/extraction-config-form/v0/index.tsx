"use client";

import { ExtractionConfigV0FormSchema } from "@/lib/extraction-config/schema";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";
import { Form } from "@/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { ConfigActions } from "./config-actions";
import { ConfigFields } from "./config-fields";
import { ConfigHeader } from "./config-header";
import { ConfigPreview } from "./config-preview";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { fieldConfigLabelToKey } from "@/lib/extraction-config";
import { toast } from "sonner";

export const ExtractionConfigV0Form = ({
  defaultValues,
}: {
  defaultValues?: ExtractionConfigV0FormType;
}) => {
  const api = useTRPC();

  const form = useForm<ExtractionConfigV0FormType>({
    resolver: standardSchemaResolver(ExtractionConfigV0FormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      config: {
        version: "v0",
        name: "Simple Config",
        description: "Basic resume extraction config",
        fields: [],
      },
    },
  });

  const { reset, handleSubmit, watch } = form;
  const { mutateAsync: createExtractionConfig } = useMutation(
    api.extractionConfig.create.mutationOptions(),
  );

  const onSubmit: SubmitHandler<ExtractionConfigV0FormType> = async (data) => {
    const fields = data.config.fields.map((field) => ({
      ...field,
      key: fieldConfigLabelToKey(field.label),
    }));

    const mutationRes = await createExtractionConfig({
      name: data.name,
      config: {
        ...data.config,
        fields,
      },
    });

    if (mutationRes.status === "SUCCESS") {
      toast.success(mutationRes.message);
      reset();
    } else {
      toast.error(mutationRes.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} onReset={() => reset()}>
        <div className="space-y-6">
          <ConfigHeader />
          <Tabs defaultValue="editor" className="w-full">
            <div className="mb-6 flex items-center justify-between">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">JSON Preview</TabsTrigger>
              </TabsList>

              <ConfigActions />
            </div>

            <TabsContent value="editor" className="mt-0">
              <ConfigFields />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <ConfigPreview formValues={watch()} />
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
};
