"use client";
import { useState } from "react";
import { Card, Button, Field, inputClass } from "@/components/ui";
import { Session } from "@/lib/steps";

export default function OptinForm({
  onDone,
}: {
  onDone: (s: Session) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Sin base de datos: la sesión vive en estado de React durante el flujo.
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}`;
    onDone({ id, nombre, correo, telefono, answers: {} });
  };

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">Bienvenido a Propy AI 👋</h1>
      <p className="mt-2 text-slate-500">
        Antes de empezar, déjanos tus datos para personalizar tu onboarding.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Tu nombre">
          <input
            className={inputClass}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Camila"
            required
          />
        </Field>
        <Field label="Correo">
          <input
            className={inputClass}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@empresa.com"
            required
          />
        </Field>
        <Field label="Teléfono (WhatsApp)">
          <input
            className={inputClass}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+52 55 1234 5678"
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Creando…" : "Empezar mi onboarding →"}
        </Button>
      </form>
    </Card>
  );
}
