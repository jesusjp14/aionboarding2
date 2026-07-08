import { NextRequest, NextResponse } from "next/server";

// GET /api/retell/call?call_id=... — consulta el estado y análisis de la llamada.
// El front hace polling aquí tras colgar hasta que custom_analysis_data esté listo.
// (Proxy servidor porque la API de Retell requiere la key secreta.)
export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("call_id");
  const apiKey = process.env.RETELL_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Falta RETELL_API_KEY" }, { status: 503 });
  }
  if (!callId) {
    return NextResponse.json({ error: "Falta call_id" }, { status: 400 });
  }

  const res = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.message || "Error en Retell" }, { status: 502 });
  }

  const analysis = data?.call_analysis?.custom_analysis_data ?? null;
  return NextResponse.json({
    status: data?.call_status, // registered | ongoing | ended | error
    analyzed: Boolean(analysis),
    answers: analysis,
  });
}
