"use client";
import { Card, Button } from "@/components/ui";

export default function AgendarScreen({ onNext }: { onNext: () => void }) {
  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">Agenda tu reunión de planificación 🗓️</h1>
      <p className="mt-2 text-slate-500">
        Elige el horario que mejor te quede. Aquí irá el calendario embebido (Calendly o GHL,
        por definir en la pieza 7).
      </p>
      <div className="mt-8 flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        [ Calendario embebido pendiente ]
      </div>
      <div className="mt-8">
        <Button onClick={onNext}>Ya agendé, continuar →</Button>
      </div>
    </Card>
  );
}
