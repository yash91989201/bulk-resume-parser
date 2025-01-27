"use client";

import React from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// UTILS
import {
  uploadTaskFiles,
  createParseableFiles,
  getBucketFilesInfo,
  MAX_FILE_SIZE_S3_ENDPOINT,
} from "@/lib/utils";
import { api } from "@/trpc/react";
// SCHEMAS
import { ParsingTaskFormSchema } from "@/lib/schema";
// UI
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  FormMessage,
  FormControl,
  FormItem,
  FormLabel,
  FormField,
  Form,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// CUSTOM COMPONENTS
import { MultiFileDropzone } from "@/components/multi-file-dropzone";
// TYPES
import type { SubmitHandler } from "react-hook-form";
import type { ParseableFileInsertType, ParsingTaskFormType } from "@/lib/types";
// CONSTANTS
import { ACCEPTED_FILE_TYPES, STORAGE_BUCKETS } from "@/constants";

export const ParsingTaskForm = () => {
  const { mutateAsync: createParsingTask } =
    api.parsingTask.create.useMutation();

  const { mutateAsync: startParsing } =
    api.parsingTask.startParsing.useMutation();

  const parsingTaskForm = useForm<ParsingTaskFormType>({
    resolver: zodResolver(ParsingTaskFormSchema),
    defaultValues: {
      taskName: "",
      taskFilesState: [],
    },
  });

  const { control, formState, handleSubmit, setValue, watch, reset } =
    parsingTaskForm;
  const taskFilesState = watch("taskFilesState");

  const onSubmit: SubmitHandler<ParsingTaskFormType> = async (formData) => {
    try {
      const { taskName, taskFilesState } = formData;

      const createParsingTaskRes = await createParsingTask({ taskName });
      if (createParsingTaskRes.status === "FAILED") {
        throw new Error(createParsingTaskRes.message);
      }

      const taskId = createParsingTaskRes.data.taskId;

      const filesMetaData = taskFilesState.map(({ file }) => ({
        originalName: file.name,
        contentType: file.type,
        size: file.size,
      }));

      const allArchiveFiles = filesMetaData.every((file) =>
        ACCEPTED_FILE_TYPES.ARCHIVE_FILES.includes(file.contentType),
      );

      const bucketFilesInfo = await getBucketFilesInfo({
        taskId,
        filesMetaData: filesMetaData,
        bucketName: allArchiveFiles
          ? STORAGE_BUCKETS.ARCHIVE_FILES
          : STORAGE_BUCKETS.PARSEABLE_FILES,
      });

      await uploadTaskFiles({
        bucketFilesInfo,
        files: taskFilesState.map((file) => file.file),
        progressCallback: (fileIndex, progress) => {
          setValue(`taskFilesState.${fileIndex}.progress`, progress);
        },
      });

      if (!allArchiveFiles) {
        const parseableFiles: ParseableFileInsertType[] = bucketFilesInfo.map(
          (info) => ({
            ...info,
            parsingTaskId: taskId,
          }),
        );

        await createParseableFiles(parseableFiles);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Create Parsing Task
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Upload files to start a new parsing task. Ensure the total file size
            does not exceed {MAX_FILE_SIZE_S3_ENDPOINT} MB.
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
                        className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        placeholder="Enter task name"
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-600" />
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
                        value={taskFilesState.map(({ file, progress }) => ({
                          file,
                          key: file.name,
                          progress,
                        }))}
                        onChange={(fileStates) => {
                          setValue(
                            "taskFilesState",
                            fileStates.map(({ file, progress }) => ({
                              file,
                              progress: progress || "PENDING",
                            })),
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
    </div>
  );
};
