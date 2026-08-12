import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2BucketName, getR2Client } from "@/lib/r2/client";

export async function uploadBuffer(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function uploadRemoteFile(
  key: string,
  sourceUrl: string,
  contentType: string,
  origin: string,
) {
  const resolvedUrl = new URL(sourceUrl, origin);
  if (!['http:', 'https:'].includes(resolvedUrl.protocol)) {
    throw new Error("The AI provider returned an unsupported asset URL.");
  }
  const response = await fetch(resolvedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not download generated asset (${response.status}).`);
  }
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength === 0) throw new Error("The generated asset was empty.");
  return uploadBuffer(key, body, contentType);
}

