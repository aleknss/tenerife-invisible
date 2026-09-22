import { NextResponse } from "next/server";
import {
  getConfig,
  getUserState,
  getPreguntaEnviada,
  getPreguntaRecibida,
  createPregunta,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [enviada, recibida] = await Promise.all([
    getPreguntaEnviada(session.sub),
    getPreguntaRecibida(session.sub),
  ]);
  return NextResponse.json({ enviada, recibida });
}

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

  const texto = (body?.texto ?? "").trim();
  if (!texto) {
    return NextResponse.json({ error: "texto requerido" }, { status: 400 });
  }

  const config = await getConfig();
  if (!config || config.estado === "abierto") {
    return NextResponse.json({ error: "Aún no se ha sorteado" }, { status: 409 });
  }

  const yo = await getUserState(session.sub);
  if (!yo?.asignado_id) {
    return NextResponse.json({ error: "No tienes asignado" }, { status: 409 });
  }

  const existente = await getPreguntaEnviada(session.sub);
  if (existente) {
    return NextResponse.json({ error: "Ya enviaste tu pregunta" }, { status: 409 });
  }

  await createPregunta(session.sub, yo.asignado_id, texto);
  return NextResponse.json({ ok: true });
}
