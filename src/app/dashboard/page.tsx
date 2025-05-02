import { ParsingTaskForm } from "@/components/parsing-task-form";
import { withAuth } from "@/components/with-auth";

function Page() {
  return (
    <>
      <ParsingTaskForm />
    </>
  );
}

export default withAuth(Page);
