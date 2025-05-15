import type { S3BucketType } from "@/lib/types";
import type * as Minio from "minio";
import type internal from "stream";
import type { Readable } from "stream";

interface S3ServiceInterface {
  s3Client: Minio.Client;
  uploadUrlExpiry: number;
  downloadUrlExpiry: number;

  createBucket: (bucketName: S3BucketType) => Promise<void>;
  saveFile: (params: {
    bucketName: S3BucketType;
    fileName: string;
    file: Buffer | internal.Readable;
  }) => Promise<void>;
  getFile: (params: {
    bucketName: S3BucketType;
    fileName: string;
  }) => Promise<Readable | null>;
  checkFileExists: (params: {
    bucketName: S3BucketType;
    fileName: string;
  }) => Promise<boolean>;

  createUploadUrl: (params: {
    bucketName: S3BucketType;
    fileName: string;
    expiry?: number;
  }) => Promise<string>;
  createDownloadUrl: (params: {
    bucketName: S3BucketType;
    fileName: string;
    expiry?: number;
  }) => Promise<string>;
}

export class S3Service implements S3ServiceInterface {
  s3Client: Minio.Client;
  uploadUrlExpiry: number;
  downloadUrlExpiry: number;

  constructor(
    s3Client: Minio.Client,
    uploadUrlExpiry = 3600,
    downloadUrlExpiry = 3600,
  ) {
    this.s3Client = s3Client;
    this.uploadUrlExpiry = uploadUrlExpiry;
    this.downloadUrlExpiry = downloadUrlExpiry;
  }

  async createBucket(bucketName: S3BucketType): Promise<void> {
    const bucketExists = await this.s3Client.bucketExists(bucketName);

    if (!bucketExists) {
      await this.s3Client.makeBucket(bucketName);
    }
  }

  async saveFile(params: {
    bucketName: S3BucketType;
    fileName: string;
    file: Buffer | Readable;
  }): Promise<void> {
    const { bucketName, fileName, file } = params;

    await this.createBucket(bucketName);

    const fileExists = await this.checkFileExists({
      bucketName,
      fileName,
    });

    if (fileExists) {
      throw new Error("File already exists");
    }

    await this.s3Client.putObject(bucketName, fileName, file);
  }

  async getFile(params: {
    bucketName: S3BucketType;
    fileName: string;
  }): Promise<Readable | null> {
    const { bucketName, fileName } = params;
    try {
      await this.s3Client.statObject(bucketName, fileName);
    } catch (error) {
      console.error(error);
      return null;
    }

    return await this.s3Client.getObject(bucketName, fileName);
  }

  async checkFileExists(params: {
    bucketName: S3BucketType;
    fileName: string;
  }): Promise<boolean> {
    const { bucketName, fileName } = params;
    try {
      await this.s3Client.statObject(bucketName, fileName);
    } catch (error) {
      console.log(error);
      return false;
    }
    return true;
  }

  async createUploadUrl(params: {
    bucketName: S3BucketType;
    fileName: string;
    expiry?: number;
  }): Promise<string> {
    const { bucketName, fileName, expiry = this.uploadUrlExpiry } = params;

    await this.createBucket(bucketName);

    return await this.s3Client.presignedPutObject(bucketName, fileName, expiry);
  }

  async createDownloadUrl(params: {
    bucketName: S3BucketType;
    fileName: string;
    expiry?: number;
  }): Promise<string> {
    const { bucketName, fileName, expiry = this.downloadUrlExpiry } = params;

    return await this.s3Client.presignedGetObject(bucketName, fileName, expiry);
  }
}
