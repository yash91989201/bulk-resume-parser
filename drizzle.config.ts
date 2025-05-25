import { z } from "zod/v4";
import { createEnv } from "@t3-oss/env-nextjs";
// TYPES
import type { Config } from "drizzle-kit";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

export default {
  dialect: "mysql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["bulk-resume-parser_*"],
} satisfies Config;
