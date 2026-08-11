import { put } from "@vercel/blob";
import {
  getManualModelMeta,
  isManualModelId,
  manualModelKey,
  type ManualModelMeta,
} from "@/lib/manual-models";

export const dynamic = "force-dynamic";

type CompleteBody = {
  id?: string;
  format?: "glb" | "usdz";
  fileName?: string;
  url?: string;
};

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Vercel Blob storage холбоогүй байна." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as CompleteBody;
    if (
      !body.id ||
      !isManualModelId(body.id) ||
      (body.format !== "glb" && body.format !== "usdz") ||
      !body.url?.startsWith("https://")
    ) {
      return Response.json({ error: "Model metadata буруу байна." }, { status: 400 });
    }

    // USDZ-ээр эхэлсэн model дээр дараа нь GLB нэмэх урсгалыг мөн хадгална.
    const current = await getManualModelMeta(body.id);
    const meta: ManualModelMeta =
      body.format === "glb"
        ? {
            ...current,
            id: body.id,
            name: body.fileName?.replace(/\.glb$/i, "") || "3D загвар",
            hasGlb: true,
            hasUsdz: current?.hasUsdz ?? false,
            createdAt: current?.createdAt ?? Date.now(),
            glbUrl: body.url,
          }
        : {
            ...(current ?? {
              id: body.id,
              name: body.fileName?.replace(/\.usdz$/i, "") || "3D загвар",
              hasGlb: false,
              createdAt: Date.now(),
            }),
            hasUsdz: true,
            usdzUrl: body.url,
          };

    await put(manualModelKey(body.id, "meta.json"), JSON.stringify(meta), {
      access: "public",
      contentType: "application/json; charset=utf-8",
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });

    return Response.json(meta);
  } catch (error) {
    console.error("[vercel blob complete]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Metadata хадгалж чадсангүй." },
      { status: 500 },
    );
  }
}
