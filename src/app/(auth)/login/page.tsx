"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("tab") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleDemo() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/home");
      router.refresh();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/home");
        router.refresh();
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // El trigger crea el perfil automáticamente.
        // Si hay sesión activa, actualizamos el username elegido por el usuario.
        if (data.session) {
          await supabase
            .from("profiles")
            .update({ username })
            .eq("id", data.user.id);

          router.push("/home");
          router.refresh();
          return;
        } else {
          setMessage(
            "Revisa tu email para confirmar tu cuenta y luego inicia sesión."
          );
        }
      }
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1
          className="text-5xl font-bold mb-2"
          style={{ fontFamily: "Georgia, serif", color: "#c8a96e" }}
        >
          RankIt
        </h1>
        <p className="text-muted text-sm">
          Listas colaborativas. Un voto al día.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-surface p-1 mb-6 border border-border">
        <button
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "login"
              ? "bg-gold text-bg"
              : "text-muted hover:text-text"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "signup"
              ? "bg-gold text-bg"
              : "text-muted hover:text-text"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="tu_nombre"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tuemail@ejemplo.com"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5 uppercase tracking-wider">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(200, 169, 110, 0.1)",
              border: "1px solid rgba(200, 169, 110, 0.2)",
              color: "#c8a96e",
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-bg font-semibold py-3 rounded-xl transition-opacity disabled:opacity-50 hover:opacity-90 mt-2"
        >
          {loading
            ? "Cargando..."
            : mode === "login"
            ? "Entrar"
            : "Crear cuenta"}
        </button>
      </form>

      {/* Demo */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted text-xs">o</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        onClick={handleDemo}
        disabled={loading}
        className="w-full border border-border rounded-xl py-3 text-sm font-medium text-muted hover:text-text hover:border-gold/40 transition-colors disabled:opacity-50 active:scale-[0.98] active:transition-none"
      >
        {loading ? "Preparando demo…" : "✨ Probar demo sin cuenta"}
      </button>
      <p className="text-center text-xs text-muted mt-2">
        Datos de ejemplo · Se borran en 24h
      </p>
    </div>
  );
}
