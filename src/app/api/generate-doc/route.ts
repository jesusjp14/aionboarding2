import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth, getOrCreateClientFolder } from "@/lib/google";

// POST /api/generate-doc — crea el Google Doc en la carpeta del cliente, lo comparte
// como editor y devuelve doc_url + folder_url (esa carpeta ya tiene los archivos subidos).
// Body: { nombre, correo, answers }

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

export async function POST(req: NextRequest) {
  const { nombre, correo, answers } = await req.json();
  const auth = getGoogleAuth();

  if (!auth) {
    return NextResponse.json(
      { error: "Google no configurado. Falta GOOGLE_SERVICE_ACCOUNT_JSON." },
      { status: 503 }
    );
  }

  try {
    const docs = google.docs({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });

    // Carpeta del cliente (con sus archivos subidos, si los hay).
    const { folderId, folderUrl } = await getOrCreateClientFolder(auth, nombre, correo);

    // 1. Crear el documento.
    const created = await docs.documents.create({
      requestBody: { title: `Onboarding – ${nombre || "Cliente"}` },
    });
    const documentId = created.data.documentId!;

    // 2. Cuerpo: encabezado + datos.
    const header = `Propy AI · Planificación – ${nombre || "Cliente"}\n\n`;
    let body = "";
    const ans = (answers ?? {}) as Record<string, unknown>;
    for (const [key, label] of Object.entries(LABELS)) {
      const val = ans[key];
      if (val === undefined || val === null || val === "") continue;
      body += `${label}:\n${String(val)}\n\n`;
    }
    if (!body) body = "(Sin datos recolectados todavía.)\n";

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

    // 3. Mover el Doc a la carpeta del cliente (quitando su parent original).
    const meta = await drive.files.get({
      fileId: documentId,
      fields: "parents",
      supportsAllDrives: true,
    });
    const prevParents = (meta.data.parents ?? []).join(",");
    await drive.files.update({
      fileId: documentId,
      addParents: folderId,
      removeParents: prevParents || undefined,
      fields: "id",
      supportsAllDrives: true,
    });

    // 4. Compartir el Doc como editor con el cliente.
    if (correo) {
      await drive.permissions.create({
        fileId: documentId,
        sendNotificationEmail: true,
        requestBody: { type: "user", role: "writer", emailAddress: correo },
        supportsAllDrives: true,
      });
    }

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    return NextResponse.json({ doc_url: docUrl, folder_url: folderUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error generando el documento";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
