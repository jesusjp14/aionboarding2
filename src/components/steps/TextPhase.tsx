"use client";
import { useRef, useState } from "react";
import { Card, Button, Field, inputClass } from "@/components/ui";
import { Session } from "@/lib/steps";

const FIELDS: { name: string; label: string; placeholder: string }[] = [
  {
    name: "crm_api",
    label: "Documentación de la API de tu CRM",
    placeholder: "Pega el link a la doc de tu CRM, o escríbelo aquí. Si no lo tienes, escribe 'lo envío luego'.",
  },
  {
    name: "faqs",
    label: "Preguntas frecuentes de tus clientes (mínimo 10)",
    placeholder: "Ej: ¿Tienen financiamiento? ¿Cuál es la cuota inicial? ¿El precio incluye acabados? …",
  },
  {
    name: "objeciones",
    label: "Objeciones comunes y cómo responderlas (mínimo 10)",
    placeholder: "Ej: 'Está muy caro' → plusvalía y planes de pago. 'Lo voy a pensar' → visita sin compromiso. …",
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
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("nombre", session.nombre);
      if (session.correo) fd.append("correo", session.correo);
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error subiendo archivos");
      setUploads((u) => [...u, ...(data.uploaded ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo archivos");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onDone(values);
  };

  return (
    <Card>
      <h1 className="text-2xl font-bold text-white">Últimos datos exactos ✍️</h1>
      <p className="mt-2 text-slate-400">
        Completa con calma. Esto se suma a lo que conversaste con Camila para armar tu documento.
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

        {/* Subir archivos */}
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-slate-300">¿Tienes documentos para adjuntar?</p>
          <p className="mt-1 text-xs text-slate-500">
            Catálogos, documentación del CRM, brochures… se guardan en tu carpeta.
          </p>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onFiles} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40"
          >
            {uploading ? "Subiendo…" : "📎 Subir archivos"}
          </button>
          {uploads.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploads.map((u, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                >
                  📄 {u}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit">Enviar y generar mi documento →</Button>
      </form>
    </Card>
  );
}
