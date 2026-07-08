@AGENTS.md

# CLAUDE.md — Onboarding IA (Propy AI)

Este documento es el contexto maestro del proyecto. Léelo completo antes de escribir código. No inventes arquitectura fuera de lo aquí definido; si algo no está especificado, pregúntame antes de asumir.

---

## 1. Qué estamos construyendo

Una **app web interactiva de onboarding** para clientes de Propy AI (SaaS de agentes de IA conversacional para inmobiliarias en LATAM).

El cliente entra, ve una bienvenida, deja sus datos, conversa por **voz** con un agente de IA (el "ORB") que le hace preguntas sobre su negocio, luego completa un **cuestionario de texto** con datos exactos, y al final se genera automáticamente un **Google Doc** con toda su información (compartido con él como editor). Después agenda una reunión de planificación y recibe confirmación por WhatsApp y correo.

**Principio rector: lo más simple que funcione bien.** Sin sobre-ingeniería. Un solo agente de voz, una sola tabla, endpoints mínimos.

---

## 2. Stack

- **Frontend + Backend**: Next.js (App Router) desplegado en Vercel. Los API Routes de Next.js son todo el backend — NO usamos n8n ni servidores aparte.
- **Base de datos**: Supabase (una sola tabla: `sessions`).
- **Agente de voz (ORB)**: Retell AI. Agente actual: "Camila AI onboarding", LLM GPT-5.1 dentro de Retell, español (Latam).
- **Fase 2 de texto**: chat por escrito con OpenAI (GPT) — POR CONFIRMAR reparto vs. formulario simple (ver nota en secciones 4 y 11).
- **Documento del cliente**: Google Docs API + Drive API (crear y compartir como editor).
- **Confirmaciones**: GoHighLevel (GHL) API para WhatsApp + correo.
- **Agendamiento**: Calendly o GHL Calendar (POR DEFINIR — ver sección 16).

---

## 3. Arquitectura de datos — LA REGLA CLAVE

La información viene de **dos fuentes distintas** que se fusionan al final:

```
VOZ   → Retell transcribe y extrae (Post-Call Analysis) → llega por webhook al colgar
TEXTO → el usuario lo escribe (chat OpenAI / formulario) → la app lo guarda en Supabase
                                          │
                        al final: voz + texto → se fusionan → Google Doc (nombre del cliente)
```

**Por qué están separados:** Retell es un motor de voz. Su transcript SOLO contiene lo que entró por micrófono. Lo que el usuario TECLEA nunca pasa por Retell — por eso la app lo guarda por su cuenta.

Regla mental: **Retell solo sabe lo que se habló. Todo lo escrito lo guarda la app.**

---

## 4. Flujo de dos fases (importante)

**FASE 1 — Llamada ORB (solo voz):** el ORB hace todas las preguntas conversacionales de corrido. Al terminar, cuelga. Retell extrae las respuestas (Post-Call Analysis) y las manda por el webhook `call_analyzed`. La app las guarda en `answers`.

**FASE 2 — Texto (después de la llamada):** la app recoge los datos exactos por escrito y los guarda en `answers`.
> ⚠️ DECISIÓN ABIERTA: la Fase 2 puede ser (a) un **formulario simple** o (b) un **chat con OpenAI** que conversa por escrito y al terminar entrega la info. El usuario mencionó chat con OpenAI directamente. Confirmar antes de codear esta pieza. Si es chat OpenAI: agrega `OPENAI_API_KEY` y endpoint `/api/chat`.

**NO se necesitan custom functions en Retell.** Solo Post-Call Analysis + 1 webhook.

---

## 5. Orden completo de pasos (la app)

| Paso | Pantalla | Medio | ¿ORB? |
|------|----------|-------|-------|
| 0 | Optin / Form | Texto (nombre, correo, teléfono) | No |
| 1 | Bienvenida | Texto (video después) | No |
| 2 | Proceso de trabajo | Texto (video después) | No |
| 3 | **Llamada ORB (Fase 1)** | Voz | **Sí** |
| 4 | **Cuestionario de texto (Fase 2)** | Chat/Formulario | No |
| 5 | Generar Doc + link de agendamiento | Automático + texto | No |
| 6 | Agendar reunión | Link de calendario | No |
| 7 | Pantalla "¡Gracias!" (checklist) | Texto | No |

