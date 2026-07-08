import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "node:stream";
import { getGoogleAuth, getOrCreateClientFolder } from "@/lib/google";

// POST /api/upload — sube archivos a la carpeta de Drive del cliente.
// FormData: nombre, correo, files[]
export async function POST(req: NextRequest) {
  const auth = getGoogleAuth();
  if (!auth) {
    return NextResponse.json({ error: "Google no configurado." }, { status: 503 });
  }

  const form = await req.formData();
  const nombre = String(form.get("nombre") || "Cliente");
  const correo = form.get("correo") ? String(form.get("correo")) : undefined;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Sin archivos" }, { status: 400 });
  }

  try {
    const { folderId, folderUrl } = await getOrCreateClientFolder(auth, nombre, correo);
    const drive = google.drive({ version: "v3", auth });

    const uploaded: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await drive.files.create({
        requestBody: { name: file.name, parents: [folderId] },
        media: {
          mimeType: file.type || "application/octet-stream",
          body: Readable.from(buffer),
        },
        fields: "id",
      });
      uploaded.push(file.name);
    }

    return NextResponse.json({ uploaded, folder_url: folderUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error subiendo archivos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
