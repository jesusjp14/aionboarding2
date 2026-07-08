import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import OpenAI from "openai";
import { getGoogleAuth, getOrCreateClientFolder, shareAsEditor, EXTRA_EDITORS } from "@/lib/google";

// POST /api/generate-doc — crea un Google Doc con formato profesional en la
// carpeta del cliente, lo comparte y devuelve doc_url + folder_url.
// Body: { nombre, correo, telefono, answers }

// Campos capturados por VOZ (post-call analysis) y por TEXTO (cuestionario).
const VOZ: [string, string][] = [
  ["proceso_comercial", "Proceso comercial"],
  ["objetivo", "Objetivo con la IA"],
  ["marketing", "Estrategia de marketing"],
  ["num_asesores", "Número de asesores"],
  ["estructura_numeros", "Estructura de números"],
  ["crm_nombre", "CRM que usa"],
  ["num_proyectos", "Proyectos en esta fase"],
  ["intro_ia", "Introducción de la IA"],
  ["preguntas_filtro", "Preguntas de filtro"],
  ["estilo", "Estilo de la IA"],
  ["cta", "Llamado a la acción (CTA)"],
];
const TEXTO: [string, string][] = [
  ["crm_api", "Documentación / API del CRM"],
  ["faqs", "Preguntas frecuentes"],
  ["objeciones", "Objeciones y respuestas"],
  ["info_negocio", "Información del negocio"],
  ["info_proyectos", "Información de proyectos"],
  ["datos_obligatorios", "Datos obligatorios"],
  ["casos_especificos", "Casos específicos"],
];

// Constructor de documento: acumula texto y estilos por rango.
type StyleReq = object;
class DocBuilder {
  text = "";
  requests: StyleReq[] = [];

  private push(chunk: string, named?: string, bold?: boolean) {
    const start = this.text.length + 1; // índice Docs (base 1)
    this.text += chunk;
    const end = this.text.length + 1;
    if (named) {
      this.requests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: named },
          fields: "namedStyleType",
        },
      });
    }
    if (bold) {
      this.requests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: end - 1 },
          textStyle: { bold: true },
          fields: "bold",
        },
      });
    }
  }

  title(t: string) { this.push(t + "\n", "TITLE"); }
  subtitle(t: string) { this.push(t + "\n", "SUBTITLE"); }
  h1(t: string) { this.push(t + "\n", "HEADING_1"); }
  h2(t: string) { this.push(t + "\n", "HEADING_2"); }
  para(t: string) { this.push(t + "\n", "NORMAL_TEXT"); }
  labelLine(label: string, value: string) {
    // "Etiqueta: valor" con la etiqueta en negrita.
    const start = this.text.length + 1;
    const labelText = `${label}: `;
    this.text += labelText + value + "\n";
    this.requests.push({
      updateTextStyle: {
        range: { startIndex: start, endIndex: start + labelText.length },
        textStyle: { bold: true },
        fields: "bold",
      },
    });
  }
  spacer() { this.push("\n", "NORMAL_TEXT"); }
}

async function oportunidades(answers: Record<string, unknown>, nombre: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const openai = new OpenAI({ apiKey });
    const resumen = [...VOZ, ...TEXTO]
      .map(([k, l]) => (answers[k] ? `${l}: ${String(answers[k])}` : null))
      .filter(Boolean)
      .join("\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "Eres consultor de Propy AI (agentes de IA para inmobiliarias). A partir de la info del cliente, redacta de 4 a 6 OPORTUNIDADES DE MEJORA concretas y accionables para su implementación de IA. Cada una en una línea que empiece con '• '. Español profesional, directo, sin relleno.",
        },
        { role: "user", content: `Cliente: ${nombre}\n\n${resumen}` },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { nombre, apellido, empresa, correo, telefono, answers } = await req.json();
  const fullName = `${nombre || ""} ${apellido || ""}`.trim() || "Cliente";
  const label = [empresa, fullName].filter(Boolean).join(" – ");
  const auth = getGoogleAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "Google no configurado. Falta GOOGLE_SERVICE_ACCOUNT_JSON." },
      { status: 503 }
    );
  }

  const ans = (answers ?? {}) as Record<string, unknown>;

  try {
    const docs = google.docs({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });
    const { folderId, folderUrl } = await getOrCreateClientFolder(auth, label, correo);

    // Crear el Doc directo en la carpeta del cliente (no en la raíz del SA).
    const created = await drive.files.create({
      requestBody: {
        name: `Onboarding – ${label}`,
        mimeType: "application/vnd.google-apps.document",
        parents: [folderId],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    const documentId = created.data.id!;

    // Análisis de oportunidades (IA).
    const oportunidadesTxt = await oportunidades(ans, nombre || "el cliente");

    // Construir el documento con formato.
    const b = new DocBuilder();
    b.title("Propy AI · Planificación de Onboarding");
    b.subtitle(empresa ? `${empresa} — ${fullName}` : fullName);
    b.spacer();

    b.h1("Datos del cliente");
    b.labelLine("Empresa", empresa || "—");
    b.labelLine("Nombre", fullName);
    b.labelLine("Correo", correo || "—");
    b.labelLine("Teléfono", telefono || "—");
    b.labelLine("Carpeta de archivos", folderUrl);
    b.spacer();

    const hasVoz = VOZ.some(([k]) => ans[k]);
    if (hasVoz) {
      b.h1("Conversación con Camila (voz)");
      for (const [k, label] of VOZ) {
        if (!ans[k]) continue;
        b.h2(label);
        b.para(String(ans[k]));
      }
      b.spacer();
    }

    const hasTexto = TEXTO.some(([k]) => ans[k]);
    if (hasTexto) {
      b.h1("Datos exactos (cuestionario)");
      for (const [k, label] of TEXTO) {
        if (!ans[k]) continue;
        b.h2(label);
        b.para(String(ans[k]));
      }
      b.spacer();
    }

    if (oportunidadesTxt) {
      b.h1("Oportunidades de mejora");
      for (const line of oportunidadesTxt.split("\n")) {
        if (line.trim()) b.para(line.trim());
      }
      b.spacer();
    }

    if (!hasVoz && !hasTexto) {
      b.para("(Sin datos recolectados todavía.)");
    }

    // Insertar todo el texto y luego aplicar los estilos por rango.
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          { insertText: { location: { index: 1 }, text: b.text } },
          ...b.requests,
        ],
      },
    });

    // Compartir el Doc como editor con el cliente (con notificación) + internos.
    await shareAsEditor(drive, documentId, [correo].filter(Boolean) as string[], true);
    await shareAsEditor(drive, documentId, EXTRA_EDITORS, true);

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Notificación a Slack (no bloqueante).
    const slack = process.env.SLACK_WEBHOOK_URL;
    if (slack) {
      try {
        const quien = empresa ? `*${fullName}* de *${empresa}*` : `*${fullName}*`;
        await fetch(slack, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🎉 ${quien} completó el onboarding.\n📄 Documento: ${docUrl}\n📁 Carpeta de Drive: ${folderUrl}`,
          }),
        });
      } catch {
        /* no frenamos el flujo si Slack falla */
      }
    }

    return NextResponse.json({ doc_url: docUrl, folder_url: folderUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error generando el documento";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
