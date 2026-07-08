import { NextRequest, NextResponse } from "next/server";

// POST /api/access — valida el código y setea cookie httpOnly si es correcto.
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const expected = process.env.ACCESS_CODE;

  // Sin código configurado: acceso libre.
  if (!expected) return NextResponse.json({ ok: true });

  if (String(code) === expected) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("propy_access", expected, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
    return res;
  }

  return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
}
