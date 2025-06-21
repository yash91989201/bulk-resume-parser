"use client";

import type {
  ExtractionConfigType,
  ExtractionConfigV0Type,
  ExtractionConfigV1Type,
} from "@/lib/extraction-config/types";
import { useTRPC } from "@/trpc/react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useRouter } from "next/navigation";

export const ExtractionConfigCard = ({
  id,
  name,
  config,
}: {
  id: string;
  name: string;
  config: ExtractionConfigType;
}) => {
  const api = useTRPC();

  const router = useRouter();
  const { version, description, fields } = config;
  const { mutateAsync } = useMutation(
    api.extractionConfig.delete.mutationOptions(),
  );

  const editExtractionConfig = () => {
    router.push(`/dashboard/extraction-config/edit/${id}`);
  };
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{name}</CardTitle>
            <CardDescription>
              {version} - {description}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={editExtractionConfig}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={deleteExtractionConfig}>
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {fields.map((field) => (
            <AccordionItem key={field.key} value={field.key}>
              <AccordionTrigger>{field.label ?? field.key}</AccordionTrigger>
              <AccordionContent>
                {version === "v0" && "prompt" in field && (
                  <V0FieldConfigDetails field={field} />
                )}
                {version === "v1" && "description" in field && (
                  <V1FieldConfigDetails field={field} />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

const V0FieldConfigDetails = ({
  field,
}: {
  field: ExtractionConfigV0Type["fields"][number];
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <p>
        <span className="font-semibold">Prompt:</span> {field.prompt}
      </p>
      <p>
        <span className="font-semibold">Output Example:</span> {field.example}
      </p>
    </div>
  );
};

const V1FieldConfigDetails = ({
  field,
}: {
  field: ExtractionConfigV1Type["fields"][number];
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <p>
        <span className="font-semibold">Description:</span> {field.description}
      </p>
      <p>
        <span className="font-semibold">Note:</span> {field.note}
      </p>
    </div>
  );
};
