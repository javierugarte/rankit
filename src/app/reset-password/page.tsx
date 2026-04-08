"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const errorCode = searchParams.get("error_code");
    if (errorCode) {
      if (errorCode === "otp_expired") {
        setLinkError("El enlace ha expirado. Solicita uno nuevo.");
      } else {
        setLinkError("El enlace no es válido. Solicita uno nuevo.");
      }
      return;
    }

    // Supabase PKCE flow redirects here with ?code=... The SDK exchanges it
    // automatically and fires PASSWORD_RECOVERY once the session is ready.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase, searchParams]);

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

  if (linkError) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-5xl font-bold mb-10"
          style={{ fontFamily: "Georgia, serif", color: "#e05252" }}
        >
          RankIt
        </h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
          {linkError}
        </div>
        <button
          onClick={() => router.push("/login")}
          className="w-full bg-gold text-bg font-semibold py-3 rounded-xl transition-opacity hover:opacity-90"
        >
          Solicitar nuevo enlace
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1
          className="text-5xl font-bold mb-10"
          style={{ fontFamily: "Georgia, serif", color: "#e05252" }}
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
          style={{ fontFamily: "Georgia, serif", color: "#e05252" }}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
