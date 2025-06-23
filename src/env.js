import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url(),
  },
  server: {
    DATABASE_URL: z.url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_TRUSTED_ORIGINS: z
      .string()
      .transform((val) => val.split(",").map((url) => url.trim()))
      .refine((urls) => urls.every((url) => z.url().safeParse(url).success), {
        message: "All trusted origins must be valid URLs.",
      }),
    S3_ENDPOINT: z.url().default("http://minio:9000"),
    S3_PORT: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "S3_PORT must be a valid number",
      })
      .transform((val) => Number(val))
      .optional(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_USE_SSL: z
      .string()
      .refine((val) => ["true", "false"].includes(val.toLowerCase()), {
        message: "S3_USE_SSL must be either 'true' or 'false'",
      })
      .transform((val) => val.toLowerCase() === "true")
      .optional(),
    RABBITMQ_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_PORT: process.env.S3_PORT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_USE_SSL: process.env.S3_USE_SSL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
