import { getTask, MeshyError, toPublicTask, type TaskKind } from "@/lib/meshy";

export const dynamic = "force-dynamic";

const KINDS: TaskKind[] = ["image-to-3d", "multi-image-to-3d"];

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!id) {
    return Response.json({ error: "id дутуу байна." }, { status: 400 });
  }

  // Клиент төрлийг мэддэг бол дамжуулна — нэмэлт хүсэлт хэмнэнэ.
  const hintParam = new URL(request.url).searchParams.get("kind");
  const hint = KINDS.find((kind) => kind === hintParam);

  try {
    const { task, kind } = await getTask(id, hint);
    return Response.json(toPublicTask(task, kind), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MeshyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[task] unexpected", error);
    return Response.json(
      { error: "Төлөв шалгах үед алдаа гарлаа." },
      { status: 500 },
    );
  }
}
