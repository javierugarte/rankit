"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-muted hover:text-red-400 hover:border-red-400/30 transition-colors"
      >
        <LogOut size={18} />
        <span className="text-sm font-medium">Cerrar sesión</span>
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) =>
            e.target === e.currentTarget && !loading && setShowConfirm(false)
          }
        >
          <div
            className="w-full max-w-lg bg-surface-2 rounded-t-3xl p-6 border-t border-border"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

            <div className="text-center mb-6">
              <p className="text-3xl mb-3">👋</p>
              <h2 className="text-lg font-semibold text-text mb-1">
                Cerrar sesión
              </h2>
              <p className="text-muted text-sm">
                ¿Seguro que quieres cerrar sesión?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#ef4444", color: "white" }}
              >
                {loading ? "Cerrando..." : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
