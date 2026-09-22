import { NextResponse } from "next/server";
import {
  listParticipants,
  listVetos,
  getPrevios,
  applySorteo,
  getConfig,
  updateConfig,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sortear } from "@/lib/sorteo";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const config = await getConfig();
  if (!config || (config.estado !== "abierto" && config.estado !== "sorteado")) {
    return NextResponse.json({ error: "No se puede sortear en el estado actual" }, { status: 409 });
  }

  const participants = await listParticipants();
  if (participants.length < 2) {
    return NextResponse.json({ error: "Se necesitan al menos 2 participantes" }, { status: 400 });
  }

  const ids = participants.map((p) => p.id);
  const vetos = await listVetos();
  const anio = new Date().getFullYear();
  const previos = await getPrevios(anio - 1);

  const result = sortear(ids, { vetos, previos });
  if (!result.ok) {
    const nombre =
      participants.find((p) => p.id === result.bloqueado)?.nombre ?? result.bloqueado;
    return NextResponse.json({ error: result.reason, bloqueado: nombre }, { status: 400 });
  }

  await applySorteo(result.asignacion, anio);
  await updateConfig({ estado: "sorteado" });

  return NextResponse.json({ ok: true });
}
