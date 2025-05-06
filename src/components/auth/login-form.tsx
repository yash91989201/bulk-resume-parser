"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// UTILS
import { signIn } from "@/lib/auth";
// SCHEMAS
import { LoginSchema } from "@/lib/schema";
// TYPES
import type { LoginType } from "@/lib/types";
// HOOKS
import { useRouter } from "next/navigation";
// UI
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button, buttonVariants } from "@/ui/button";
// ICONS
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();

  const loginForm = useForm<LoginType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { control, handleSubmit, formState } = loginForm;

  async function onSubmit(formData: LoginType) {
    const loginActionRes = await signIn.email({
      email: formData.email,
      password: formData.password,
    });

    if (loginActionRes.error === null) {
      return router.replace("/dashboard");
    }

    toast.error(loginActionRes.error.message);
  }

  return (
    <Card className="mx-auto my-16 w-96 max-w-lg bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-xl font-semibold">
          Admin Login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...loginForm}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      placeholder="Enter your email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      placeholder="Enter your password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full">
              {formState.isSubmitting && (
                <Loader2 className="mr-3 animate-spin" />
              )}
              Log in
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-muted-foreground justify-center text-sm">
        Don’t have an account?&nbsp;
        <Link
          href="/auth/signup"
          className={cn(buttonVariants({ variant: "link" }), "px-0")}
        >
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
