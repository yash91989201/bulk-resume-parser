import type { S3BucketType } from "@/lib/types";
import type * as Minio from "minio";
import type internal from "stream";
import type { Readable } from "stream";
import type { BucketItem } from "minio";

interface S3ServiceInterface {
  s3Client: Minio.Client;
  uploadUrlExpiry: number;
  downloadUrlExpiry: number;

  saveFile: (params: {
    bucketName: S3BucketType;
    fileName: string;
    file: Buffer | internal.Readable;
  }) => Promise<void>;
  getFile: (params: {
    bucketName: S3BucketType;
    fileName: string;
  }) => Promise<Readable | null>;
  getBucketFiles: (params: {
    bucketName: S3BucketType;
    prefix: string;
  }) => Promise<string[]>;
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

  // Multipart upload methods
  initiateMultipartUpload: (params: {
    bucketName: S3BucketType;
    fileName: string;
  }) => Promise<string>;
  createMultipartUploadUrl: (params: {
    bucketName: S3BucketType;
    fileName: string;
    uploadId: string;
    partNumber: number;
    expiry?: number;
  }) => Promise<string>;
  completeMultipartUpload: (params: {
    bucketName: S3BucketType;
    fileName: string;
    uploadId: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }) => Promise<void>;
  abortMultipartUpload: (params: {
    bucketName: S3BucketType;
    fileName: string;
    uploadId: string;
  }) => Promise<void>;

  deleteFile: (params: {
    bucketName: S3BucketType;
    fileName: string;
  }) => Promise<void>;
  deleteFiles: (params: {
    bucketName: S3BucketType;
    fileNames: string[];
  }) => Promise<void>;
}

export class S3Service implements S3ServiceInterface {
  s3Client: Minio.Client;
  uploadUrlExpiry: number;
  downloadUrlExpiry: number;

  constructor(
    s3Client: Minio.Client,
    uploadUrlExpiry = 7200, // 2 hours for large file uploads
    downloadUrlExpiry = 3600,
  ) {
    this.s3Client = s3Client;
    this.uploadUrlExpiry = uploadUrlExpiry;
    this.downloadUrlExpiry = downloadUrlExpiry;
  }
  async getBucketFiles(params: {
    bucketName: S3BucketType;
    prefix: string;
  }): Promise<string[]> {
    const { bucketName, prefix } = params;
    const bucketStream = this.s3Client.listObjectsV2(bucketName, prefix);

    const filePaths: string[] = [];
    for await (const obj of bucketStream as AsyncIterable<BucketItem>) {
      if (obj.name) filePaths.push(obj.name);
    }

    return filePaths;
  }

  async saveFile(params: {
    bucketName: S3BucketType;
    fileName: string;
    file: Buffer | Readable;
  }): Promise<void> {
    const { bucketName, fileName, file } = params;

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

  async deleteFile(params: {
    bucketName: S3BucketType;
    fileName: string;
  }): Promise<void> {
    const { bucketName, fileName } = params;

    const fileExists = await this.checkFileExists({
      bucketName,
      fileName,
    });

    if (fileExists) {
      await this.s3Client.removeObject(bucketName, fileName);
    }
  }

  async deleteFiles(params: {
    bucketName: S3BucketType;
    fileNames: string[];
  }): Promise<void> {
    const { bucketName, fileNames } = params;
    await this.s3Client.removeObjects(bucketName, fileNames);
  }

  async initiateMultipartUpload(params: {
    bucketName: S3BucketType;
    fileName: string;
  }): Promise<string> {
    const { bucketName, fileName } = params;
    const uploadId = await this.s3Client.initiateNewMultipartUpload(
      bucketName,
      fileName,
      {},
    );
    return uploadId;
  }

  async createMultipartUploadUrl(params: {
    bucketName: S3BucketType;
    fileName: string;
    uploadId: string;
    partNumber: number;
    expiry?: number;
  }): Promise<string> {
    const {
      bucketName,
      fileName,
      uploadId,
      partNumber,
      expiry = this.uploadUrlExpiry,
    } = params;

    return await this.s3Client.presignedUrl(
      "PUT",
      bucketName,
      fileName,
      expiry,
      {
        uploadId,
        partNumber: partNumber.toString(),
      },
    );
  }

  async completeMultipartUpload(params: {
    bucketName: S3BucketType;
    fileName: string;
    uploadId: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }): Promise<void> {
    const { bucketName, fileName, uploadId, parts } = params;
    
    // MinIO expects parts with 'part' not 'partNumber'
    const formattedParts = parts.map(({ partNumber, etag }) => ({
      part: partNumber,
      etag: etag,
    }));
    
    await this.s3Client.completeMultipartUpload(
      bucketName,
      fileName,
      uploadId,
      formattedParts,
    );
  }

  async abortMultipartUpload(params: {
    bucketName: S3BucketType;
    fileName: string;
    uploadId: string;
  }): Promise<void> {
    const { bucketName, fileName, uploadId } = params;
    await this.s3Client.abortMultipartUpload(bucketName, fileName, uploadId);
  }
}
