"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// UTILS
import { signUp } from "@/lib/auth";
import { buttonVariants } from "@/ui/button";
// SCHEMAS
import { SignupSchema } from "@/lib/schema";
// TYPES
import type { SignupType } from "@/lib/types";
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
import { Button } from "@/ui/button";
// ICONS
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();

  const signupForm = useForm<SignupType>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit, control, formState } = signupForm;

  async function onSubmit(formData: SignupType) {
    const signupActionRes = await signUp.email({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    if (signupActionRes.error === null) {
      return router.replace("/dashboard");
    }

    toast.error(signupActionRes.error.message);
  }

  return (
    <Card className="mx-auto my-16 w-96 max-w-lg bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-xl font-semibold">
          Sign Up
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...signupForm}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
            <FormField
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      placeholder="Confirm your password"
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
        Already have an account?&nbsp;
        <Link
          href="/auth/login"
          className={cn(buttonVariants({ variant: "link" }), "px-0")}
        >
          Log in
        </Link>
      </CardFooter>
    </Card>
  );
}
