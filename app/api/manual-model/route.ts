import {
  getModelBucket,
  MANUAL_MODEL_PREFIX,
  manualModelKey,
  type ManualModelMeta,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 90 * 1024 * 1024;

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const glb = data.get("glb");

    if (!(glb instanceof File) || fileExtension(glb) !== "glb") {
      return Response.json({ error: "GLB файл шаардлагатай." }, { status: 400 });
    }
    if (glb.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "GLB файл 90 MB-аас бага байх ёстой." },
        { status: 413 },
      );
    }

    const id = `${MANUAL_MODEL_PREFIX}${crypto.randomUUID()}`;
    const name = glb.name.replace(/\.glb$/i, "") || "3D загвар";
    const createdAt = Date.now();
    const meta: ManualModelMeta = {
      id,
      name,
      hasGlb: true,
      hasUsdz: false,
      createdAt,
    };
    const bucket = getModelBucket();

    await Promise.all([
      bucket.put(manualModelKey(id, "model.glb"), glb.stream(), {
        httpMetadata: { contentType: "model/gltf-binary" },
      }),
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
