"use client";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
// UTILS
import { uploadTaskFiles, formatFileSize, uploadFileMultipart } from "@/lib/utils";
import { ParsingTaskError } from "@/lib/errors";
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
import { Input } from "@/ui/input";
import { Button, buttonVariants } from "@/ui/button";
// CUSTOM COMPONENTS
import { MultiFileDropzone } from "@/components/multi-file-dropzone";
// TYPES
import type { SubmitHandler } from "react-hook-form";
import type { ParsingTaskFormType } from "@/lib/types";
// CONSTANTS
import { ACCEPTED_ARCHIVE_TYPES, TASK_FILE_UPLOAD_SIZE } from "@/constants";
import { Skeleton } from "@/ui/skeleton";
import {
  FileText,
  Settings,
  Upload,
  Zap,
  Clock,
  HardDrive,
} from "lucide-react";

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

  const { mutateAsync: deleteParsingTask } = useMutation(
    api.parsingTask.delete.mutationOptions(),
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
      taskFiles: [],
    },
  });

  const { control, formState, handleSubmit, setValue, watch, reset } =
    parsingTaskForm;

  const taskFiles = watch("taskFiles");
  const taskFilesSize = taskFiles.reduce((acc, { file }) => acc + file.size, 0);

  const onSubmit: SubmitHandler<ParsingTaskFormType> = async (formData) => {
    try {
      const { taskName, taskFiles: taskFiles, extractionConfigId } = formData;

      const filesMetadata = taskFiles.map(({ file }) => ({
        originalName: file.name,
        contentType: file.type,
        size: file.size,
      }));

      const allArchiveFiles = filesMetadata.every((file) =>
        ACCEPTED_ARCHIVE_TYPES.includes(file.contentType),
      );

      const createParsingTaskRes = await createParsingTask({
        taskName,
        totalFiles: allArchiveFiles ? undefined : taskFiles.length,
        extractionConfigId,
      });

      if (createParsingTaskRes.status === "FAILED") {
        throw new ParsingTaskError(createParsingTaskRes.message);
      }

      const taskId = createParsingTaskRes.data.taskId;

      const { status, message, data } = await getTaskFileUploadUrl({
        taskId,
        filesMetadata: filesMetadata,
        bucketName: allArchiveFiles ? "archive-files" : "parseable-files",
      });

      if (status === "FAILED") {
        throw new ParsingTaskError(message, true, taskId);
      }

      const bucketFilesInfo = data?.bucketFilesInfo;
      if (bucketFilesInfo === undefined) {
        throw new ParsingTaskError("bucketFilesInfo not found", true, taskId);
      }

      // Upload files - use multipart for files > 100MB
      const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
      
      const uploadPromises = bucketFilesInfo.map((bucketFileInfo, index) => {
        const file = taskFiles.find(
          (f) => f.file.name === bucketFileInfo.originalName && f.file.size === bucketFileInfo.size
        );

        if (!file) {
          throw new Error("File not found");
        }

        const progressCallback = (progress: number, estimatedTimeRemaining?: number) => {
          setValue(`taskFiles.${index}.progress`, progress);
          setValue(`taskFiles.${index}.estimatedTimeRemaining`, estimatedTimeRemaining);
        };

        // Use multipart upload for large files
        if (file.file.size > MULTIPART_THRESHOLD) {
          return uploadFileMultipart({
            file: file.file,
            bucketFileInfo,
            progressCallback,
            api,
          });
        } else {
          // Use regular upload for smaller files
          return fetch(bucketFileInfo.presignedUrl, {
            method: 'PUT',
            body: file.file,
            headers: {
              'Content-Type': file.file.type,
            },
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Upload failed with status ${res.status}`);
            }
            progressCallback(100);
          });
        }
      });

      await Promise.all(uploadPromises);

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
      if (error instanceof ParsingTaskError) {
        toast.message(error.message);
        if (error.abort && error.taskId) {
          const deleteParsingTaskRes = await deleteParsingTask({
            taskId: error.taskId,
          });

          if (deleteParsingTaskRes.status === "SUCCESS") {
            toast.message("Aborting parsing task");
          }
        }
      } else if (error instanceof Error) {
        toast.message(error.message);
      } else {
        toast.message("An unknown error occurred.");
      }
    } finally {
      reset();
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header Section */}
      <div className="space-y-4 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <Zap className="h-8 w-8" />
        </div>
        <h1 className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-4xl font-bold text-transparent dark:from-white dark:to-gray-300">
          Create Parsing Task
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          Transform your documents with AI-powered parsing. Upload files and
          configure extraction settings to get started.
        </p>
      </div>

      <Form {...parsingTaskForm}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Configuration Section */}
          <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg dark:from-gray-900 dark:to-gray-800">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Task Configuration</CardTitle>
                  <CardDescription>
                    Set up your parsing task with a name and extraction
                    configuration
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={control}
                name="taskName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2 text-base font-medium">
                      <span>Task Name</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-12 text-base"
                        placeholder="Enter a descriptive name for your parsing task"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="extractionConfigId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2 text-base font-medium">
                      Extraction Configuration
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Choose how to extract data from your files" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {extractionConfigListLoading ? (
                          [...Array<number>(2)].map((_, index) => (
                            <Skeleton key={index} className="mb-1.5 h-8" />
                          ))
                        ) : extractionConfigList?.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-muted-foreground mb-3 text-sm">
                              No extraction configurations found
                            </p>
                            <Link
                              href="/dashboard/extraction-config/new"
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                            >
                              Create new config
                            </Link>
                          </div>
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                    <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">File Upload</CardTitle>
                    <CardDescription>
                      Upload the files you want to parse and extract data from
                    </CardDescription>
                  </div>
                </div>
              </div>

              <FormField
                control={control}
                name="taskFiles"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <MultiFileDropzone
                        value={taskFiles.map(
                          ({ file, progress, estimatedTimeRemaining }) => ({
                            file,
                            key: file.name,
                            progress,
                            estimatedTimeRemaining,
                          }),
                        )}
                        onChange={(fileStates) => {
                          setValue(
                            "taskFiles",
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
                          maxSize: TASK_FILE_UPLOAD_SIZE,
                          multiple: true,
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Statistics */}
              {taskFiles.length > 0 && (
                <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
                  <div className="flex items-center space-x-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium">Total Size</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatFileSize(taskFilesSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium">Files Count</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {taskFiles.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm font-medium">Size Limit</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {formatFileSize(TASK_FILE_UPLOAD_SIZE)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <Button
                type="submit"
                disabled={formState.isValid || formState.isSubmitting}
                className="h-12 w-full px-8 text-base font-medium sm:w-auto"
                size="lg"
              >
                {formState.isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Parsing
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};
