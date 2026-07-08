// Configura el agente ORB en Retell vía API REST.
// Uso:  node scripts/retell-setup.mjs
// Requiere RETELL_API_KEY y RETELL_AGENT_ID en .env.local
import { readFileSync } from "node:fs";

// --- cargar .env.local a mano (sin dependencias) ---
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const KEY = process.env.RETELL_API_KEY;
const AGENT_ID = process.env.RETELL_AGENT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const WEBHOOK_URL = `${BASE_URL.replace(/\/$/, "")}/api/retell/webhook`;

if (!KEY) throw new Error("Falta RETELL_API_KEY en .env.local");
if (!AGENT_ID) throw new Error("Falta RETELL_AGENT_ID en .env.local");

const api = async (path, method = "GET", body) => {
  const res = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
};

const ORB_PROMPT = `# IDENTIDAD
Eres el ORB, asistente de onboarding de Propy AI. Guías a {{nombre}} por voz,
en español latino neutro, tuteo, cálido, directo y humano. Frases cortas.
Llamas a la persona por su nombre. Nunca suenas robótico.

# MISIÓN
Haces preguntas conversacionales para conocer su negocio inmobiliario.
UNA pregunta a la vez. No avanzas sin respuesta. Si el cliente duda, das UN
ejemplo corto y esperas. Al terminar TODAS, te despides y cuelgas. No pides
datos técnicos exactos (doc de API, FAQs, objeciones van por escrito después).

# PREGUNTAS (en orden)
1. ¿Cómo es hoy tu proceso comercial? Desde que llega un cliente nuevo, ¿qué pasa?
2. ¿Qué te gustaría lograr con la IA? ¿Qué es lo que más te quita tiempo hoy?
   (Ej: "responder más rápido, filtrar curiosos, o agendar visitas solo.")
3. ¿Por dónde te llegan hoy los clientes: formularios de Meta, campañas de WhatsApp, o ambos?
4. ¿Cuántos asesores comerciales tienes en tu equipo?
5. ¿Cada asesor maneja su propio número, o todos trabajan desde uno central?
6. ¿Qué CRM usas actualmente? (Ej: "HubSpot, Salesforce, o uno propio.")
   (NO pidas la doc de la API aquí — eso va por escrito en la siguiente pantalla.)
7. En esta primera fase, ¿cuántos proyectos inmobiliarios quieres que la IA maneje?
8. ¿Cómo te gustaría que tu IA se presente al cliente? Dame una idea.
   (Ej: "Hola, soy Sofía, asesora de Constructora X, ¿en qué proyecto te interesa invertir?")
9. ¿Qué preguntas debería hacer la IA para saber si un cliente califica?
   (Ej: "presupuesto, si busca para vivir o invertir, en cuánto tiempo quiere comprar.")
10. ¿Qué estilo quieres para tu IA: formal, cercano, o consultivo?
11. Cuando la IA cierra bien, ¿qué quieres que haga: agendar llamada, pasarlo a un asesor, o ambas?

# CIERRE
"Listo {{nombre}}, con esto ya tengo la base de tu negocio. Ahora en la
pantalla te van a aparecer unas preguntas cortas para que me dejes por
escrito algunos datos exactos, como la documentación de tu CRM, tus
preguntas frecuentes y objeciones. Cuando termines, agendas tu reunión de
planificación. ¡Nos vemos ahí, éxitos!"
Luego cuelga.`;

const BEGIN_MESSAGE = "¡Hola {{nombre}}! Soy el ORB, tu asistente de onboarding de Propy AI. Voy a hacerte unas preguntas rápidas sobre tu negocio. Empecemos: ¿cómo es hoy tu proceso comercial? Desde que llega un cliente nuevo, ¿qué pasa?";

const POST_CALL = [
  ["proceso_comercial", "Cómo es hoy el proceso comercial del cliente, desde que llega un prospecto nuevo.", "string"],
  ["objetivo", "Qué quiere lograr el cliente con la IA y qué le quita más tiempo hoy.", "string"],
  ["marketing", "Por dónde le llegan los clientes: formularios de Meta, campañas de WhatsApp, o ambos.", "string"],
  ["num_asesores", "Número de asesores comerciales en el equipo (entero).", "number"],
  ["estructura_numeros", "Si cada asesor tiene número propio o todos trabajan desde uno central.", "string"],
  ["crm_nombre", "Qué CRM usa actualmente el cliente (solo el nombre).", "string"],
  ["num_proyectos", "Cuántos proyectos inmobiliarios trabajará con la IA en esta fase (entero).", "number"],
  ["intro_ia", "Cómo quiere que su IA se presente al cliente final (borrador hablado).", "string"],
  ["preguntas_filtro", "Qué preguntas debe hacer la IA para calificar a un prospecto (borrador hablado).", "string"],
  ["estilo", "Estilo deseado de la IA (formal, cercano, consultivo).", "string"],
  ["cta", "Qué debe hacer la IA al cerrar: agendar llamada, derivar a un asesor, o ambas.", "string"],
].map(([name, description, type]) => ({ name, description, type }));

const main = async () => {
  console.log("→ Leyendo agente…");
  const agent = await api(`/get-agent/${AGENT_ID}`);
  const engine = agent.response_engine || {};
  console.log("  response_engine:", JSON.stringify(engine));

  if (engine.llm_id) {
    console.log("→ Actualizando prompt del Retell LLM…");
    await api(`/update-retell-llm/${engine.llm_id}`, "PATCH", {
      general_prompt: ORB_PROMPT,
      begin_message: BEGIN_MESSAGE,
    });
    console.log("  ✓ prompt y begin_message actualizados");
  } else {
    console.log("  ⚠ El agente no usa un Retell LLM (engine:", engine.type, "). Ajusta el prompt manualmente.");
  }

  console.log("→ Actualizando agente (webhook + post-call analysis)…");
  await api(`/update-agent/${AGENT_ID}`, "PATCH", {
    webhook_url: WEBHOOK_URL,
    post_call_analysis_data: POST_CALL,
  });
  console.log("  ✓ webhook:", WEBHOOK_URL);
  console.log("  ✓ post_call_analysis_data:", POST_CALL.length, "variables");
  console.log("\n✅ Retell configurado.");
};

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
