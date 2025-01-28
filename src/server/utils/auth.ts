import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// UTILS
import { db } from "@/server/db";
// TABLES
import {
  userTable,
  accountTable,
  sessionTable,
  verificationTable,
} from "@/server/db/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: userTable,
      account: accountTable,
      session: sessionTable,
      verification: verificationTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export const protectApiRoute = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session === null) {
    return NextResponse.json(
      {
        status: "FAILED",
        message:
          "You are not authorized to perform this action. Please Log In first.",
      },
      { status: 401 },
    );
  }
};
