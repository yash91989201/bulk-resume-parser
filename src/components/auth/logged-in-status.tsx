import Link from "next/link";
import { headers } from "next/headers";
// UTLS
import { auth } from "@/server/utils/auth";
import { buttonVariants } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

export async function LoggedInStatus() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session ? (
    <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
      Dashboard
    </Link>
  ) : (
    <div className="flex items-center space-x-4">
      <Link href="/auth/login" className={buttonVariants()}>
        Log In
      </Link>
      <Link
        href="/auth/signup"
        className={buttonVariants({
          variant: "outline",
        })}
      >
        Sign Up
      </Link>
    </div>
  );
}

export const LoggedInStatusSkeleon = () => {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-9 w-16 rounded-md" />
      <Skeleton className="h-9 w-20 rounded-md" />
    </div>
  );
};
