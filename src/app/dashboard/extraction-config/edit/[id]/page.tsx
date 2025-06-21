import { EmptyState } from "@/components/empty-state";
import { ExtractionConfigV0Form } from "@/components/extraction-config-form/v0";
import { ExtractionConfigV1Form } from "@/components/extraction-config-form/v1";
import { caller } from "@/trpc/server";
import { AlertTriangle, FileX } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  const extractionConfig = await caller.extractionConfig.get(id);

  if (!extractionConfig) {
    return (
      <EmptyState
        icon={<FileX className="h-12 w-12 text-gray-400" />}
        heading="Extraction Config Not Found"
        text="The extraction configuration you are looking for does not exist."
      />
    );
  }

  switch (extractionConfig.config.version) {
    case "v0": {
      return (
        <ExtractionConfigV0Form
          defaultValues={{
            name: extractionConfig.name,
            config: extractionConfig.config,
          }}
        />
      );
    }

    case "v1": {
      return (
        <ExtractionConfigV1Form
          defaultValues={{
            name: extractionConfig.name,
            config: extractionConfig.config,
          }}
        />
      );
    }

    default: {
      return (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-yellow-400" />}
          heading="Invalid Config Version"
          text="The extraction configuration has an invalid version."
        />
      );
    }
  }
}
