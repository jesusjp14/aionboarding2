import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST /api/chat — Fase 2: chat con OpenAI que recolecta los 7 datos exactos.
// Body: { session_id, nombre, messages: [{role, content}] }
// Devuelve: { reply, done, answers? }  (answers solo cuando done=true)

const CAMPOS = `
1. crm_api — Documentación/API del CRM (link o texto; si no la tiene, "lo envío luego").
2. faqs — Preguntas frecuentes de sus clientes.
3. objeciones — Objeciones comunes y cómo responderlas.
4. info_negocio — Información general del negocio (nombre, años, zonas, diferencial).
5. info_proyectos — Información de sus proyectos (nombre, ubicación, tipo, precios, etapa).
6. datos_obligatorios — Datos que la IA NO puede dejar de captar en cada conversación.
7. casos_especificos — Casos específicos que la IA debe saber manejar.`;

const systemPrompt = (nombre: string) => `Eres el asistente de onboarding de Propy AI, conversando por CHAT (texto) con ${nombre}.
Español latino, tuteo, cálido, directo, frases cortas. Ya tuvo una llamada de voz;
ahora recoges por escrito 7 datos EXACTOS de su negocio inmobiliario:${CAMPOS}

Reglas:
- UNA cosa a la vez, en orden. Si duda, da un ejemplo corto de inmobiliaria.
- Acepta respuestas breves; no seas insistente. Si dice "no aplica" o "luego", avanza.
- Cuando tengas los 7 (o el cliente ya no tenga más que aportar), cierra agradeciendo
  y avisa que se está generando su documento.
- Cuando y SOLO cuando hayas terminado de recolectar, incluye al final de tu mensaje
  una línea con este formato exacto (en una sola línea, JSON válido):
  <<DONE>>{"crm_api":"...","faqs":"...","objeciones":"...","info_negocio":"...","info_proyectos":"...","datos_obligatorios":"...","casos_especificos":"..."}
  No muestres el <<DONE>> antes de terminar. Rellena cada campo con lo que el cliente dijo (o "" si no aplica).`;

export async function POST(req: NextRequest) {
  const { session_id, nombre, messages } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI no configurado. Falta OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.6,
    messages: [
      { role: "system", content: systemPrompt(nombre || "el cliente") },
      ...(messages ?? []),
    ],
  });

  let reply = completion.choices[0]?.message?.content ?? "";
  let done = false;
  let answers: Record<string, string> | undefined;

  const marker = reply.indexOf("<<DONE>>");
  if (marker !== -1) {
    done = true;
    const jsonPart = reply.slice(marker + "<<DONE>>".length).trim();
    reply = reply.slice(0, marker).trim();
    try {
      answers = JSON.parse(jsonPart);
    } catch {
      answers = undefined;
    }

    // Persistir el merge en answers.
    if (answers) {
      const db = getSupabaseAdmin();
      if (db && session_id && !String(session_id).startsWith("local-")) {
        const { data: s } = await db
          .from("sessions")
          .select("answers")
          .eq("id", session_id)
          .maybeSingle();
        const merged = { ...((s?.answers as object) ?? {}), ...answers };
        await db.from("sessions").update({ answers: merged }).eq("id", session_id);
      }
    }
  }

  return NextResponse.json({ reply, done, answers });
}
