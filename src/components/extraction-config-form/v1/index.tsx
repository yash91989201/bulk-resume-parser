"use client";

import { ExtractionConfigV1FormSchema } from "@/lib/extraction-config/schema";
import { Form } from "@/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { ConfigFields } from "./config-fields";
import { ConfigHeader } from "./config-header";
// import { ConfigPreview } from "@/components/config-preview";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";
import { toast } from "sonner";
import { ConfigActions } from "./config-actions";
import { ConfigPreview } from "./config-preview";

export const ExtractionConfigV1Form = ({
  defaultValues,
}: {
  defaultValues?: ExtractionConfigV1FormType;
}) => {
  const form = useForm<ExtractionConfigV1FormType>({
    resolver: standardSchemaResolver(ExtractionConfigV1FormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      config: {
        version: "v1",
        name: "Detailed Config",
        description: "Detailed resume extraction config",
        fields: [],
      },
    },
  });

  const { handleSubmit, reset } = form;

  const onSubmit: SubmitHandler<ExtractionConfigV1FormType> = (data) => {
    toast.success("config submitted");
    console.log("Form data submitted:", data);
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
              <ConfigPreview />
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
};
