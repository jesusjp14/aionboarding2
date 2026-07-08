import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST /api/submit-text — recibe la Fase 2, hace merge en answers.
// (La generación del Doc se dispara desde /api/generate-doc, pieza 6.)
export async function POST(req: NextRequest) {
  const { session_id, answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers requerido" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db || String(session_id).startsWith("local-")) {
    return NextResponse.json({ ok: true, mocked: true });
  }

  const { data: session } = await db
    .from("sessions")
    .select("answers")
    .eq("id", session_id)
    .maybeSingle();

  const merged = { ...((session?.answers as object) ?? {}), ...answers };
  const { error } = await db
    .from("sessions")
    .update({ answers: merged })
    .eq("id", session_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
