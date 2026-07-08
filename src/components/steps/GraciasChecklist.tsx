"use client";
import { useState } from "react";
import { Card } from "@/components/ui";

const ACADEMIA_URL = process.env.NEXT_PUBLIC_ACADEMIA_URL || "https://academy.propyia.com/";

export default function GraciasChecklist({ nombre }: { nombre: string }) {
  const [done, setDone] = useState<Record<string, boolean>>({
    twilio: false,
    academia: false,
  });

  const toggle = (k: string) => setDone((d) => ({ ...d, [k]: !d[k] }));

  const Item = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <button
        onClick={() => toggle(id)}
        className={`mt-0.5 h-6 w-6 flex-none rounded-full border-2 transition ${
          done[id] ? "border-emerald-500 bg-emerald-500" : "border-slate-500"
        }`}
        aria-label={done[id] ? "Completado" : "Marcar como completado"}
      >
        {done[id] && (
          <svg viewBox="0 0 20 20" fill="white" className="h-full w-full p-1">
            <path d="M7.5 13.5l-3-3 1-1 2 2 5-5 1 1z" />
          </svg>
        )}
      </button>
      <div className="flex-1">
        <p className={`font-semibold ${done[id] ? "text-slate-500 line-through" : "text-white"}`}>
          {title}
        </p>
        <div className="mt-2 text-sm text-slate-400">{children}</div>
      </div>
    </div>
  );

  return (
    <Card>
      <h1 className="text-2xl font-bold text-white">
        ¡Gracias, {nombre.split(" ")[0]}! 🎉
      </h1>
      <p className="mt-2 text-slate-400">
        Tu onboarding está completo. Te enviamos la confirmación por WhatsApp y correo.
        Solo faltan estos dos pasos para dejar todo listo:
      </p>
      <div className="mt-8 space-y-4">
        <Item id="twilio" title="Crear tu cuenta en Twilio">
          <p>Sigue el video tutorial para configurar tu número.</p>
          <a
            href="https://www.twilio.com/try-twilio"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-medium text-indigo-600 hover:underline"
          >
            Ir a Twilio →
          </a>
        </Item>
        <Item id="academia" title="Accede a la Academia Propy">
          <p>Aprende a sacarle el máximo a tu IA.</p>
          <a
            href={ACADEMIA_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-medium text-indigo-600 hover:underline"
          >
            Ir a la Academia →
          </a>
        </Item>
      </div>
    </Card>
  );
}
