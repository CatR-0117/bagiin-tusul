import { AppShell } from "@/components/layout/app-shell";
import { ImageUpload } from "@/components/upload/image-upload";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await requireUser("/create");
  return (
    <AppShell user={user}>
      <div className="create-page page-enter">
        <header className="create-header"><span className="eyebrow">New spatial asset</span><h1>Start with one image.</h1><p>Choose a clear product shot. We’ll secure it, generate the model, and prepare the AR link.</p></header>
        <ImageUpload />
      </div>
    </AppShell>
  );
}

