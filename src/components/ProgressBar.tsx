"use client";

// Barra de progreso indeterminada, para esperas (evita que parezca error).
export default function ProgressBar({ label }: { label?: string }) {
  return (
    <div>
      {label && <p className="mb-2 text-sm text-slate-400">{label}</p>}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <span
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
          style={{ animation: "progress-indeterminate 1.4s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}
