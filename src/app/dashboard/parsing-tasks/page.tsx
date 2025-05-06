import {
  ParsingTaskList,
  ParsingTaskListSkeleton,
} from "@/components/parsing-tasks/parsing-task-list";
import { api, getQueryClient } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

export default async function Page() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(api.parsingTask.getAll.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ParsingTaskListSkeleton />}>
        <ParsingTaskList />
      </Suspense>
    </HydrationBoundary>
  );
}
