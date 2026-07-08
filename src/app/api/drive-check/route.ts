import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/lib/google";

// GET /api/drive-check — diagnóstico: verifica acceso del service account a la
// carpeta GOOGLE_SHARED_DRIVE_ID. Temporal, para depurar permisos.
export async function GET() {
  const auth = getGoogleAuth();
  if (!auth) return NextResponse.json({ error: "Falta GOOGLE_SERVICE_ACCOUNT_JSON" }, { status: 503 });

  const parentId = process.env.GOOGLE_SHARED_DRIVE_ID || null;
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const result: Record<string, unknown> = {
    service_account_email: creds.client_email,
    GOOGLE_SHARED_DRIVE_ID: parentId,
  };

  const drive = google.drive({ version: "v3", auth });

  if (parentId) {
    try {
      const meta = await drive.files.get({
        fileId: parentId,
        fields: "id,name,mimeType,driveId,capabilities(canAddChildren)",
        supportsAllDrives: true,
      });
      result.folder = meta.data;
    } catch (e) {
      result.folder_error = e instanceof Error ? e.message : String(e);
    }

    try {
      const test = await drive.files.create({
        requestBody: {
          name: "prueba-permisos (borrar)",
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
        supportsAllDrives: true,
      });
      result.can_create = true;
      // Limpiar la carpeta de prueba.
      await drive.files.delete({ fileId: test.data.id!, supportsAllDrives: true });
      result.cleanup = "ok";
    } catch (e) {
      result.can_create = false;
      result.create_error = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(result);
}
