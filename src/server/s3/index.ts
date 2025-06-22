import * as Minio from "minio";
// UTILS
import { env } from "@/env";

/**
 * Cache the S3 client in development to avoid re-creating it on every HMR update.
 */
const globalForS3 = globalThis as unknown as {
  s3Client: Minio.Client | undefined;
};

const s3Client =
  globalForS3.s3Client ??
  new Minio.Client({
    endPoint: "minio",
    port: env.S3_PORT,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    useSSL: env.S3_USE_SSL,
  });

if (env.NODE_ENV !== "production") globalForS3.s3Client = s3Client;

export { s3Client };
