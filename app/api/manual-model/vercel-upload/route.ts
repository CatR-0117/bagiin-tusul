import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 250 * 1024 * 1024;
const PATH_PATTERN = /^manual\/upload_[0-9a-f-]{20,}\/model\.(glb|usdz)$/i;

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json(
        { error: "Vercel Blob storage холбоогүй байна." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as HandleUploadBody;
    if (body.type === "blob.generate-client-token") {
      const origin = request.headers.get("origin");
      const expectedOrigin = new URL(request.url).origin;
      if (origin && origin !== expectedOrigin) {
        return Response.json({ error: "Origin зөвшөөрөгдөөгүй." }, { status: 403 });
      }
    }

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATH_PATTERN.test(pathname)) {
          throw new Error("Файлын зам буруу байна.");
        }
        return {
          allowedContentTypes: [
            "model/gltf-binary",
            "model/vnd.usdz+zip",
            "application/octet-stream",
          ],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(result);
  } catch (error) {
    console.error("[vercel blob upload]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Blob upload алдаа." },
      { status: 500 },
    );
  }
}
