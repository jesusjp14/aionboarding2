import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST /api/session — crea la sesión desde el optin. Devuelve { session_id }.
export async function POST(req: NextRequest) {
  const { nombre, correo, telefono } = await req.json();

  if (!nombre || !correo) {
    return NextResponse.json({ error: "nombre y correo son requeridos" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Sin credenciales aún: sesión temporal en memoria para poder probar en local.
  if (!db) {
    return NextResponse.json({
      session_id: `local-${Date.now()}`,
      mocked: true,
    });
  }

  const { data, error } = await db
    .from("sessions")
    .insert({ nombre, correo, telefono, current_step: 1 })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session_id: data.id });
}
