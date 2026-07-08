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

// Correos internos que SIEMPRE reciben acceso de editor (además del cliente).
// Configurable con TEAM_EMAILS (separados por coma).
export const EXTRA_EDITORS = (process.env.TEAM_EMAILS || "alandavid1999200@gmail.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Comparte un archivo/carpeta como editor con varios correos (ignora errores
// individuales para no frenar el flujo).
export async function shareAsEditor(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  emails: string[],
  notify = false
) {
  for (const email of emails) {
    if (!email) continue;
    try {
      await drive.permissions.create({
        fileId,
        sendNotificationEmail: notify,
        requestBody: { type: "user", role: "writer", emailAddress: email },
        supportsAllDrives: true,
      });
    } catch {
      /* continúa con los demás */
    }
  }
}

// Busca (o crea) la carpeta de Drive del cliente y la comparte como editor.
// Devuelve { folderId, folderUrl }.
export async function getOrCreateClientFolder(
  auth: NonNullable<ReturnType<typeof getGoogleAuth>>,
  label: string,
  correo?: string
) {
  const drive = google.drive({ version: "v3", auth });
  const folderName = `Onboarding – ${label || "Cliente"}`;
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
    // Compartir la carpeta con el cliente + los correos internos.
    await shareAsEditor(drive, folderId, [correo, ...EXTRA_EDITORS].filter(Boolean) as string[]);
  }

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  };
}
