import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST /api/retell/webhook — recibe eventos de Retell.
// En 'call_analyzed' extrae custom_analysis_data (la voz) y la fusiona en answers.
export async function POST(req: NextRequest) {
  const payload = await req.json();
  const event = payload?.event;
  const call = payload?.call ?? payload?.data ?? {};
  const callId: string | undefined = call?.call_id;

  if (!callId) return NextResponse.json({ ok: true, skipped: "sin call_id" });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, mocked: true });

  const { data: session } = await db
    .from("sessions")
    .select("id, answers")
    .eq("retell_call_id", callId)
    .maybeSingle();

  if (!session) return NextResponse.json({ ok: true, skipped: "sesión no encontrada" });

  if (event === "call_analyzed") {
    const voz = call?.call_analysis?.custom_analysis_data ?? {};
    const merged = { ...(session.answers as object), ...voz };
    await db
      .from("sessions")
      .update({ answers: merged, estado: "voz_completa" })
      .eq("id", session.id);
    return NextResponse.json({ ok: true, merged_keys: Object.keys(voz) });
  }

  // Red de seguridad: llamada terminada sin análisis útil.
  if (event === "call_ended") {
    // No marcamos incompleto aquí para no pisar un call_analyzed posterior.
    return NextResponse.json({ ok: true, event });
  }

  return NextResponse.json({ ok: true, event });
}
