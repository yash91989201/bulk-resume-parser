import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { auth } from "@/server/utils/auth";

export function withAuth<T extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<T>,
) {
  return async function AuthWrapper(props: T) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session == null) {
      unauthorized();
    }

    return <WrappedComponent {...props} />;
  };
}
