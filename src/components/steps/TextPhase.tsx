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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensaje inicial del asistente al entrar.
  useEffect(() => {
    send([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (history: Msg[], kickoff = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          nombre: session.nombre,
          messages: kickoff
            ? [{ role: "user", content: "Hola, ya terminé la llamada. Empecemos con el chat." }]
            : history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el chat");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
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

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">Últimos datos exactos 💬</h1>
      <p className="mt-2 text-slate-500">
        Conversemos por escrito para completar los detalles de tu negocio.
      </p>

      <div
        ref={scrollRef}
        className="mt-6 h-[50vh] min-h-[360px] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4"
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-400 ring-1 ring-slate-200">
              escribiendo…
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {finished ? (
        <div className="mt-6">
          <Button onClick={() => onDone(finished)}>Generar mi documento →</Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
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
      )}
    </Card>
  );
}
