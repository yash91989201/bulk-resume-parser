"use client";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// TYPES
import type { ParsingTaskType } from "@/lib/types";
// UTILS
import { cn } from "@/lib/utils";
// CUSTOM HOOKS
import { useTRPC } from "@/trpc/react";
// UI
import { Progress } from "@/ui/progress";
import { Button } from "@/ui/button";
// ICONS
import { Loader2 } from "lucide-react";

export const ParsingTaskCard = ({ task }: { task: ParsingTaskType }) => {
  const progressValue = Math.round(
    (task.processedFiles / (task.totalFiles || 1)) * 100,
  );

  const showDownloads = task.taskStatus === "completed";

  const api = useTRPC();
  const queryClient = useQueryClient();
  const { isPending: isDownloadSheetPending, mutateAsync } = useMutation(
    api.presignedUrl.getSheetDownloadUrl.mutationOptions(),
  );

  const {
    isPending: isDownloadJsonPending,
    mutateAsync: downloadJsonMutation,
  } = useMutation(api.presignedUrl.getSheetDownloadUrl.mutationOptions());

  const {
    isPending: isDeletingParsingTask,
    mutateAsync: deleteParsingTaskMutation,
  } = useMutation(api.parsingTask.delete.mutationOptions());

  const downloadSheet = async () => {
    if (task.sheetFilePath) {
      const downloadUrl = await mutateAsync({ taskId: task.id });
      window.open(downloadUrl, "_blank");
    }
  };

  const downloadJson = async () => {
    if (task.jsonFilePath) {
      const downloadUrl = await downloadJsonMutation({ taskId: task.id });
      window.open(downloadUrl, "_blank");
    }
  };

  const deleteParsingTask = async () => {
    const deleteRes = await deleteParsingTaskMutation({ taskId: task.id });
    if (deleteRes.status === "SUCCESS") {
      await queryClient.refetchQueries(api.parsingTask.getAll.queryOptions());
    }
  };

  return (
    <div className="rounded-lg border border-l-4 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <Link href={`/dashboard/parsing-tasks/${task.id}`}>
          <h3 className="cursor-pointer font-medium text-gray-900 hover:underline">
            {task.taskName}
          </h3>
        </Link>

        <span className={cn("rounded-full px-2 py-1 text-sm")}>
          {task.taskStatus.replace(/_/g, " ")}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {task.processedFiles}/{task.totalFiles} files
          </span>
          {task.invalidFiles > 0 && (
            <span className="text-red-600">{task.invalidFiles} errors</span>
          )}
        </div>

        <Progress value={progressValue} className="h-2 bg-gray-200" />

        {showDownloads && (
          <div className="mt-3 flex flex-wrap gap-2">
            {task.sheetFilePath && (
              <Button onClick={() => downloadSheet()} variant="outline">
                {isDownloadSheetPending && (
                  <Loader2 className="mr-3 animate-spin" />
                )}
                Download sheet
              </Button>
            )}

            {task.jsonFilePath && (
              <Button onClick={() => downloadJson()} variant="outline">
                {isDownloadJsonPending && (
                  <Loader2 className="mr-3 animate-spin" />
                )}
                Download json
              </Button>
            )}
          </div>
        )}

        <Button onClick={() => deleteParsingTask()} variant="outline">
          {isDeletingParsingTask && <Loader2 className="mr-3 animate-spin" />}
          Delete Task
        </Button>
      </div>
    </div>
  );
};

export const ParsingTaskCardSkeleton = () => {
  return (
    <div className="animate-pulse rounded-lg border border-l-4 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-6 w-1/4 rounded-full bg-gray-200" />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="h-3 w-1/4 rounded bg-gray-200" />
          <div className="h-3 w-1/5 rounded bg-gray-200" />
        </div>

        <Progress value={33} className="h-2 bg-gray-200" />

        <div className="flex gap-2 pt-2">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="h-6 w-24 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
};
