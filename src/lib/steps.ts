// Definición de los pasos del onboarding (sección 5 del CLAUDE.md).
export type StepId =
  | "optin"
  | "bienvenida"
  | "proceso"
  | "orb"
  | "texto"
  | "doc"
  | "agendar"
  | "gracias";

export const STEPS: { id: StepId; label: string }[] = [
  { id: "optin", label: "Tus datos" },
  { id: "bienvenida", label: "Bienvenida" },
  { id: "proceso", label: "Proceso" },
  { id: "orb", label: "Llamada ORB" },
  { id: "texto", label: "Datos exactos" },
  { id: "doc", label: "Tu documento" },
  { id: "agendar", label: "Agendar" },
  { id: "gracias", label: "¡Listo!" },
];

export type Session = {
  id: string;
  nombre: string;
  apellido: string;
  empresa: string;
  correo: string;
  telefono: string;
  answers: Record<string, unknown>;
  doc_url?: string | null;
  folder_url?: string | null;
  estado?: string;
};
