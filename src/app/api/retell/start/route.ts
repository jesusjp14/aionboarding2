import { NextRequest, NextResponse } from "next/server";

// POST /api/retell/start — crea una web call en Retell pasando el nombre como
// variable dinámica. Devuelve access_token y call_id al front (que guarda el
// call_id en estado de React para luego consultar el análisis).
export async function POST(req: NextRequest) {
  const { nombre } = await req.json();
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
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.message || "Error en Retell" }, { status: 502 });
  }

  return NextResponse.json({ access_token: data.access_token, call_id: data.call_id });
}
