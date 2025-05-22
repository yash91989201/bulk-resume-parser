"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { ExtractionConfigV1FormSchema } from "@/lib/extraction-config/schema";
import { Form } from "@/ui/form";
import { ConfigHeader } from "./config-header";
import { ConfigFields } from "./config-fields";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
// import { ConfigPreview } from "@/components/config-preview";
import { ConfigPreview } from "./config-preview";
import { ConfigActions } from "./config-actions";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";
import { toast } from "sonner";

export const ExtractionConfigV1Form = () => {
  const form = useForm<ExtractionConfigV1FormType>({
    resolver: zodResolver(ExtractionConfigV1FormSchema),
    defaultValues: {
      name: "",
      config: {
        version: "v1",
        name: "Detailed Config",
        description: "Detailed resume extraction config",
        fields: [],
      },
    },
  });

  const onSubmit: SubmitHandler<ExtractionConfigV1FormType> = (data) => {
    toast.success("config submitted");
    console.log("Form data submitted:", data);
  };

  return (
    <div className="space-y-6">
      <ConfigHeader />

      <Form {...form}>
        <Tabs defaultValue="editor" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">JSON Preview</TabsTrigger>
            </TabsList>

            <ConfigActions />
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 py-6"
          >
            <TabsContent value="editor" className="mt-0">
              <ConfigFields />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <ConfigPreview />
            </TabsContent>
          </form>
        </Tabs>
      </Form>
    </div>
  );
};
