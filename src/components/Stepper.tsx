"use client";
import { STEPS, StepId } from "@/lib/steps";

export default function Stepper({
  current,
  onBack,
}: {
  current: StepId;
  onBack?: () => void;
}) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-200"
        >
          ← Volver al paso anterior
        </button>
      )}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= idx
                  ? "bg-gradient-to-r from-indigo-400 to-violet-400 shadow-[0_0_10px_-1px_rgba(139,92,246,0.8)]"
                  : "bg-white/10"
              }`}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-widest text-slate-400">
        Paso {idx + 1} de {STEPS.length} · {STEPS[idx]?.label}
      </p>
    </div>
  );
}
