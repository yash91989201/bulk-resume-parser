"use client";

import { useTRPC } from "@/trpc/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ParsingTaskCard, ParsingTaskCardSkeleton } from "./parsing-task-card";

export const ParsingTaskList = () => {
  const api = useTRPC();
  const { data: taskList } = useSuspenseQuery(
    api.parsingTask.getAll.queryOptions(undefined, {
      refetchInterval: 3000,
    }),
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {taskList.map((task) => (
        <ParsingTaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};

export const ParsingTaskListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array<number>(3)].map((_, i) => (
        <ParsingTaskCardSkeleton key={i} />
      ))}
    </div>
  );
};
