"use client";

import { useTRPC } from "@/trpc/react";
// TYPES
import type { ExtractionConfigType } from "@/lib/extraction-config/types";
// UI
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/ui/button";

export const ExtractionConfigCard = ({
  id,
  name,
  config,
}: {
  id: string;
  name: string;
  config: ExtractionConfigType;
}) => {
  const { version, description, fields } = config;
  const api = useTRPC();
  const { mutateAsync } = useMutation(
    api.extractionConfig.delete.mutationOptions(),
  );

  const deleteExtractionConfig = async () => {
    const actionRes = await mutateAsync({ configId: id });
    if (actionRes.status === "SUCCESS") {
      toast.success(actionRes.message);
    } else {
      toast.error(actionRes.message);
    }
  };

  return (
    <Card className="min-w-lg">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>
          {version} - {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => deleteExtractionConfig()}>Delete</Button>
        <p>Fields</p>
        <ul className="list-inside list-disc">
          {fields.map((field) => (
            <li key={field.key}>{field.label}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
