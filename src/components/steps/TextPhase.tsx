"use client";
import { useEffect, useRef, useState } from "react";
import { Card, Button, inputClass } from "@/components/ui";
import { Session } from "@/lib/steps";

type Msg = { role: "user" | "assistant"; content: string };

export default function TextPhase({
  session,
  onDone,
}: {
  session: Session;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<Record<string, string> | null>(null);
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    send([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (history: Msg[], kickoff = false, finish = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: session.nombre,
          finish,
          messages: kickoff
            ? [{ role: "user", content: "Hola, ya terminé la llamada. Empecemos con el chat." }]
            : history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el chat");
      if (data.reply) setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.done && data.answers) setFinished(data.answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || finished) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    send(next);
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("nombre", session.nombre);
      if (session.correo) fd.append("correo", session.correo);
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error subiendo archivos");
      setUploads((u) => [...u, ...(data.uploaded ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo archivos");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
        <span className="text-xs font-medium uppercase tracking-widest text-indigo-300">
          Camila · Chat de datos
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-bold text-white">Últimos datos exactos 💬</h1>
      <p className="mt-2 text-slate-400">
        Conversemos por escrito. Si tienes documentos (CRM, catálogos), súbelos con 📎.
      </p>

      <div
        ref={scrollRef}
        className="mt-6 h-[46vh] min-h-[340px] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4"
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                  : "bg-white/5 text-slate-200 ring-1 ring-white/10"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-slate-400 ring-1 ring-white/10">
              escribiendo…
            </div>
          </div>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uploads.map((u, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
            >
              📄 {u}
            </span>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      {finished ? (
        <div className="mt-6">
          <Button onClick={() => onDone(finished)}>Generar mi documento →</Button>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={onFiles}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Adjuntar archivos"
              className="flex-none rounded-xl border border-white/10 bg-white/[0.04] px-3 text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              {uploading ? "…" : "📎"}
            </button>
            <input
              className={inputClass}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta…"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              Enviar
            </Button>
          </form>
          <button
            type="button"
            onClick={() => send(messages, false, true)}
            disabled={loading}
            className="mt-3 text-xs font-medium text-slate-400 underline underline-offset-2 hover:text-slate-200 disabled:opacity-40"
          >
            Ya no tengo más que agregar · Finalizar y generar documento
          </button>
        </>
      )}
    </Card>
  );
}
