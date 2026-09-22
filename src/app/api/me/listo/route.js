import { NextResponse } from "next/server";
import { getConfig, setListo } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const config = await getConfig();
  if (config?.estado !== "abierto") {
    return NextResponse.json({ error: "El evento no está abierto" }, { status: 409 });
  }

  await setListo(session.sub);
  return NextResponse.json({ ok: true });
}
