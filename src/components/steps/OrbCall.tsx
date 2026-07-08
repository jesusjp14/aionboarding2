"use client";
import { useEffect, useRef, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import { Card, Button } from "@/components/ui";
import Confetti from "@/components/Confetti";
import { Session } from "@/lib/steps";

type Status = "idle" | "connecting" | "active" | "analyzing" | "ready" | "error";

function Orb({ talking, status }: { talking: boolean; status: Status }) {
  const live = status === "active";
  const color =
    status === "error" ? "rgba(244,63,94," : "rgba(139,92,246,";
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      {/* halo exterior */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${color}0.55) 0%, ${color}0) 70%)`,
          opacity: live ? 1 : 0.5,
        }}
      />
      {/* anillos que expanden cuando habla */}
      {(live || talking) &&
        [0, 0.6, 1.2].map((d) => (
          <span
            key={d}
            className="absolute rounded-full border"
            style={{
              width: 150,
              height: 150,
              borderColor: `${color}0.5)`,
              animation: `orb-ring 2.4s ease-out ${d}s infinite`,
            }}
          />
        ))}
      {/* anillo giratorio tech */}
      <div
        className="absolute h-44 w-44 rounded-full border border-dashed"
        style={{
          borderColor: `${color}0.35)`,
          animation: "spin 12s linear infinite",
        }}
      />
      {/* núcleo */}
      <div
        className="relative h-28 w-28 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, #c4b5fd, #7c3aed 55%, #4c1d95)`,
          boxShadow: `0 0 50px ${color}0.7), inset 0 0 25px rgba(255,255,255,0.25)`,
          animation: talking ? "orb-pulse 0.9s ease-in-out infinite" : "orb-pulse 3s ease-in-out infinite",
        }}
      >
        {/* barras de audio */}
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-white/80"
              style={{
                height: talking ? 10 + ((i % 3) + 1) * 8 : 6,
                transition: "height 0.15s",
                animation: talking ? `orb-pulse ${0.5 + i * 0.12}s ease-in-out infinite` : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [paused, setPaused] = useState(false);
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

  const pollAnalysis = async () => {
    const callId = callIdRef.current;
    if (!callId) {
      setStatus("ready");
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
    setStatus("ready");
  };

  const togglePause = () => {
    const c = clientRef.current;
    if (!c) return;
    if (paused) {
      c.unmute();
      setPaused(false);
    } else {
      c.mute();
      setPaused(true);
    }
  };

  const restart = async () => {
    clientRef.current?.stopCall();
    setPaused(false);
    vozRef.current = null;
    callIdRef.current = null;
    await new Promise((r) => setTimeout(r, 300));
    start();
  };

  const start = async () => {
    setStatus("connecting");
    setError(null);
    setPaused(false);
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

  const statusText: Record<Status, string> = {
    idle: "Listo para conectar",
    connecting: "Estableciendo enlace…",
    active: paused ? "En pausa · tu micrófono está silenciado" : talking ? "Camila está hablando…" : "Escuchando…",
    analyzing: "Procesando la conversación…",
    ready: "Análisis completo",
    error: "Error de conexión",
  };

  if (status === "ready") {
    return (
      <Card>
        <div className="relative flex flex-col items-center py-6">
          <Confetti />
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_45px_-5px_rgba(52,211,153,0.8)]"
            style={{ animation: "check-pop 0.5s ease-out" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">
            ¡Listo, {session.nombre.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-center text-slate-400">
            Terminamos la conversación con Camila. Ahora sigue el chat para dejar
            unos datos por escrito.
          </p>
          <div className="mt-8">
            <Button onClick={() => onDone(vozRef.current ?? {})}>Continuar al chat →</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
        <span className="text-xs font-medium uppercase tracking-widest text-indigo-300">
          Camila · Agente de voz IA
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-bold text-white">
        Conversemos, {session.nombre.split(" ")[0]}
      </h1>
      <p className="mt-2 text-slate-400">
        Camila te hará unas preguntas sobre tu negocio. Habla con naturalidad, una
        respuesta a la vez.
      </p>

      <div className="mt-8 flex flex-col items-center">
        <Orb talking={talking} status={status} />
        <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
          <span className="text-sm font-medium text-slate-300">{statusText[status]}</span>
        </div>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {(status === "idle" || status === "error") && (
          <Button onClick={start}>◉ Iniciar llamada</Button>
        )}
        {status === "active" && (
          <>
            <Button onClick={togglePause}>
              {paused ? "▶ Reanudar" : "⏸ Pausar"}
            </Button>
            <Button variant="ghost" onClick={restart}>
              ↻ Reiniciar
            </Button>
            <Button variant="ghost" onClick={hangup}>
              Finalizar
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
