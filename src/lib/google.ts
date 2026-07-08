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

// Carpeta padre donde viven todas las carpetas de cliente. Puede ser una
// Unidad compartida (recomendado, sin límite de cuota) o una carpeta normal
// compartida con el service account. Si no se define, cae al Drive del SA.
const PARENT_FOLDER_ID = () => process.env.GOOGLE_SHARED_DRIVE_ID || null;

export const driveOpts = { supportsAllDrives: true } as const;

// Busca (o crea) la carpeta de Drive del cliente y la comparte como editor.
// Devuelve { folderId, folderUrl }.
export async function getOrCreateClientFolder(
  auth: NonNullable<ReturnType<typeof getGoogleAuth>>,
  nombre: string,
  correo?: string
) {
  const drive = google.drive({ version: "v3", auth });
  const folderName = `Onboarding – ${nombre || "Cliente"}`;
  const parent = PARENT_FOLDER_ID();

  // Buscar si ya existe (no en papelera), dentro del padre si lo hay.
  const parts = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ];
  if (parent) parts.push(`'${parent}' in parents`);
  const found = await drive.files.list({
    q: parts.join(" and "),
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  let folderId = found.data.files?.[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        ...(parent ? { parents: [parent] } : {}),
      },
      fields: "id",
      supportsAllDrives: true,
    });
    folderId = created.data.id!;
    if (correo) {
      await drive.permissions.create({
        fileId: folderId,
        sendNotificationEmail: false,
        requestBody: { type: "user", role: "writer", emailAddress: correo },
        supportsAllDrives: true,
      });
    }
  }

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  };
}
