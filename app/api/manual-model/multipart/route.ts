import {
  getManualModelMeta,
  getModelBucket,
  isManualModelId,
  MANUAL_MODEL_PREFIX,
  manualModelKey,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

const PART_SIZE = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 250 * 1024 * 1024;

type StartBody = {
  fileName?: string;
  fileSize?: number;
  format?: "glb" | "usdz";
  id?: string;
};

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL) {
      return Response.json({ backend: "vercel-blob" });
    }
    const body = (await request.json()) as StartBody;
    const format = body.format;
    const fileName = body.fileName?.trim() ?? "";
    const fileSize = body.fileSize ?? 0;

    if (
      (format !== "glb" && format !== "usdz") ||
      !fileName.toLowerCase().endsWith(`.${format}`)
    ) {
      return Response.json({ error: "Файлын формат буруу байна." }, { status: 400 });
    }
    if (fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
      return Response.json(
        { error: "Нэг файл 250 MB-аас бага байх ёстой." },
        { status: 413 },
      );
    }

    const id =
      format === "glb"
        ? `${MANUAL_MODEL_PREFIX}${crypto.randomUUID()}`
        : (body.id ?? "");
    if (!isManualModelId(id)) {
      return Response.json({ error: "Загварын ID буруу байна." }, { status: 400 });
    }
    if (format === "usdz" && !(await getManualModelMeta(id))) {
      return Response.json({ error: "GLB загвар олдсонгүй." }, { status: 404 });
    }

    const file = format === "glb" ? "model.glb" : "model.usdz";
    const contentType =
      format === "glb" ? "model/gltf-binary" : "model/vnd.usdz+zip";
    const upload = await getModelBucket().createMultipartUpload(
      manualModelKey(id, file),
      { httpMetadata: { contentType } },
    );

    return Response.json({ id, uploadId: upload.uploadId, partSize: PART_SIZE });
  } catch (error) {
    console.error("[multipart start]", error);
    return Response.json({ error: "Upload эхлүүлж чадсангүй." }, { status: 500 });
  }
}
