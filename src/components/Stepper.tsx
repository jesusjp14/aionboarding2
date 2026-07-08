"use client";
import { STEPS, StepId } from "@/lib/steps";

export default function Stepper({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= idx ? "bg-indigo-500" : "bg-slate-200"
              }`}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">
        Paso {idx + 1} de {STEPS.length} · {STEPS[idx]?.label}
      </p>
    </div>
  );
}
