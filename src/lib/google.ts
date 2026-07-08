import { google } from "googleapis";

export function getGoogleAuth() {
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

// Busca (o crea) la carpeta de Drive del cliente y la comparte como editor.
// Devuelve { folderId, folderUrl }.
export async function getOrCreateClientFolder(
  auth: NonNullable<ReturnType<typeof getGoogleAuth>>,
  nombre: string,
  correo?: string
) {
  const drive = google.drive({ version: "v3", auth });
  const folderName = `Onboarding – ${nombre || "Cliente"}`;

  // Buscar si ya existe (no en papelera).
  const q = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const found = await drive.files.list({ q, fields: "files(id)", pageSize: 1 });

  let folderId = found.data.files?.[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = created.data.id!;
    if (correo) {
      await drive.permissions.create({
        fileId: folderId,
        sendNotificationEmail: false,
        requestBody: { type: "user", role: "writer", emailAddress: correo },
      });
    }
  }

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  };
}
