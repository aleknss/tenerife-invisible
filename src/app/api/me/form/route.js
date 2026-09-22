import { NextResponse } from "next/server";
import { getConfig, setParticipantForm } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req) {
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

  const config = await getConfig();
  if (config?.estado !== "abierto") {
    return NextResponse.json({ error: "El evento ya no está abierto" }, { status: 409 });
  }

  const fields = {};

  if ("hobbies" in body) {
    if (body.hobbies !== null && typeof body.hobbies !== "string") {
      return NextResponse.json({ error: "hobbies inválido" }, { status: 400 });
    }
    fields.hobbies = body.hobbies;
  }

  if ("tallas" in body) {
    const t = body.tallas;
    if (t !== null && (typeof t !== "object" || Array.isArray(t))) {
      return NextResponse.json({ error: "tallas inválido" }, { status: 400 });
    }
    fields.tallas = t;
  }

  if ("palabra_vetada" in body) {
    if (body.palabra_vetada !== null && typeof body.palabra_vetada !== "string") {
      return NextResponse.json({ error: "palabra_vetada inválida" }, { status: 400 });
    }
    fields.palabra_vetada = body.palabra_vetada;
  }

  await setParticipantForm(session.sub, fields);
  return NextResponse.json({ ok: true });
}
