"use client";

import React from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
// UTILS
import { uploadTaskFiles, formatFileSize } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
// SCHEMAS
import { ParsingTaskFormSchema } from "@/lib/schema";
// UI
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/ui/card";
import {
  FormMessage,
  FormControl,
  FormItem,
  FormLabel,
  FormField,
  Form,
} from "@/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Button, buttonVariants } from "@/ui/button";
import { Input } from "@/ui/input";
// CUSTOM COMPONENTS
import { MultiFileDropzone } from "@/components/multi-file-dropzone";
// TYPES
import type { SubmitHandler } from "react-hook-form";
import type { ParsingTaskFormType } from "@/lib/types";
// CONSTANTS
import { ACCEPTED_ARCHIVE_TYPES, MAX_FILE_SIZE_S3_ENDPOINT } from "@/constants";
import { Skeleton } from "@/ui/skeleton";
import Link from "next/link";

export const ParsingTaskForm = () => {
  const api = useTRPC();

  const { data: extractionConfigList, isLoading: extractionConfigListLoading } =
    useQuery(api.extractionConfig.getAll.queryOptions());

  const { mutateAsync: createParsingTask } = useMutation(
    api.parsingTask.create.mutationOptions(),
  );

  const { mutateAsync: startParsing } = useMutation(
    api.parsingTask.startParsing.mutationOptions(),
  );

  const { mutateAsync: createParseableFiles } = useMutation(
    api.parseableFiles.create.mutationOptions(),
  );

  const { mutateAsync: getTaskFileUploadUrl } = useMutation(
    api.presignedUrl.getTaskFileUploadUrl.mutationOptions(),
  );

  const parsingTaskForm = useForm<ParsingTaskFormType>({
    resolver: standardSchemaResolver(ParsingTaskFormSchema),
    defaultValues: {
      taskName: "",
      extractionConfigId: "",
      taskFilesState: [],
    },
  });

  const { control, formState, handleSubmit, setValue, watch, reset } =
    parsingTaskForm;

  const taskFilesState = watch("taskFilesState");

  const onSubmit: SubmitHandler<ParsingTaskFormType> = async (formData) => {
    try {
      const { taskName, taskFilesState, extractionConfigId } = formData;

      const filesMetadata = taskFilesState.map(({ file }) => ({
        originalName: file.name,
        contentType: file.type,
        size: file.size,
      }));

      const allArchiveFiles = filesMetadata.every((file) =>
        ACCEPTED_ARCHIVE_TYPES.includes(file.contentType),
      );

      const createParsingTaskRes = await createParsingTask({
        taskName,
        totalFiles: allArchiveFiles ? undefined : taskFilesState.length,
        extractionConfigId,
      });

      if (createParsingTaskRes.status === "FAILED") {
        throw new Error(createParsingTaskRes.message);
      }

      const taskId = createParsingTaskRes.data.taskId;

      const { bucketFilesInfo } = await getTaskFileUploadUrl({
        taskId,
        filesMetadata: filesMetadata,
        bucketName: allArchiveFiles ? "archive-files" : "parseable-files",
      });

      await uploadTaskFiles({
        bucketFilesInfo,
        files: taskFilesState.map((file) => file.file),
        progressCallback: (fileIndex, progress, estimatedTimeRemaining) => {
          setValue(`taskFilesState.${fileIndex}.progress`, progress);
          setValue(
            `taskFilesState.${fileIndex}.estimatedTimeRemaining`,
            estimatedTimeRemaining,
          );
        },
      });

      if (!allArchiveFiles) {
        await createParseableFiles({
          parseableFiles: bucketFilesInfo.map((info) => ({
            ...info,
            parsingTaskId: taskId,
          })),
        });
      }

      const startParsingRes = await startParsing({
        taskId,
        extractFromArchive: allArchiveFiles,
      });

      toast.message(startParsingRes.message);
    } catch (error) {
      if (error instanceof Error) {
        toast.message(error.message);
      }
    } finally {
      reset();
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Create Parsing Task
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Upload files to start a new parsing task. Ensure the total file size
          does not exceed&nbsp;
          {formatFileSize(MAX_FILE_SIZE_S3_ENDPOINT * 1024 * 1024)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...parsingTaskForm}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full rounded-md border border-gray-300 p-2 shadow-xs focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter task name"
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="extractionConfigId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extration Config</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an extraction config" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {extractionConfigListLoading ? (
                        [...Array<number>(2)].map((_, index) => (
                          <Skeleton key={index} className="mb-1.5 h-8" />
                        ))
                      ) : extractionConfigList?.length === 0 ? (
                        <Link
                          href="/dashboard/extraction-config/new"
                          className={buttonVariants({ variant: "link" })}
                        >
                          Create new config
                        </Link>
                      ) : (
                        extractionConfigList?.map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="taskFilesState"
              render={() => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task Files
                  </FormLabel>
                  <FormControl>
                    <MultiFileDropzone
                      value={taskFilesState.map(
                        ({ file, progress, estimatedTimeRemaining }) => ({
                          file,
                          key: file.name,
                          progress,
                          estimatedTimeRemaining,
                        }),
                      )}
                      onChange={(fileStates) => {
                        setValue(
                          "taskFilesState",
                          fileStates.map(
                            ({ file, progress, estimatedTimeRemaining }) => ({
                              file,
                              progress: progress || "PENDING",
                              estimatedTimeRemaining,
                            }),
                          ),
                        );
                      }}
                      dropzoneOptions={{
                        maxSize: MAX_FILE_SIZE_S3_ENDPOINT * 1024 * 1024, // Convert MB to bytes
                        multiple: true,
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-600" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={formState.isSubmitting}
              className="w-full"
            >
              {formState.isSubmitting ? "Working" : "Start parsing"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
