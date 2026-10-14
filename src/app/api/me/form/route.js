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
  if (config?.estado === "cerrado") {
    return NextResponse.json({ error: "El evento ya no está abierto" }, { status: 409 });
  }

  const fields = {};

  if ("hobbies" in body) {
    const h = body.hobbies;
    const esLista = Array.isArray(h) && h.every((x) => typeof x === "string");
    if (h !== null && typeof h !== "string" && !esLista) {
      return NextResponse.json(
        { error: "Los hobbies deben ser un texto o una lista de textos" },
        { status: 400 }
      );
    }
    fields.hobbies = h;
  }

  if ("tallas" in body) {
    const t = body.tallas;
    if (t !== null && (typeof t !== "object" || Array.isArray(t))) {
      return NextResponse.json(
        { error: "Las tallas deben ser un objeto (campo: talla)" },
        { status: 400 }
      );
    }
    fields.tallas = t;
  }

  if ("palabra_vetada" in body) {
    if (body.palabra_vetada !== null && typeof body.palabra_vetada !== "string") {
      return NextResponse.json(
        { error: "La palabra vetada debe ser un texto" },
        { status: 400 }
      );
    }
    fields.palabra_vetada = body.palabra_vetada;
  }

  await setParticipantForm(session.sub, fields);
  return NextResponse.json({ ok: true });
}
