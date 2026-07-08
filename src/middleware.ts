import { NextRequest, NextResponse } from "next/server";

// Protege toda la app con un código de acceso (ACCESS_CODE).
// Si no hay ACCESS_CODE configurado, no bloquea nada (útil en local).
export function middleware(req: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) return NextResponse.next();

  const cookie = req.cookies.get("propy_access")?.value;
  if (cookie === code) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/acceso";
  return NextResponse.redirect(url);
}

// Aplica a todo, excepto: estáticos, el ícono, la página /acceso y su API.
export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|apple-icon|acceso|api/access).*)"],
};
