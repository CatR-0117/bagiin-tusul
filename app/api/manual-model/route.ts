import {
  getModelBucket,
  MANUAL_MODEL_PREFIX,
  manualModelKey,
  type ManualModelMeta,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 45 * 1024 * 1024;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const glb = data.get("glb");
    const usdz = data.get("usdz");

    if (!(glb instanceof File) || fileExtension(glb) !== "glb") {
      return Response.json({ error: "GLB файл шаардлагатай." }, { status: 400 });
    }
    if (usdz !== null && (!(usdz instanceof File) || fileExtension(usdz) !== "usdz")) {
      return Response.json({ error: "USDZ файл буруу байна." }, { status: 400 });
    }

    const usdzFile = usdz instanceof File ? usdz : null;
    const totalSize = glb.size + (usdzFile?.size ?? 0);
    if (
      glb.size > MAX_FILE_BYTES ||
      (usdzFile?.size ?? 0) > MAX_FILE_BYTES ||
      totalSize > MAX_TOTAL_BYTES
    ) {
      return Response.json(
        { error: "Файл хэт том байна. Нэг файл 45 MB, нийт 80 MB-аас бага байна." },
        { status: 413 },
      );
    }

    const id = `${MANUAL_MODEL_PREFIX}${crypto.randomUUID()}`;
    const name = glb.name.replace(/\.glb$/i, "") || "3D загвар";
    const createdAt = Date.now();
    const meta: ManualModelMeta = {
      id,
      name,
      hasUsdz: Boolean(usdzFile),
      createdAt,
    };
    const bucket = getModelBucket();

    await Promise.all([
      bucket.put(manualModelKey(id, "model.glb"), glb.stream(), {
        httpMetadata: { contentType: "model/gltf-binary" },
      }),
      usdzFile
        ? bucket.put(manualModelKey(id, "model.usdz"), usdzFile.stream(), {
            httpMetadata: { contentType: "model/vnd.usdz+zip" },
          })
        : Promise.resolve(null),
      bucket.put(manualModelKey(id, "meta.json"), JSON.stringify(meta), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      }),
    ]);

    return Response.json(meta, { status: 201 });
  } catch (error) {
    console.error("[manual model upload]", error);
    return Response.json(
      { error: "3D загварыг хадгалж чадсангүй. Дахин оролдоно уу." },
      { status: 500 },
    );
  }
}
