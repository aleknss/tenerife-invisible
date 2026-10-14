import { NextResponse } from "next/server";
import { listParticipants, listVetos, countPreguntas } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [participants, vetos, preguntas] = await Promise.all([
    listParticipants(),
    listVetos(),
    countPreguntas(),
  ]);

  const total = participants.length;

  return NextResponse.json({
    total,
    exclusiones: vetos.length,
    vistos: participants.filter((p) => p.viewed_at).length,
    asignados: participants.filter((p) => p.asignado_id).length,
    preguntas,
  });
}