**Pantallas 1 y 2:** componente único que muestra un video si hay `video_url`, o solo el texto si es `null`.

**Pantalla "¡Gracias!" (paso 7):** checklist post-agendamiento:
- ☐ Crear cuenta en Twilio (video tutorial + botón "Ir a Twilio")
- ☐ Acceso a Academia → botón a `https://academy.propyia.com/`

---

## 6. Personalización por nombre

En el optin (paso 0) se captura el nombre y se crea la sesión en Supabase. Al arrancar la llamada del ORB se pasa el nombre como variable dinámica a Retell:

```js
retellClient.startCall({
  agentId: "AGENT_ID",
  retellLlmDynamicVariables: { nombre: session.nombre }
});
```

En el prompt del ORB, cada `{{nombre}}` se reemplaza. La UI de toda la app también usa el nombre.

---

## 7. Base de datos (Supabase)

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  correo text,
  telefono text,
  current_step int default 0,
  answers jsonb default '{}',                 -- voz + texto fusionados
  doc_url text,
  estado text default 'en_proceso',            -- en_proceso | voz_completa | doc_generado | agendado | incompleto
  reunion_at timestamptz,
  retell_call_id text,                         -- vincula el webhook a la sesión
  tareas jsonb default '{"twilio": false, "academia": false}',
  created_at timestamptz default now()
);
```

Merge en `answers` sin pisar lo existente (RPC o leer-modificar-escribir en el endpoint).

---

## 8. Endpoints (Next.js API Routes)

- `POST /api/session` — crea la sesión desde el optin. Devuelve `session_id`.
- `POST /api/retell/start` — inicia la llamada del ORB con el nombre dinámico; guarda `retell_call_id`.
- `POST /api/retell/webhook` — recibe `call_analyzed`. Extrae `custom_analysis_data` (voz) → `answers`. `estado = voz_completa`. Red de seguridad: si se cortó, marca `incompleto` y avisa.
- `POST /api/submit-text` (o `/api/chat` si es chat OpenAI) — recibe la Fase 2, merge en `answers`, dispara la generación del Doc.
- `POST /api/generate-doc` — copia plantilla, reemplaza placeholders con `answers`, comparte como editor al `correo`, guarda `doc_url`, `estado = doc_generado`.
- `POST /api/booking-webhook` — al agendar: `estado = agendado` + `reunion_at`, avisa al equipo, confirma al cliente por WhatsApp + correo (SIN recordatorios).

---

## 9. Configuración de Retell

**NO se crean custom functions.** Solo:

**Post-Call Analysis** (`custom_analysis_data`) — variables a extraer del transcript de voz:

```
proceso_comercial   → "Cómo es hoy el proceso comercial del cliente, desde que llega un prospecto nuevo."
objetivo            → "Qué quiere lograr el cliente con la IA y qué le quita más tiempo hoy."
marketing           → "Por dónde le llegan los clientes: formularios de Meta, campañas de WhatsApp, o ambos."
num_asesores        → "Número de asesores comerciales en el equipo (entero)."
estructura_numeros  → "Si cada asesor tiene número propio o todos trabajan desde uno central."
crm_nombre          → "Qué CRM usa actualmente el cliente (solo el nombre; la doc de la API se pide por texto)."
num_proyectos       → "Cuántos proyectos inmobiliarios trabajará con la IA en esta fase (entero)."
intro_ia            → "Cómo quiere que su IA se presente al cliente final (borrador hablado)."
preguntas_filtro    → "Qué preguntas debe hacer la IA para calificar a un prospecto (borrador hablado)."
estilo              → "Estilo deseado de la IA (formal, cercano, consultivo)."
cta                 → "Qué debe hacer la IA al cerrar: agendar llamada, derivar a un asesor, o ambas."
```

**Webhook** — `https://TUAPP.vercel.app/api/retell/webhook` para recibir `call_analyzed`.

---

## 10. Prompt del ORB (Retell) — Fase 1, solo voz

```
# IDENTIDAD
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
Luego cuelga.
```

---

## 11. Cuestionario de texto (Fase 2) — campos

Cada campo con ejemplo de inmobiliaria como placeholder guía:

