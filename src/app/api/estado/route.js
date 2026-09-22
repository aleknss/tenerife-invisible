import { NextResponse } from "next/server";
import { getConfig, listParticipants, getUserState } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const config = await getConfig();
  const participants = await listParticipants();
  const total = participants.length;
  const listos = participants.filter((p) => p.estado === "listo").length;
  const yo = await getUserState(session.sub);

  return NextResponse.json({
    estado: config?.estado ?? "abierto",
    umbral_listos: config?.umbral_listos ?? null,
    total,
    listos,
    listo_yo: yo?.estado === "listo",
    tengo_asignado: Boolean(yo?.asignado_id),
  });
}
