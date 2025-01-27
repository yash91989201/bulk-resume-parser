import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
// UTILS
import { auth } from "@/server/utils/auth";
import { getBucketFilePrefix } from "@/lib/utils";
import { createPresignedUrlToUpload, isBucketNameValid } from "@/server/utils";
// TYPES
import type { NextRequest } from "next/server";
// CONSTANTS
import { ACCEPTED_FILE_TYPES } from "@/constants";
import { BucketFileInfoType, FileMetadataType } from "@/lib/types";
import { CreatePresignedUrlApiInput } from "@/lib/schema";

const expiry = 60 * 60; // 24 hours

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bucketName: string }> },
) {
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

  const userId = session.user.id;
  const taskId = req.nextUrl.searchParams.get("taskId");
  const bucketName = (await params).bucketName;
  if (taskId === null) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: "taskId not provided, required for creating presigned url.",
      },
      { status: 401 },
    );
  }

  if (!isBucketNameValid(bucketName)) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: "Invalid bucket name",
      },
      { status: 401 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await req.json();
  const reqJsonValidation = CreatePresignedUrlApiInput.safeParse(body);

  if (!reqJsonValidation.success) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: "Invalid json body",
        error: reqJsonValidation.error,
      },
      { status: 422 },
    );
  }

  const filesMetadata = reqJsonValidation.data.filesMetadata;
  if (filesMetadata.length === 0) {
    return NextResponse.json(
      {
        status: "FAILED",
        message:
          "File metadata not provided, required to create presigned url.",
      },
      { status: 400 },
    );
  }

  const bucketFilesInfo: BucketFileInfoType[] = await Promise.all(
    filesMetadata.map(async (file) => {
      const fileName = `${createId()}-${file.originalName}`;
      const isArchiveFile = ACCEPTED_FILE_TYPES.ARCHIVE_FILES.includes(
        file.contentType,
      );
      const filePrefix = getBucketFilePrefix(file.contentType);
      const filePath = isArchiveFile
        ? `${userId}/${taskId}/${fileName}`
        : `${userId}/${taskId}/${filePrefix}/${fileName}`;

      const presignedUrl = await createPresignedUrlToUpload({
        bucketName,
        fileName: filePath,
        expiry,
      });

      return {
        filePath,
        fileName,
        originalName: file.originalName,
        size: file.size,
        contentType: file.contentType,
        bucketName,
        presignedUrl,
      };
    }),
  );

  return NextResponse.json(bucketFilesInfo, { status: 201 });
}
