import { AppShell } from "@/components/layout/app-shell";
import { AccountSettingsForm } from "@/components/account/account-settings-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await requireUser("/account/settings");
  return (
    <AppShell user={user}>
      <div className="settings-page page-enter">
        <header>
          <span className="eyebrow">Бүртгэл</span>
          <h1>Ажлын хэсгийн тохиргоо</h1>
          <p>Хувийн мэдээлэл болон бүртгэлийн аюулгүй байдлаа удирдана уу.</p>
        </header>
        <AccountSettingsForm initialName={user.name} email={user.email} isDemo={user.isDemo} />
      </div>
    </AppShell>
  );
}
