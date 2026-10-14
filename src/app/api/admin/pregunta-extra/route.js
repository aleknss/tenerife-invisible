import { NextResponse } from "next/server";
import { addPreguntaExtra } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { usuario_id } = body ?? {};
  if (!usuario_id) {
    return NextResponse.json({ error: "usuario_id requerido" }, { status: 400 });
  }

  const preguntas_extra = await addPreguntaExtra(usuario_id);
  return NextResponse.json({ ok: true, preguntas_extra });
}
