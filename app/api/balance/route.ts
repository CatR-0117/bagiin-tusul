import { getBalance, MeshyError } from "@/lib/meshy";

export const dynamic = "force-dynamic";

/**
 * Meshy дансны кредитийн үлдэгдэл.
 *
 * Кредит нь дансны нийтлэг нөөц болохоор нэг минут кэшилсэн ч хангалттай —
 * ингэснээр хуудас ачаалах бүрд Meshy рүү хүсэлт явахгүй.
 */
export async function GET() {
  try {
    const balance = await getBalance();
    return Response.json(
      { balance },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    if (error instanceof MeshyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "Кредит шалгаж чадсангүй." },
      { status: 500 },
    );
  }
}