1. **crm_api** — Documentación de la API de tu CRM
   _"Pega el link a la doc de tu CRM, o escríbelo aquí. Si no lo tienes, escribe 'lo envío luego'."_
2. **faqs** — Preguntas frecuentes de tus clientes
   _"Ej: ¿Tienen financiamiento? ¿Cuál es la cuota inicial? ¿El precio incluye acabados?"_
3. **objeciones** — Objeciones comunes y cómo responderlas
   _"Ej: 'Está muy caro' → plusvalía y planes de pago. 'Lo voy a pensar' → visita sin compromiso."_
4. **info_negocio** — Información general del negocio
   _"Nombre, años en el mercado, zonas, diferencial frente a la competencia."_
5. **info_proyectos** — Información de tus proyectos
   _"Por proyecto: nombre, ubicación, tipo, rango de precios, etapa de venta, entrega."_
6. **datos_obligatorios** — Datos que la IA NO puede dejar de captar
   _"Ej: nombre completo, teléfono, presupuesto y proyecto de interés — siempre."_
7. **casos_especificos** — Casos específicos que la IA debe saber manejar
   _"Ej: cliente extranjero que pregunta por crédito, o alguien que pide un humano ya."_

Al enviar → merge en `answers` → dispara `/api/generate-doc`.

---

## 12. Generación del Google Doc

En `/api/generate-doc`:
1. Service Account de Google con scopes de Docs + Drive.
2. Copiar plantilla (placeholders `{{proceso_comercial}}`, `{{crm_api}}`, etc.).
3. Renombrar a `Onboarding – {{nombre_cliente}}`.
4. Reemplazar placeholders con `answers` (voz + texto).
5. Compartir como **editor** al `correo` (Drive `permissions.create`, role `writer`).
6. Guardar `doc_url`, `estado = doc_generado`.

---

## 13. Agendamiento y confirmación

Al agendar, el calendario dispara webhook a `/api/booking-webhook`:
1. `estado = agendado` + `reunion_at`.
2. Notifica al equipo interno.
3. Confirma al cliente por **WhatsApp (GHL)** y **correo** con fecha/hora + link del Doc.
4. **SIN recordatorios.**

---

## 14. Variables de entorno

```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Retell
RETELL_API_KEY
RETELL_AGENT_ID

# OpenAI (si Fase 2 es chat)
OPENAI_API_KEY

# Google (Service Account con Docs + Drive)
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_DOC_TEMPLATE_ID

# GHL
GHL_API_KEY
GHL_LOCATION_ID

# App
NEXT_PUBLIC_BASE_URL
ACADEMIA_URL=https://academy.propyia.com/
```

---

## 15. Orden de construcción (por piezas, no todo de golpe)

Construir y PROBAR cada pieza antes de la siguiente:

1. **Scaffold**: Next.js + Supabase + tabla `sessions` + navegación por pasos. Sin integraciones.
2. **Optin + sesión**: form + `/api/session`.
3. **Pantallas de contenido**: Bienvenida y Proceso (componente video→texto).
4. **Integración Retell**: widget de voz + nombre dinámico + `/api/retell/start` + `/api/retell/webhook`.
5. **Fase 2 (texto)**: chat/formulario + endpoint.
6. **Google Docs**: `/api/generate-doc`.
7. **Agendamiento**: `/api/booking-webhook` + confirmaciones GHL.
8. **Pantalla "¡Gracias!"**: checklist Twilio + Academia.

---

## 16. Decisiones pendientes (preguntar antes de codear la pieza afectada)

- **Fase 2**: ¿formulario simple o chat con OpenAI? (ver sección 4).
- **Agendamiento**: ¿Calendly o GHL Calendar? Define el payload del `booking-webhook`.
- **Diseño visual**: estética de la app.
- **Plantilla del Doc**: layout final.

---

## 17. Reglas para Claude Code

- Construye por piezas en el orden de la sección 15. No todo de golpe.
- NO crees custom functions de Retell.
- Voz y texto se guardan por separado y se fusionan al final.
- Usa el nombre del cliente en la UI y en la variable dinámica de Retell.
- Nunca uses localStorage/sessionStorage; usa estado de React + Supabase.
- Antes de cada integración externa, confirma que tengo las credenciales listas.
- Si una decisión de la sección 16 sigue abierta, pregunta antes de codear esa parte.
