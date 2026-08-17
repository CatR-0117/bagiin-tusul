import { AppShell } from "@/components/layout/app-shell";
import { ImageUpload } from "@/components/upload/image-upload";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await requireUser("/create");
  return (
    <AppShell user={user}>
      <div className="create-page page-enter">
        <header className="create-header"><span className="eyebrow">Шинэ орон зайн загвар</span><h1>Нэг зургаас эхэлье.</h1><p>Бүтээгдэхүүний тод зураг сонгоорой. Бид 3D загварыг үүсгээд AR холбоосыг бэлтгэнэ.</p></header>
        <ImageUpload />
      </div>
    </AppShell>
  );
}
