import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  BucketFileInfoType,
  FileMetadataType,
  ParseableFileInsertType,
} from "@/lib/types";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_WORD_DOCUMENT_TYPES,
} from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MAX_FILE_SIZE_NEXTJS_ROUTE = 4;
export const MAX_FILE_SIZE_S3_ENDPOINT = 1024;
export const FILE_NUMBER_LIMIT = 10;

export const getBucketFilePrefix = (contentType: string) => {
  if (ACCEPTED_IMAGE_TYPES.includes(contentType)) {
    return "image";
  } else if (ACCEPTED_WORD_DOCUMENT_TYPES.includes(contentType)) {
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
 *
 * @param files array of files
 * @returns true if all files are valid
 */
export function validateFiles(
  files: FileMetadataType[],
  maxSizeMB: number,
): string | undefined {
  // check if all files in total are less than 100 MB
  const totalFileSize = files.reduce((acc, file) => acc + file.size, 0);
  const isFileSizeValid = totalFileSize < maxSizeMB * 1024 * 1024;
  if (!isFileSizeValid) {
    return `Total file size should be less than ${maxSizeMB} MB`;
  }
  if (files.length > FILE_NUMBER_LIMIT) {
    return `You can upload maximum ${FILE_NUMBER_LIMIT} files at a time`;
  }
  return;
}

/**
 * Create form data from files
 * @param files files to upload
 * @returns form data
 */
export function createFormData(files: File[]): FormData {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("file", file);
  });

  return formData;
}

/**
 * Gets presigned urls for uploading files to bucket
 * @param formData form data with files to upload
 * @returns
 */
export const getBucketFilesInfo = async ({
  taskId,
  bucketName,
  filesMetadata,
}: {
  taskId: string;
  bucketName: string;
  filesMetadata: FileMetadataType[];
}) => {
  const response = await fetch(
    `/api/presigned-url/${bucketName}?taskId=${taskId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filesMetadata }),
    },
  );

  return (await response.json()) as BucketFileInfoType[];
};

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
    xhr.setRequestHeader("Access-Control-Allow-Origin", "*");

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

    xhr.send(file);
  });
};

/**
 * Saves file info in DB
 * @param bucketFilesInfo presigned urls for uploading
 * @returns
 */
export const createParseableFiles = async (
  parseableFiles: ParseableFileInsertType[],
) => {
  return await fetch(`/api/parseable-files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parseableFiles,
    }),
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
