import {
  getModelBucket,
  isManualModelId,
  manualModelKey,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

const MAX_PART_BYTES = 6 * 1024 * 1024;

export async function PUT(
  request: Request,
  context: {
    params: Promise<{ id: string; format: string; part: string }>;
  },
) {
  const { id, format, part } = await context.params;
  const partNumber = Number(part);
  const uploadId = new URL(request.url).searchParams.get("uploadId") ?? "";
  if (
    !isManualModelId(id) ||
    (format !== "glb" && format !== "usdz") ||
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > 10_000 ||
    !uploadId ||
    !request.body
  ) {
    return Response.json({ error: "Upload хэсгийн хүсэлт буруу байна." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PART_BYTES) {
    return Response.json({ error: "Upload хэсэг хэт том байна." }, { status: 413 });
  }

  try {
    const file = format === "glb" ? "model.glb" : "model.usdz";
    const upload = getModelBucket().resumeMultipartUpload(
      manualModelKey(id, file),
      uploadId,
    );
    const uploaded = await upload.uploadPart(partNumber, request.body);
    return Response.json(uploaded);
  } catch (error) {
    console.error("[multipart part]", error);
    return Response.json({ error: "Файлын хэсгийг хадгалж чадсангүй." }, { status: 500 });
  }
}
