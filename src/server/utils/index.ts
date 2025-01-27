import "server-only";
import amqp from "amqplib";
import * as Minio from "minio";
// UTILS
import { env } from "@/env.js";
// TYPES
import type internal from "stream";
import type { Readable } from "stream";
// CONSTANTS
import { STORAGE_BUCKETS } from "@/constants";

export const isBucketNameValid = (
  bucketName: string,
): bucketName is keyof typeof STORAGE_BUCKETS => {
  return Object.values(STORAGE_BUCKETS).includes(
    bucketName as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS],
  );
};

export const nodeStreamToWebReadable = (
  nodeStream: Readable,
): ReadableStream<Uint8Array> => {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk)); // Ensure chunk is Uint8Array
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
};

export const s3Client = new Minio.Client({
  endPoint: env.S3_HOST,
  port: env.S3_PORT,
  accessKey: env.S3_ACCESS_KEY,
  secretKey: env.S3_SECRET_KEY,
  useSSL: env.S3_USE_SSL,
});

export async function createBucketIfNotExists(bucketName: string) {
  const bucketExists = await s3Client.bucketExists(bucketName);

  if (!bucketExists) {
    await s3Client.makeBucket(bucketName);
  }
}

/**
 * Save file in S3 bucket
 * @param bucketName name of the bucket
 * @param fileName name of the file
 * @param file file to save
 */
export async function saveFileInBucket({
  bucketName,
  fileName,
  file,
}: {
  bucketName: string;
  fileName: string;
  file: Buffer | internal.Readable;
}) {
  // Create bucket if it doesn't exist
  await createBucketIfNotExists(bucketName);

  // check if file exists - optional.
  // Without this check, the file will be overwritten if it exists
  const fileExists = await checkFileExistsInBucket({
    bucketName,
    fileName,
  });

  if (fileExists) {
    throw new Error("File already exists");
  }

  // Upload image to S3 bucket
  await s3Client.putObject(bucketName, fileName, file);
}

/**
 * Check if file exists in bucket
 * @param bucketName name of the bucket
 * @param fileName name of the file
 * @returns true if file exists, false if not
 */
export async function checkFileExistsInBucket({
  bucketName,
  fileName,
}: {
  bucketName: string;
  fileName: string;
}) {
  try {
    await s3Client.statObject(bucketName, fileName);
  } catch (error) {
    return false;
  }
  return true;
}

/**
 * Get file from S3 bucket
 * @param bucketName name of the bucket
 * @param fileName name of the file
 * @returns file from S3
 */
export const getFileFromBucket = async ({
  bucketName,
  fileName,
}: {
  bucketName: string;
  fileName: string;
}) => {
  try {
    await s3Client.statObject(bucketName, fileName);
  } catch (error) {
    console.error(error);
    return null;
  }

  return await s3Client.getObject(bucketName, fileName);
};

export const createPresignedUrlToUpload = async ({
  bucketName,
  fileName,
  expiry = 60 * 60, // 1 hour
}: {
  bucketName: string;
  fileName: string;
  expiry?: number;
}) => {
  await createBucketIfNotExists(bucketName);

  return await s3Client.presignedPutObject(bucketName, fileName, expiry);
};

export async function createPresignedUrlToDownload({
  bucket,
  fileName,
  expiry = 60 * 60, // 1 hour
}: {
  bucket: string;
  fileName: string;
  expiry?: number;
}) {
  return await s3Client.presignedGetObject(bucket, fileName, expiry);
}

/**
 * Publishes a message to a RabbitMQ queue.
 */
export const publishToQueue = async ({
  queueName,
  message,
}: {
  queueName: string;
  message: string;
}): Promise<boolean> => {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assert the queue
    await channel.assertQueue(queueName, { durable: true });

    // Publish the message
    const isSent = channel.sendToQueue(queueName, Buffer.from(message), {
      persistent: true,
    });

    console.log(
      `Task published to RabbitMQ for message: ${JSON.stringify(message)}`,
    );

    // Close RabbitMQ connection after a short delay
    setTimeout(() => {
      void channel.close();
      void connection.close();
    }, 500);

    return isSent; // Returns true if the message was sent successfully
  } catch (error) {
    console.error(
      `Failed to publish message to queue: ${(error as Error).message}`,
    );
    return false;
  }
};
