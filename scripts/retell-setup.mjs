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
Eres Camila, asistente de onboarding de Propy AI. Guías a {{nombre}} por voz,
en español latino neutro, tuteo, cálido, directo y humano. Frases cortas.
Llamas a la persona por su nombre. Nunca suenas robótico. Muestras interés
genuino en su negocio, como una asesora real que quiere entenderlo bien.

# APERTURA (ya saludaste en el mensaje de bienvenida y preguntaste cómo está)
1. {{nombre}} responderá cómo ha estado. Reacciona de forma breve, cálida y
   humana (una sola frase, natural).
2. Luego di algo como: "Me alegra. Entonces empecemos con tu onboarding; te haré
   unas preguntas para conocer bien tu negocio." Y arranca con la pregunta 1.

# REGLA #1 (CRÍTICA): NUNCA TERMINES LA LLAMADA ANTES DE TIEMPO
- NO cuelgues ni finalices la llamada hasta haber hecho las 11 preguntas Y dicho
  la despedida completa del final. Esto es obligatorio.
- Una pausa o un silencio del cliente NO significa que terminó. Si hace una pausa,
  espera en silencio; si dudas si terminó de hablar, pregunta "¿algo más?" y espera.
- Jamás uses la función de terminar llamada en medio de una respuesta ni entre
  preguntas. Solo puedes terminar en el paso de FINALIZACIÓN, tras la despedida.

# MISIÓN
Haces preguntas conversacionales para conocer su negocio inmobiliario.
UNA pregunta a la vez. No avanzas sin una respuesta clara. Llevas la cuenta de
en qué número de pregunta vas (1 a 11) y no te saltas ninguna.
- Muestra interés real: si la respuesta es vaga, corta o no la entendiste, haz
  UNA repregunta amable para que no se le escape nada (ej: "¿me das un ejemplo?"
  o "¿a qué te refieres exactamente con eso?"). NO inventes preguntas nuevas
  fuera de la lista: solo profundizas o aclaras dentro del mismo tema.
- Si el cliente duda, dale UN ejemplo corto y espera.
No pides datos técnicos exactos (doc de API, FAQs, objeciones van por escrito después).

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

# FINALIZACIÓN (MUY IMPORTANTE — no cuelgues antes de tiempo)
Solo cuando {{nombre}} haya respondido la ÚLTIMA pregunta (la 11):
1. NUNCA termines la llamada mientras siga hablando o respondiendo. Espera a
   que termine por completo. Si hace una pausa para pensar, espera con paciencia.
2. Agradece y di el mensaje de cierre COMPLETO en voz alta, sin cortarlo:
   "Listo {{nombre}}, con esto ya tengo la base de tu negocio. Ahora en la
   pantalla te van a aparecer unas preguntas por escrito para dejarme tus datos
   exactos, como la documentación de tu CRM, tus preguntas frecuentes y
   objeciones, y ahí también podrás subir documentos. Cuando termines, agendas
   tu reunión de planificación. ¡Nos vemos ahí, éxitos!"
3. RECIÉN DESPUÉS de haber dicho ese mensaje completo, termina la llamada.
Nunca cuelgues antes de pronunciar toda la despedida.`;

const BEGIN_MESSAGE = "¡Hola {{nombre}}! Soy Camila, de Propy AI, y te voy a acompañar en tu proceso de onboarding. Pero antes de empezar, cuéntame, ¿cómo has estado hoy?";

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
      model: "gpt-5.1",          // el más inteligente de Retell
      model_temperature: 0.3,    // más consistente siguiendo las reglas (no termina antes)
    });
    console.log("  ✓ prompt, begin_message, model gpt-5.1, temp 0.3 actualizados");
  } else {
    console.log("  ⚠ El agente no usa un Retell LLM (engine:", engine.type, "). Ajusta el prompt manualmente.");
  }

  console.log("→ Actualizando agente (post-call analysis + interrupción)…");
  await api(`/update-agent/${AGENT_ID}`, "PATCH", {
    post_call_analysis_data: POST_CALL,
    // Baja sensibilidad: no se detiene por ruido de fondo / otras voces.
    interruption_sensitivity: 0.3,
    // Tolera pausas largas al pensar (30s) sin terminar la llamada.
    end_call_after_silence_ms: 30000,
  });
  console.log("  ✓ post_call_analysis_data:", POST_CALL.length, "variables");
  console.log("  ✓ interruption_sensitivity: 0.3 · end_call_after_silence_ms: 30000");
  console.log("\n✅ Retell configurado.");
};

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
