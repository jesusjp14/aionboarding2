"use client";
import { Card, Button } from "@/components/ui";

// Calendario de planificación (GHL / LeadConnector). Al agendar, GHL envía la
// confirmación por WhatsApp automáticamente y por su cuenta (fuera de esta app).
const CALENDAR_URL =
  "https://updates.masterleads.pro/widget/bookings/planificacin-de-proyecto";

export default function AgendarScreen({ onNext }: { onNext: () => void }) {
  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">
        Agenda tu reunión de planificación 🗓️
      </h1>
      <p className="mt-2 text-slate-500">
        Elige el horario que mejor te quede. Recibirás la confirmación por WhatsApp.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <iframe
          src={CALENDAR_URL}
          className="h-[70vh] min-h-[600px] w-full"
          title="Agendar reunión de planificación"
        />
      </div>
      <div className="mt-6">
        <Button onClick={onNext}>Ya agendé, continuar →</Button>
      </div>
    </Card>
  );
}
