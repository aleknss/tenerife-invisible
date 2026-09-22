import { NextResponse } from "next/server";
import { responderPregunta } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { pregunta_id, respuesta } = body ?? {};
  if (!pregunta_id || !respuesta || !respuesta.trim()) {
    return NextResponse.json({ error: "pregunta_id y respuesta requeridos" }, { status: 400 });
  }

  const updated = await responderPregunta(pregunta_id, session.sub, respuesta.trim());
  if (!updated) {
    return NextResponse.json(
      { error: "Pregunta no encontrada o no te corresponde" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
