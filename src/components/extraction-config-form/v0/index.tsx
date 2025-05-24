"use client";

import { ExtractionConfigV0FormSchema } from "@/lib/extraction-config/schema";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";
import { Form } from "@/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ConfigActions } from "./config-actions";
import { ConfigFields } from "./config-fields";
import { ConfigHeader } from "./config-header";
import { ConfigPreview } from "./config-preview";

export const ExtractionConfigV0Form = () => {
  const [activeTab, setActiveTab] = useState("editor");

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

  function onSubmit(data: ExtractionConfigV0FormType) {
    console.log(data);
  }

  return (
    <div className="space-y-6">
      <ConfigHeader />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">JSON Preview</TabsTrigger>
          </TabsList>

          <ConfigActions
            onSave={() => form.handleSubmit(onSubmit)()}
            onReset={() => form.reset()}
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 py-6"
          >
            <TabsContent value="editor" className="mt-0">
              <ConfigFields />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <ConfigPreview formValues={form.watch()} />
            </TabsContent>
          </form>
        </Form>
      </Tabs>
    </div>
  );
};
