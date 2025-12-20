import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// TYPES
import type { ClassValue } from "clsx";
import type { BucketFileInfoType } from "@/lib/types";
// CONSTANTS
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_DOCUMENT_TYPES } from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getBucketFilePrefix = (contentType: string) => {
  if (ACCEPTED_IMAGE_TYPES.includes(contentType)) {
    return "image";
  } else if (ACCEPTED_DOCUMENT_TYPES.includes(contentType)) {
    return "word-document";
  } else if (contentType === "application/pdf") {
    return "pdf";
  } else {
    return "other";
  }
};

export function formatFileSize(bytes?: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const dm = 2;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSecondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const milliseconds = Math.round((seconds - Math.floor(seconds)) * 1000);

  let timeStr = "";

  if (minutes > 0) {
    timeStr += `${minutes}m `;
  }

  if (remainingSeconds > 0 || minutes === 0) {
    timeStr += `${Math.floor(remainingSeconds)}s `;
  }

  if (milliseconds > 0 && minutes === 0 && Math.floor(remainingSeconds) === 0) {
    timeStr += `${milliseconds}ms`;
  }

  return timeStr;
}

/**
 * Uploads file to bucket directly using presigned url with progress tracking
 * @param presignedUrl presigned url for uploading
 * @param file file to upload
 * @param progressCallback callback to update progress
 * @returns response from file storage
 */
export const uploadToBucket = ({
  file,
  presignedUrl,
  progressCallback,
}: {
  file: File;
  presignedUrl: string;
  progressCallback: (progress: number, estimatedTimeRemaining?: number) => void;
}): Promise<Response> => {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    
    // Set timeout to 2 hours for large file uploads
    xhr.timeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    let startTime: number | null = null;
    let loadedPrevious = 0;
    let timePrevious: number | null = null;

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable) {
        const progress: number = (event.loaded / event.total) * 100;
        const currentTime: number = Date.now();

        if (startTime === null) {
          startTime = currentTime;
          loadedPrevious = event.loaded;
          timePrevious = currentTime;
          progressCallback(progress); // Initial callback
          return; // Not enough data for estimate yet
        }

        const timeElapsed: number = currentTime - startTime;
        let uploadSpeed: number = (event.loaded / timeElapsed) * 1000; // bytes per second

        // More accurate estimate using a rolling average
        const timeDiff: number = currentTime - timePrevious!;
        const loadedDiff: number = event.loaded - loadedPrevious;
        if (timeDiff > 0) {
          const currentSpeed: number = (loadedDiff / timeDiff) * 1000;
          uploadSpeed = (uploadSpeed + currentSpeed) / 2;
        }

        timePrevious = currentTime;
        loadedPrevious = event.loaded;

        const bytesRemaining: number = event.total - event.loaded;
        const estimatedTimeRemaining: number | undefined =
          uploadSpeed > 0 ? bytesRemaining / uploadSpeed : undefined;

        progressCallback(progress, estimatedTimeRemaining);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(new Response(xhr.response));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed due to a network error"));
    };
    
    xhr.ontimeout = () => {
      reject(new Error("Upload failed due to timeout. Please try again or use a faster connection."));
    };

    xhr.send(file);
  });
};

/**
 * Uploads files to bucket and saves file info in DB
 * @param files files to upload
 * @param bucketFilesInfo presigned urls for uploading
 * @param progressCallback callback to update progress for each file
 * @returns
 */
export const uploadTaskFiles = async ({
  files,
  bucketFilesInfo,
  progressCallback,
}: {
  files: File[];
  bucketFilesInfo: BucketFileInfoType[];
  progressCallback: (
    fileIndex: number,
    progress: number,
    estimatedTimeRemaining?: number,
  ) => void;
}) => {
  const uploadPromises = bucketFilesInfo.map((bucketFileInfo, index) => {
    const file = files.find(
      (file) =>
        file.name === bucketFileInfo.originalName &&
        file.size === bucketFileInfo.size,
    );

    if (!file) {
      throw new Error("File not found");
    }

    return uploadToBucket({
      file,
      presignedUrl: bucketFileInfo.presignedUrl,
      progressCallback: (progress, estimatedTimeRemaining) =>
        progressCallback(index, progress, estimatedTimeRemaining),
    });
  });

  const uploadResponses = await Promise.all(uploadPromises);

  if (uploadResponses.some((res) => !res.ok)) {
    throw new Error("Some uploads failed, please try again");
  }
};

// Multipart upload constants
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // Use multipart for files > 100MB

/**
 * Uploads a file chunk to S3 using presigned URL
 */
const uploadChunk = async (
  chunk: Blob,
  presignedUrl: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("No ETag received from server"));
          return;
        }
        resolve(etag.replace(/"/g, ""));
      } else {
        reject(new Error(`Chunk upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Chunk upload failed due to network error"));
    };

    xhr.send(chunk);
  });
};

/**
 * Uploads file using multipart upload for better reliability with large files
 */
export const uploadFileMultipart = async ({
  file,
  bucketFileInfo,
  progressCallback,
  initiateMultipartUpload,
  getMultipartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
}: {
  file: File;
  bucketFileInfo: BucketFileInfoType;
  progressCallback: (progress: number, estimatedTimeRemaining?: number) => void;
  initiateMultipartUpload: (input: any) => Promise<any>;
  getMultipartUploadUrl: (input: any) => Promise<any>;
  completeMultipartUpload: (input: any) => Promise<any>;
  abortMultipartUpload: (input: any) => Promise<any>;
}): Promise<void> => {
  const { bucketName, filePath, contentType } = bucketFileInfo;
  
  // Initiate multipart upload
  const initiateRes = await initiateMultipartUpload({
    bucketName,
    fileName: filePath,
    filePath,
    contentType,
  });

  if (initiateRes.status === "FAILED") {
    throw new Error(initiateRes.message);
  }

  const uploadId = initiateRes.data.uploadId;
  
  try {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const parts: Array<{ partNumber: number; etag: string }> = [];
    
    let uploadedBytes = 0;
    const startTime = Date.now();

    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // Get presigned URL for this part
      const urlRes = await getMultipartUploadUrl({
        bucketName,
        fileName: filePath,
        uploadId,
        partNumber,
        totalParts: totalChunks,
      });

      if (urlRes.status === "FAILED") {
        throw new Error(urlRes.message);
      }

      // Upload the chunk
      const etag = await uploadChunk(chunk, urlRes.data.presignedUrl);
      parts.push({ partNumber, etag });

      // Update progress
      uploadedBytes += chunk.size;
      const progress = (uploadedBytes / file.size) * 100;
      
      const timeElapsed = Date.now() - startTime;
      const uploadSpeed = (uploadedBytes / timeElapsed) * 1000; // bytes per second
      const bytesRemaining = file.size - uploadedBytes;
      const estimatedTimeRemaining = uploadSpeed > 0 ? bytesRemaining / uploadSpeed : undefined;

      progressCallback(progress, estimatedTimeRemaining);
    }

    // Complete multipart upload
    const completeRes = await completeMultipartUpload({
      bucketName,
      fileName: filePath,
      uploadId,
      parts,
    });

    if (completeRes.status === "FAILED") {
      throw new Error(completeRes.message);
    }
  } catch (error) {
    // Abort multipart upload on error
    await abortMultipartUpload({
      bucketName,
      fileName: filePath,
      uploadId,
    });
    throw error;
  }
};
