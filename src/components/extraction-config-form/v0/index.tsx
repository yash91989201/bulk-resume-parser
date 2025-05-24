"use client";

import { ExtractionConfigV0FormSchema } from "@/lib/extraction-config/schema";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";
import { Form } from "@/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ConfigActions } from "./config-actions";
import { ConfigFields } from "./config-fields";
import { ConfigHeader } from "./config-header";
import { ConfigPreview } from "./config-preview";

export const ExtractionConfigV0Form = () => {
  const form = useForm<ExtractionConfigV0FormType>({
    resolver: zodResolver(ExtractionConfigV0FormSchema),
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

  const onSubmit = (data: ExtractionConfigV0FormType) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} onReset={() => form.reset()}>
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
              <ConfigPreview formValues={form.watch()} />
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
};
