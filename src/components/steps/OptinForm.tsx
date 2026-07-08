"use client";
import { useState } from "react";
import { Card, Button, Field, inputClass } from "@/components/ui";
import { COUNTRIES } from "@/lib/countries";
import { Session } from "@/lib/steps";

export default function OptinForm({
  onDone,
}: {
  onDone: (s: Session) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [correo, setCorreo] = useState("");
  const [dial, setDial] = useState("+52");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const telefono = phone.trim() ? `${dial} ${phone.trim()}` : "";
    // Sin base de datos: la sesión vive en estado de React durante el flujo.
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}`;
    onDone({ id, nombre, apellido, empresa, correo, telefono, answers: {} });
  };

  return (
    <Card>
      <h1 className="text-2xl font-bold text-white">Bienvenido a Propy AI 👋</h1>
      <p className="mt-2 text-slate-400">
        Antes de empezar, déjanos tus datos para personalizar tu onboarding.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Nombre *">
            <input
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Camila"
              required
            />
          </Field>
          <Field label="Apellido *">
            <input
              className={inputClass}
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              placeholder="Ej: Rodríguez"
              required
            />
          </Field>
        </div>
        <Field label="Nombre de tu empresa *">
          <input
            className={inputClass}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Ej: Constructora del Valle"
            required
          />
        </Field>
        <Field
          label="Correo de trabajo *"
          hint="Usa el correo que ocupas para trabajo: ahí te compartiremos tu documento con toda la información y tu carpeta de Drive."
        >
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
          <div className="flex gap-2">
            <select
              value={dial}
              onChange={(e) => setDial(e.target.value)}
              className="w-28 flex-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Código de país"
            >
              {COUNTRIES.map((c) => (
                <option key={c.iso} value={c.dial} className="bg-slate-900 text-white">
                  {c.flag} {c.dial}
                </option>
              ))}
            </select>
            <input
              className={`${inputClass} flex-1`}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="55 1234 5678"
            />
          </div>
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Creando…" : "Empezar mi onboarding →"}
        </Button>
      </form>
    </Card>
  );
}
