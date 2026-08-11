import {
  getManualModelMeta,
  getModelBucket,
  isManualModelId,
  manualModelKey,
  type ManualModelMeta,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

type CompleteBody = {
  uploadId?: string;
  fileName?: string;
  parts?: Array<{ partNumber: number; etag: string }>;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; format: string }> },
) {
  const { id, format } = await context.params;
  if (!isManualModelId(id) || (format !== "glb" && format !== "usdz")) {
    return Response.json({ error: "Upload хүсэлт буруу байна." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as CompleteBody;
    const parts = body.parts ?? [];
    if (!body.uploadId || parts.length === 0) {
      return Response.json({ error: "Upload хэсгүүд дутуу байна." }, { status: 400 });
    }

    const file = format === "glb" ? "model.glb" : "model.usdz";
    const bucket = getModelBucket();
    const upload = bucket.resumeMultipartUpload(
      manualModelKey(id, file),
      body.uploadId,
    );
    await upload.complete(parts);

    const current = await getManualModelMeta(id);
    const meta: ManualModelMeta =
      format === "glb"
        ? {
            ...current,
            id,
            name: body.fileName?.replace(/\.glb$/i, "") || "3D загвар",
            hasGlb: true,
            hasUsdz: current?.hasUsdz ?? false,
            createdAt: current?.createdAt ?? Date.now(),
          }
        : {
            ...(current ?? {
              id,
              name: body.fileName?.replace(/\.usdz$/i, "") || "3D загвар",
              hasGlb: false,
              createdAt: Date.now(),
            }),
            hasUsdz: true,
          };

    await bucket.put(manualModelKey(id, "meta.json"), JSON.stringify(meta), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });

    return Response.json(meta);
  } catch (error) {
    console.error("[multipart complete]", error);
    return Response.json({ error: "Upload дуусгаж чадсангүй." }, { status: 500 });
  }
}
