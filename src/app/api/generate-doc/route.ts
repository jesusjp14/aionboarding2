import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// POST /api/generate-doc — crea un Google Doc desde cero con la info del cliente
// (voz + chat), lo comparte como editor a su correo y devuelve el link.
// Body: { nombre, correo, answers }

// Etiquetas legibles para cada dato recolectado.
const LABELS: Record<string, string> = {
  proceso_comercial: "Proceso comercial",
  objetivo: "Objetivo con la IA",
  marketing: "Estrategia de marketing",
  num_asesores: "Número de asesores",
  estructura_numeros: "Estructura de números",
  crm_nombre: "CRM que usa",
  num_proyectos: "Proyectos en esta fase",
  intro_ia: "Introducción de la IA",
  preguntas_filtro: "Preguntas de filtro",
  estilo: "Estilo de la IA",
  cta: "Llamado a la acción (CTA)",
  crm_api: "Documentación API del CRM",
  faqs: "Preguntas frecuentes",
  objeciones: "Objeciones",
  info_negocio: "Información del negocio",
  info_proyectos: "Información de proyectos",
  datos_obligatorios: "Datos obligatorios",
  casos_especificos: "Casos específicos",
};

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

export async function POST(req: NextRequest) {
  const { nombre, correo, answers } = await req.json();
  const auth = getAuth();

  if (!auth) {
    return NextResponse.json(
      { error: "Google no configurado. Falta GOOGLE_SERVICE_ACCOUNT_JSON." },
      { status: 503 }
    );
  }

  try {
    const docs = google.docs({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });

    // 1. Crear el documento con título.
    const created = await docs.documents.create({
      requestBody: { title: `Onboarding – ${nombre || "Cliente"}` },
    });
    const documentId = created.data.documentId!;

    // 2. Construir el cuerpo: encabezado + cada dato.
    const header = `Propy AI · Planificación – ${nombre || "Cliente"}\n\n`;
    let body = "";
    const ans = (answers ?? {}) as Record<string, unknown>;
    for (const [key, label] of Object.entries(LABELS)) {
      const val = ans[key];
      if (val === undefined || val === null || val === "") continue;
      body += `${label}:\n${String(val)}\n\n`;
    }
    if (!body) body = "(Sin datos recolectados todavía.)\n";

    // 3. Insertar el texto (se inserta en orden inverso al índice 1).
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          { insertText: { location: { index: 1 }, text: header + body } },
          {
            updateParagraphStyle: {
              range: { startIndex: 1, endIndex: header.length },
              paragraphStyle: { namedStyleType: "HEADING_1" },
              fields: "namedStyleType",
            },
          },
        ],
      },
    });

    // 4. Compartir como editor con el cliente.
    if (correo) {
      await drive.permissions.create({
        fileId: documentId,
        sendNotificationEmail: true,
        requestBody: { type: "user", role: "writer", emailAddress: correo },
      });
    }

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    return NextResponse.json({ doc_url: docUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error generando el documento";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
