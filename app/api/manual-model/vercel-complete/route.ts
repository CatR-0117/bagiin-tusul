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

    const current = await getManualModelMeta(body.id);
    const meta: ManualModelMeta =
      body.format === "glb"
        ? {
            id: body.id,
            name: body.fileName?.replace(/\.glb$/i, "") || "3D загвар",
            hasUsdz: false,
            createdAt: Date.now(),
            glbUrl: body.url,
          }
        : {
            ...(current ?? {
              id: body.id,
              name: "3D загвар",
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
