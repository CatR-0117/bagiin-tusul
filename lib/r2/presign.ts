import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2BucketName, getR2Client } from "@/lib/r2/client";

export async function createUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600,
) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

export async function createDownloadUrl(
  key: string,
  expiresIn = 3600,
  downloadName?: string,
) {
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ResponseContentDisposition: downloadName
      ? `attachment; filename="${downloadName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`
      : undefined,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

export async function createInlineDownloadUrl(
  key: string,
  expiresIn = 3600,
  filename = key.split("/").pop() ?? "model",
) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ResponseContentDisposition: `inline; filename="${safeName}"`,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}
