import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
// UTILS
import { auth } from "@/server/utils/auth";
// CUSTOM COMPONENTS
import { ParsingTaskForm } from "@/components/parsing-task-form";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session == null) {
    unauthorized();
  }

  return (
    <>
      <ParsingTaskForm />
    </>
  );
}
