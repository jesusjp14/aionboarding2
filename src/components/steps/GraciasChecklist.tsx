"use client";
import { useState } from "react";
import { Card } from "@/components/ui";
import Confetti from "@/components/Confetti";

const ACADEMIA_URL = "https://academy.propyia.com/";
const ACADEMIA_IMG =
  "https://assets.cdn.filesafe.space/tIKvRwMVzYT2L32LmoVE/media/6a4da272a97402b00b33b6d2.png";
const TWILIO_URL = "https://www.twilio.com/try-twilio";
const TWILIO_LOOM = "https://www.loom.com/embed/69a208e2a27a40d7bec6ae11a34ccb12";

export default function GraciasChecklist({ nombre }: { nombre: string }) {
  const [done, setDone] = useState<Record<string, boolean>>({
    twilio: false,
    academia: false,
  });

  const toggle = (k: string) => setDone((d) => ({ ...d, [k]: !d[k] }));
  const allDone = done.twilio && done.academia;

  const Check = ({ id }: { id: string }) => (
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
  );

  return (
    <Card>
      <div className="relative">
        {allDone && <Confetti />}
        <h1 className="text-2xl font-bold text-white">
          ¡Gracias, {nombre.split(" ")[0]}! 🎉
        </h1>
        <p className="mt-2 text-slate-400">
          Tu onboarding está completo. Te enviamos la confirmación por WhatsApp y correo.
          Solo faltan estos dos pasos para dejar todo listo:
        </p>

        <div className="mt-8 space-y-4">
          {/* Twilio */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex gap-4">
              <Check id="twilio" />
              <div className="flex-1">
                <p className={`font-semibold ${done.twilio ? "text-slate-500 line-through" : "text-white"}`}>
                  Crear tu cuenta en Twilio
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Mira el video y sigue los pasos para configurar tu número.
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                  <div className="relative w-full" style={{ paddingBottom: "62%" }}>
                    <iframe
                      src={TWILIO_LOOM}
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                      title="Tutorial Twilio"
                    />
                  </div>
                </div>
                <a
                  href={TWILIO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_-5px_rgba(244,63,94,0.7)] hover:from-red-500 hover:to-rose-500"
                >
                  Crear cuenta en Twilio →
                </a>
              </div>
            </div>
          </div>

          {/* Academia */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex gap-4">
              <Check id="academia" />
              <div className="flex-1">
                <p className={`font-semibold ${done.academia ? "text-slate-500 line-through" : "text-white"}`}>
                  Accede a la Academia Propy
                </p>
                <p className="mt-1 text-sm text-slate-400">Aprende a sacarle el máximo a tu IA.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ACADEMIA_IMG}
                  alt="Academia Propy"
                  className="mt-3 w-full rounded-lg border border-white/10"
                />
                <a
                  href={ACADEMIA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_-5px_rgba(139,92,246,0.7)] hover:from-indigo-400 hover:to-violet-400"
                >
                  Ir a la Academia →
                </a>
              </div>
            </div>
          </div>
        </div>

        {allDone && (
          <p className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">
            ¡Todo listo, {nombre.split(" ")[0]}! Completaste tu onboarding por completo. 🚀
          </p>
        )}
      </div>
    </Card>
  );
}
