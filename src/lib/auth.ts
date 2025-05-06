import { env } from "@/env";
import { createAuthClient } from "better-auth/react";

export const { signUp, signIn, useSession, signOut } = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
