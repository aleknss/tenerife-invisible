import { NextResponse } from "next/server";
import { listParticipants } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const participants = await listParticipants();
  return NextResponse.json(participants.map((p) => ({ id: p.id, nombre: p.nombre })));
}
