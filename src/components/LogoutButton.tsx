"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-muted hover:text-red-400 hover:border-red-400/30 transition-colors"
    >
      <LogOut size={18} />
      <span className="text-sm font-medium">Cerrar sesión</span>
    </button>
  );
}
