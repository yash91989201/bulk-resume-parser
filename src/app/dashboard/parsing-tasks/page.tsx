import {
  ParsingTaskList,
  ParsingTaskListSkeleton,
} from "@/components/parsing-tasks/parsing-task-list";
import { auth } from "@/server/utils/auth";
import { api, getQueryClient } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { Suspense } from "react";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session == null) {
    unauthorized();
  }
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
