"use client";
import { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Card, Button } from "@/components/ui";
import { Session } from "@/lib/steps";

type Status = "idle" | "connecting" | "active" | "analyzing" | "ready" | "error";

export default function OrbCall({
  session,
  onDone,
}: {
  session: Session;
  onDone: (voz: Record<string, unknown>) => void;
}) {
  const clientRef = useRef<RetellWebClient | null>(null);
  const callIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [talking, setTalking] = useState(false);
  const vozRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;
    client.on("call_started", () => setStatus("active"));
    client.on("call_ended", () => {
      setStatus("analyzing");
      pollAnalysis();
    });
    client.on("agent_start_talking", () => setTalking(true));
    client.on("agent_stop_talking", () => setTalking(false));
    client.on("error", (e: unknown) => {
      setError(e instanceof Error ? e.message : "Error en la llamada");
      setStatus("error");
      client.stopCall();
    });
    return () => client.stopCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tras colgar, consulta a Retell hasta que el análisis de voz esté listo.
  const pollAnalysis = async () => {
    const callId = callIdRef.current;
    if (!callId) {
      setStatus("ready"); // sin call_id no hay análisis; deja continuar
      return;
    }
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/retell/call?call_id=${callId}`);
        const data = await res.json();
        if (data.analyzed && data.answers) {
          vozRef.current = data.answers;
          setStatus("ready");
          return;
        }
      } catch {
        /* reintenta */
      }
    }
    // Si no llegó a tiempo, igual dejamos continuar (red de seguridad).
    setStatus("ready");
  };

  const start = async () => {
    setStatus("connecting");
    setError(null);
    try {
      const res = await fetch("/api/retell/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: session.nombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar la llamada");
      callIdRef.current = data.call_id;
      await clientRef.current!.startCall({ accessToken: data.access_token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setStatus("error");
    }
  };

  const hangup = () => clientRef.current?.stopCall();

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">
        Conversemos, {session.nombre.split(" ")[0]} 🎙️
      </h1>
      <p className="mt-2 text-slate-500">
        El ORB te hará unas preguntas sobre tu negocio. Habla con naturalidad, una
        respuesta a la vez. Al terminar, sigue con el cuestionario.
      </p>

      <div className="mt-10 flex flex-col items-center">
        <div
          className={`relative flex h-40 w-40 items-center justify-center rounded-full transition ${
            status === "active"
              ? "bg-indigo-100"
              : status === "error"
              ? "bg-red-100"
              : "bg-slate-100"
          }`}
        >
          <div
            className={`h-24 w-24 rounded-full bg-indigo-500 transition-transform ${
              talking ? "scale-110 animate-pulse" : "scale-100"
            }`}
          />
        </div>
        <p className="mt-6 text-sm font-medium text-slate-500">
          {status === "idle" && "Listo para empezar"}
          {status === "connecting" && "Conectando…"}
          {status === "active" && (talking ? "El ORB está hablando…" : "Te escucho…")}
          {status === "analyzing" && "Procesando lo que conversamos…"}
          {status === "ready" && "¡Listo! ✓"}
          {status === "error" && "Hubo un problema"}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-10 flex justify-center gap-3">
        {(status === "idle" || status === "error") && (
          <Button onClick={start}>Iniciar llamada</Button>
        )}
        {status === "active" && (
          <Button variant="ghost" onClick={hangup}>
            Colgar
          </Button>
        )}
        {status === "ready" && (
          <Button onClick={() => onDone(vozRef.current ?? {})}>
            Continuar al cuestionario →
          </Button>
        )}
      </div>
    </Card>
  );
}
