"use client";
import { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Card, Button } from "@/components/ui";
import { Session } from "@/lib/steps";

type Status = "idle" | "connecting" | "active" | "ended" | "error";

export default function OrbCall({
  session,
  onDone,
}: {
  session: Session;
  onDone: () => void;
}) {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;
    client.on("call_started", () => setStatus("active"));
    client.on("call_ended", () => setStatus("ended"));
    client.on("agent_start_talking", () => setTalking(true));
    client.on("agent_stop_talking", () => setTalking(false));
    client.on("error", (e: unknown) => {
      setError(e instanceof Error ? e.message : "Error en la llamada");
      setStatus("error");
      client.stopCall();
    });
    return () => client.stopCall();
  }, []);

  const start = async () => {
    setStatus("connecting");
    setError(null);
    try {
      const res = await fetch("/api/retell/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id, nombre: session.nombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar la llamada");
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
          {status === "ended" && "Llamada finalizada ✓"}
          {status === "error" && "Hubo un problema"}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-10 flex justify-center gap-3">
        {status === "idle" || status === "error" ? (
          <Button onClick={start}>Iniciar llamada</Button>
        ) : null}
        {status === "active" && (
          <Button variant="ghost" onClick={hangup}>
            Colgar
          </Button>
        )}
        {status === "ended" && <Button onClick={onDone}>Continuar al cuestionario →</Button>}
      </div>
    </Card>
  );
}
