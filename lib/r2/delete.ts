import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured } from "@/lib/config";
import { deleteMockObject } from "@/lib/mock-storage";
import { getR2BucketName, getR2Client } from "@/lib/r2/client";

export async function deleteObject(key: string | null) {
  if (!key || key.startsWith("demo/")) return;
  if (!isR2Configured()) {
    deleteMockObject(key);
    return;
  }
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key }),
  );
}

