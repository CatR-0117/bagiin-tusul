"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ isDemo }: { isDemo: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    if (isDemo) {
      await fetch("/api/auth/demo", { method: "DELETE" });
    } else {
      await createClient().auth.signOut();
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <button className="logout-button" type="button" onClick={logout} disabled={pending}>
      <LogOut size={16} aria-hidden="true" />
      <span>{pending ? "Гарч байна…" : "Гарах"}</span>
    </button>
  );
}
