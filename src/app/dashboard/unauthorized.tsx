import Link from "next/link";
// UTILS
import { buttonVariants } from "@/components/ui/button";
// UI
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
// ICONS
import { AlertTriangle } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Card className="w-full max-w-lg border-none text-center shadow-md">
        <CardHeader>
          <div className="flex justify-center">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl font-semibold">
            Unauthorized
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You are not authorized to view this page. Please Log In first.
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Link
            href="/auth/signup"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            Sign Up
          </Link>
          <Link href="/auth/login" className={buttonVariants()}>
            Log In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
