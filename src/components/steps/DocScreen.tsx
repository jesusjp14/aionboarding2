"use client";
import { Card, Button } from "@/components/ui";

export default function DocScreen({
  docUrl,
  onNext,
}: {
  docUrl?: string | null;
  onNext: () => void;
}) {
  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">Tu documento está listo 📄</h1>
      <p className="mt-2 text-slate-500">
        Reunimos todo lo que nos contaste (voz + texto) en un documento que compartimos
        contigo como editor. Revísalo antes de tu reunión de planificación.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {docUrl ? (
          <a
            href={docUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Abrir mi documento
          </a>
        ) : (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            El documento se generará automáticamente cuando conectemos Google Docs (pieza 6).
          </p>
        )}
        <Button onClick={onNext}>Agendar mi reunión →</Button>
      </div>
    </Card>
  );
}
