"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/ui/progress";
import { type ParsingTaskType } from "@/lib/types";
import Link from "next/link";

export const ParsingTaskCard = ({ task }: { task: ParsingTaskType }) => {
  const progressValue = Math.round(
    (task.processedFiles / (task.totalFiles || 1)) * 100,
  );

  const showDownloads = task.taskStatus === "completed";

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
              <a
                href={task.sheetFilePath}
                download
                className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
              >
                Download Sheet
              </a>
            )}
            {task.jsonFilePath && (
              <a
                href={task.jsonFilePath}
                download
                className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-900"
              >
                Download JSON
              </a>
            )}
          </div>
        )}
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
