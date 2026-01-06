"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
// TYPES
import type { ParsingTaskType } from "@/lib/types";
// UTILS
import { cn } from "@/lib/utils";
// CUSTOM HOOKS
import { useTRPC } from "@/trpc/react";
// UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import { Progress } from "@/ui/progress";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
// ICONS
import {
  Clock,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Trash2,
  Sheet,
} from "lucide-react";

const TASK_STATUSES = [
  "all",
  "created",
  "extracting",
  "converting",
  "parsing",
  "aggregating",
  "completed",
  "failed",
] as const;

type TaskStatus = (typeof TASK_STATUSES)[number];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

function formatDuration(startDate: Date, endDate: Date): string {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "created":
      return "bg-gray-100 text-gray-800";
    case "extracting":
    case "converting":
    case "parsing":
    case "aggregating":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

interface TaskRowActionsProps {
  task: ParsingTaskType;
}

const TaskRowActions = ({ task }: TaskRowActionsProps) => {
  const api = useTRPC();
  const queryClient = useQueryClient();

  const {
    isPending: isDownloadSheetPending,
    mutateAsync: downloadSheetMutation,
  } = useMutation(api.presignedUrl.getSheetDownloadUrl.mutationOptions());

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
      const downloadUrl = await downloadSheetMutation({ taskId: task.id });
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

  const showDownloads = task.taskStatus === "completed";

  return (
    <div className="flex items-center gap-2">
      {showDownloads && task.sheetFilePath && (
        <Button
          onClick={downloadSheet}
          variant="ghost"
          size="sm"
          disabled={isDownloadSheetPending}
          title="Download Sheet"
        >
          {isDownloadSheetPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sheet className="h-4 w-4" />
          )}
          <span className="sr-only">Download Sheet</span>
        </Button>
      )}
      {showDownloads && task.jsonFilePath && (
        <Button
          onClick={downloadJson}
          variant="ghost"
          size="sm"
          disabled={isDownloadJsonPending}
          title="Download JSON"
        >
          {isDownloadJsonPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="sr-only">Download JSON</span>
        </Button>
      )}
      <Button
        onClick={deleteParsingTask}
        variant="ghost"
        size="sm"
        disabled={isDeletingParsingTask}
        title="Delete Task"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        {isDeletingParsingTask ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        <span className="sr-only">Delete Task</span>
      </Button>
    </div>
  );
};

export const ParsingTaskList = () => {
  const api = useTRPC();
  const { data: taskList } = useSuspenseQuery(
    api.parsingTask.getAll.queryOptions(undefined, {
      refetchInterval: 2000,
    }),
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Filter state
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("all");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter and search logic
  const filteredTasks = useMemo(() => {
    let result = taskList;

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => task.taskStatus === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((task) =>
        task.taskName.toLowerCase().includes(query),
      );
    }

    return result;
  }, [taskList, statusFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: TaskStatus) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all"
                    ? "All Statuses"
                    : status.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Files</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-gray-500"
                >
                  {filteredTasks.length === 0 && taskList.length > 0
                    ? "No tasks match your search criteria."
                    : "No parsing tasks found."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((task) => {
                const progressValue = Math.round(
                  (task.processedFiles / (task.totalFiles || 1)) * 100,
                );

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/parsing-tasks/${task.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {task.taskName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium capitalize",
                          getStatusColor(task.taskStatus),
                        )}
                      >
                        {task.taskStatus.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress value={progressValue} className="h-2 w-20" />
                        <span className="text-xs text-gray-500">
                          {progressValue}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {task.processedFiles}/{task.totalFiles}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatDuration(
                          new Date(task.createdAt),
                          new Date(task.updatedAt),
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.invalidFiles > 0 ? (
                        <span className="text-sm text-red-600">
                          {task.invalidFiles}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TaskRowActions task={task} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredTasks.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredTasks.length)} of{" "}
              {filteredTasks.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage >= totalPages}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ParsingTaskListSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Search and Filter Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-[150px]" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Files</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-2 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
};
