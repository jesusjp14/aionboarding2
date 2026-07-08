import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST /api/retell/start — crea una web call en Retell pasando el nombre como
// variable dinámica, guarda retell_call_id y devuelve el access_token al front.
export async function POST(req: NextRequest) {
  const { session_id, nombre } = await req.json();
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "Retell no configurado. Falta RETELL_API_KEY o RETELL_AGENT_ID." },
      { status: 503 }
    );
  }

  const res = await fetch("https://api.retellai.com/v2/create-web-call", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: agentId,
      retell_llm_dynamic_variables: { nombre: nombre || "" },
      metadata: { session_id },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.message || "Error en Retell" }, { status: 502 });
  }

  // Vincular call_id a la sesión para el webhook.
  const db = getSupabaseAdmin();
  if (db && session_id && !String(session_id).startsWith("local-")) {
    await db.from("sessions").update({ retell_call_id: data.call_id }).eq("id", session_id);
  }

  return NextResponse.json({ access_token: data.access_token, call_id: data.call_id });
}
