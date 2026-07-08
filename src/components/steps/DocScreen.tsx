"use client";
import { useEffect, useRef, useState } from "react";
import { Card, Button } from "@/components/ui";
import { Session } from "@/lib/steps";

export default function DocScreen({
  session,
  onNext,
}: {
  session: Session;
  onNext: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [docUrl, setDocUrl] = useState<string | null>(session.doc_url ?? null);
  const [folderUrl, setFolderUrl] = useState<string | null>(session.folder_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/generate-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: session.nombre,
            correo: session.correo,
            answers: session.answers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo generar el documento");
        setDocUrl(data.doc_url);
        setFolderUrl(data.folder_url ?? null);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado");
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <h1 className="text-2xl font-bold text-white">Tu documento 📄</h1>

      {status === "loading" && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Generando tu documento con todo lo que nos contaste… un momento.
        </p>
      )}

      {status === "ready" && (
        <>
          <p className="mt-2 text-slate-400">
            Reunimos todo (voz + chat + tus archivos) en una carpeta compartida contigo como editor
            {session.correo ? ` (${session.correo})` : ""}. Revísalo antes de tu reunión.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_25px_-5px_rgba(52,211,153,0.7)] hover:from-emerald-400 hover:to-teal-400"
              >
                Abrir mi documento
              </a>
            )}
            {folderUrl && (
              <a
                href={folderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                📁 Abrir mi carpeta de Drive
              </a>
            )}
            <Button onClick={onNext}>Agendar mi reunión →</Button>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            No pudimos generar el documento ahora ({error}). Puedes continuar y lo generamos luego.
          </p>
          <div className="mt-6">
            <Button onClick={onNext}>Continuar a agendar →</Button>
          </div>
        </>
      )}
    </Card>
  );
}
