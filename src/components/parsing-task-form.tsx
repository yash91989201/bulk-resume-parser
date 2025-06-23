"use client";
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
import { Badge } from "@/ui/badge";
// CUSTOM COMPONENTS
import { MultiFileDropzone } from "@/components/multi-file-dropzone";
// TYPES
import type { SubmitHandler } from "react-hook-form";
import type { ParsingTaskFormType } from "@/lib/types";
// CONSTANTS
import { ACCEPTED_ARCHIVE_TYPES, MAX_FILE_SIZE_S3_ENDPOINT } from "@/constants";
import { Skeleton } from "@/ui/skeleton";
import Link from "next/link";
import {
  FileText,
  Settings,
  Upload,
  CheckCircle,
  AlertCircle,
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

      const { status, message, data } = await getTaskFileUploadUrl({
        taskId,
        filesMetadata: filesMetadata,
        bucketName: allArchiveFiles ? "archive-files" : "parseable-files",
      });

      if (status === "FAILED") {
        throw new Error(message);
      }

      const bucketFilesInfo = data?.bucketFilesInfo;
      if (bucketFilesInfo === undefined) {
        throw new Error("bucketFilesInfo not found");
      }

      await uploadTaskFiles({
        bucketFilesInfo: bucketFilesInfo,
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

  const totalFileSize = taskFilesState.reduce(
    (acc, { file }) => acc + file.size,
    0,
  );
  const isOverSizeLimit =
    totalFileSize > MAX_FILE_SIZE_S3_ENDPOINT * 1024 * 1024;

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Configuration Section */}
          <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="pb-6">
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
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="pb-6">
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
                {taskFilesState.length > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {taskFilesState.length} file
                    {taskFilesState.length !== 1 ? "s" : ""} selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={control}
                name="taskFilesState"
                render={() => (
                  <FormItem>
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
                          maxSize: MAX_FILE_SIZE_S3_ENDPOINT * 1024 * 1024,
                          multiple: true,
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Statistics */}
              {taskFilesState.length > 0 && (
                <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
                  <div className="flex items-center space-x-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium">Total Size</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatFileSize(totalFileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium">Files Count</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {taskFilesState.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm font-medium">Size Limit</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {formatFileSize(
                          MAX_FILE_SIZE_S3_ENDPOINT * 1024 * 1024,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Size Warning */}
              {isOverSizeLimit && (
                <div className="flex items-center space-x-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      File size limit exceeded
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Please reduce the total file size to under{" "}
                      {formatFileSize(MAX_FILE_SIZE_S3_ENDPOINT * 1024 * 1024)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg dark:from-gray-900 dark:to-gray-800">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium">Ready to start parsing</p>
                    <p className="text-muted-foreground text-sm">
                      Your files will be processed using the selected
                      configuration
                    </p>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={
                    formState.isSubmitting ||
                    isOverSizeLimit ||
                    taskFilesState.length === 0
                  }
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
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};
