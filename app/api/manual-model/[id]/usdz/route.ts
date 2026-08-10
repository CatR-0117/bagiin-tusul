import {
  getManualModelMeta,
  getModelBucket,
  isManualModelId,
  manualModelKey,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 90 * 1024 * 1024;

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isManualModelId(id)) {
    return Response.json({ error: "Загварын ID буруу байна." }, { status: 400 });
  }

  try {
    const current = await getManualModelMeta(id);
    if (!current) {
      return Response.json({ error: "GLB загвар олдсонгүй." }, { status: 404 });
    }

    const data = await request.formData();
    const usdz = data.get("usdz");
    if (!(usdz instanceof File) || !usdz.name.toLowerCase().endsWith(".usdz")) {
      return Response.json({ error: "USDZ файл шаардлагатай." }, { status: 400 });
    }
    if (usdz.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "USDZ файл 90 MB-аас бага байх ёстой." },
        { status: 413 },
      );
    }

    const meta = { ...current, hasUsdz: true };
    const bucket = getModelBucket();
    await Promise.all([
      bucket.put(manualModelKey(id, "model.usdz"), usdz.stream(), {
        httpMetadata: { contentType: "model/vnd.usdz+zip" },
      }),
      bucket.put(manualModelKey(id, "meta.json"), JSON.stringify(meta), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      }),
    ]);

    return Response.json(meta);
  } catch (error) {
    console.error("[manual USDZ upload]", error);
    return Response.json(
      { error: "USDZ файлыг хадгалж чадсангүй." },
      { status: 500 },
    );
  }
}
