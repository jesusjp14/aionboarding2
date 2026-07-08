"use client";
import { useState } from "react";
import { Card, Button, Field, inputClass } from "@/components/ui";
import { Session } from "@/lib/steps";

const FIELDS: { name: string; label: string; placeholder: string }[] = [
  {
    name: "crm_api",
    label: "Documentación de la API de tu CRM",
    placeholder:
      "Pega el link a la doc de tu CRM, o escríbelo aquí. Si no lo tienes, escribe 'lo envío luego'.",
  },
  {
    name: "faqs",
    label: "Preguntas frecuentes de tus clientes",
    placeholder: "Ej: ¿Tienen financiamiento? ¿Cuál es la cuota inicial? ¿El precio incluye acabados?",
  },
  {
    name: "objeciones",
    label: "Objeciones comunes y cómo responderlas",
    placeholder:
      "Ej: 'Está muy caro' → plusvalía y planes de pago. 'Lo voy a pensar' → visita sin compromiso.",
  },
  {
    name: "info_negocio",
    label: "Información general del negocio",
    placeholder: "Nombre, años en el mercado, zonas, diferencial frente a la competencia.",
  },
  {
    name: "info_proyectos",
    label: "Información de tus proyectos",
    placeholder: "Por proyecto: nombre, ubicación, tipo, rango de precios, etapa de venta, entrega.",
  },
  {
    name: "datos_obligatorios",
    label: "Datos que la IA NO puede dejar de captar",
    placeholder: "Ej: nombre completo, teléfono, presupuesto y proyecto de interés — siempre.",
  },
  {
    name: "casos_especificos",
    label: "Casos específicos que la IA debe saber manejar",
    placeholder: "Ej: cliente extranjero que pregunta por crédito, o alguien que pide un humano ya.",
  },
];

export default function TextPhase({
  session,
  onDone,
}: {
  session: Session;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submit-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id, answers: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error guardando");
      onDone(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">Últimos datos exactos ✍️</h1>
      <p className="mt-2 text-slate-500">
        Completa con calma. Esto se suma a lo que conversaste con el ORB para armar tu documento.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {FIELDS.map((f) => (
          <Field key={f.name} label={f.label}>
            <textarea
              className={`${inputClass} min-h-[90px] resize-y`}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
            />
          </Field>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando y generando tu documento…" : "Enviar y generar mi documento →"}
        </Button>
      </form>
    </Card>
  );
}
