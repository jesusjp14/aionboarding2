import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// POST /api/chat — Fase 2: chat con OpenAI que recolecta los datos exactos.
// Body: { nombre, messages, finish? }
// Devuelve: { reply, done, answers? }
// La finalización se detecta con function calling (confiable), no con texto.

const CAMPOS = `
1. crm_api — Documentación/API del CRM (link o texto; si no la tiene, "lo envío luego").
2. faqs — Preguntas frecuentes de sus clientes. Pide un MÍNIMO de 10; si da menos, anímale a completar hasta 10 antes de avanzar.
3. objeciones — Objeciones comunes y cómo responderlas. Pide un MÍNIMO de 10; si da menos, anímale a completar hasta 10.
4. info_negocio — Información general del negocio (nombre, años, zonas, diferencial).
5. info_proyectos — Información de sus proyectos (nombre, ubicación, tipo, precios, etapa).
6. datos_obligatorios — Datos que la IA NO puede dejar de captar en cada conversación.
7. casos_especificos — Casos específicos que la IA debe saber manejar.`;

const systemPrompt = (nombre: string) => `Eres Camila, asistente de onboarding de Propy AI, conversando por CHAT (texto) con ${nombre}.
Español latino, tuteo, cálido, directo, frases cortas. Ya tuvo una llamada de voz;
ahora recoges por escrito 7 datos EXACTOS de su negocio inmobiliario.

Al inicio de la conversación PRESÉNTATE: di que eres Camila, que ahora harás 7 preguntas
cortas por escrito para completar los datos exactos, y que si tiene documentos (ej: la
documentación de su CRM, catálogos) puede subirlos con el botón de adjuntar. Luego arranca.

Los 7 datos:${CAMPOS}

Reglas:
- UNA cosa a la vez, en orden. Si duda, da un ejemplo corto de inmobiliaria.
- Acepta respuestas breves; si dice "no aplica" o "luego", avanza.
- Cuando termines de recolectar los 7 (o el cliente ya no tenga más que aportar),
  DEBES llamar a la función 'finalizar_onboarding' con todos los datos. NO lo anuncies
  solo con texto: llama a la función. Ese es el único modo de terminar.`;

const TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "finalizar_onboarding",
    description: "Guarda los datos recolectados y finaliza el chat de onboarding. Llamar SOLO cuando ya se recolectó todo.",
    parameters: {
      type: "object",
      properties: {
        crm_api: { type: "string" },
        faqs: { type: "string" },
        objeciones: { type: "string" },
        info_negocio: { type: "string" },
        info_proyectos: { type: "string" },
        datos_obligatorios: { type: "string" },
        casos_especificos: { type: "string" },
      },
      required: [
        "crm_api", "faqs", "objeciones", "info_negocio",
        "info_proyectos", "datos_obligatorios", "casos_especificos",
      ],
    },
  },
};

export async function POST(req: NextRequest) {
  const { nombre, messages, finish } = await req.json();
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
    tools: [TOOL],
    // Si el usuario pulsó "Finalizar", forzamos la extracción ahora.
    tool_choice: finish
      ? { type: "function", function: { name: "finalizar_onboarding" } }
      : "auto",
    messages: [
      { role: "system", content: systemPrompt(nombre || "el cliente") },
      ...(messages ?? []),
    ],
  });

  const msg = completion.choices[0]?.message;
  const toolCall = msg?.tool_calls?.[0];

  if (toolCall && toolCall.type === "function") {
    let answers: Record<string, string> = {};
    try {
      answers = JSON.parse(toolCall.function.arguments);
    } catch {
      answers = {};
    }
    return NextResponse.json({
      reply: "¡Listo! Con esto tengo todos tus datos. Generando tu documento… 📄",
      done: true,
      answers,
    });
  }

  return NextResponse.json({ reply: msg?.content ?? "", done: false });
}
