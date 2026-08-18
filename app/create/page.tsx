import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ImageUpload } from "@/components/upload/image-upload";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await requireUser("/create");
  return (
    <AppShell user={user}>
      <div className="create-page page-enter">
        <Link className="back-link" href="/"><ArrowLeft size={16} /> Нийтийн загварууд руу буцах</Link>
        <header className="create-header"><span className="eyebrow">Шинэ 3D / AR загвар</span><h1>Нэг зургаас эхэлье.</h1><p>Нэг объект бүтнээрээ харагдсан тод зураг сонгоорой. AI нь GLB загвар болон Android, iPhone AR хувилбарыг бэлтгэнэ.</p></header>
        <ImageUpload />
      </div>
    </AppShell>
  );
}
