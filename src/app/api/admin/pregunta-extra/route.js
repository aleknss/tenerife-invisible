import { NextResponse } from "next/server";
import { addPreguntaExtra, getUserById, getUserState } from "@/lib/db";
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

  const { usuario_id, destino = "persona" } = body ?? {};
  if (!usuario_id) {
    return NextResponse.json({ error: "usuario_id requerido" }, { status: 400 });
  }
  if (destino !== "persona" && destino !== "amigo") {
    return NextResponse.json({ error: "destino no válido" }, { status: 400 });
  }

  let objetivoId = usuario_id;
  if (destino === "amigo") {
    const estado = await getUserState(usuario_id);
    if (!estado?.asignado_id) {
      return NextResponse.json(
        { error: "Ese participante no tiene chacho invisible asignado" },
        { status: 409 },
      );
    }
    objetivoId = estado.asignado_id;
  }

  const preguntas_extra = await addPreguntaExtra(objetivoId);
  const objetivo = await getUserById(objetivoId);
  return NextResponse.json({
    ok: true,
    preguntas_extra,
    destino,
    nombre: objetivo?.nombre ?? null,
  });
}
