"use client";
import { useState } from "react";

export default function AccesoPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Código incorrecto");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_60px_-15px_rgba(99,102,241,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_10px_2px_rgba(129,140,248,0.7)]" />
          <span className="text-xs font-medium uppercase tracking-widest text-indigo-300">
            Propy AI · Acceso
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white">🔒 Ingresa tu código</h1>
        <p className="mt-2 text-sm text-slate-400">
          Esta app de onboarding es privada. Escribe el código de acceso que te compartimos.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de acceso"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-lg tracking-widest text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_25px_-5px_rgba(139,92,246,0.7)] transition hover:from-indigo-400 hover:to-violet-400 disabled:opacity-40"
          >
            {loading ? "Verificando…" : "Entrar →"}
          </button>
        </form>
      </div>
    </main>
  );
}
