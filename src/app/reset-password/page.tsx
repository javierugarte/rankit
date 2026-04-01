"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase redirects here with a hash fragment containing the session tokens.
    // The SDK picks up the session from the URL automatically on the client.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      await supabase.auth.signOut();
      router.push("/login");
    }
  }

  if (!ready) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-5xl font-bold mb-10"
          style={{ fontFamily: "Georgia, serif", color: "#c8a96e" }}
        >
          RankIt
        </h1>
        <p className="text-muted text-sm">Verificando enlace…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-5xl font-bold mb-2"
          style={{ fontFamily: "Georgia, serif", color: "#c8a96e" }}
        >
          RankIt
        </h1>
        <p className="text-muted text-sm">Nueva contraseña</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-bg font-semibold py-3 rounded-xl transition-opacity disabled:opacity-50 hover:opacity-90 mt-2"
        >
          {loading ? "Guardando…" : "Establecer contraseña"}
        </button>
      </form>
    </div>
  );
}
