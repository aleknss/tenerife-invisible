import { NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/db";
import { getSession } from "@/lib/auth";

const FIELDS = [
  "nombre",
  "precio",
  "moneda",
  "fecha_entrega",
  "tematica",
  "metodo_entrega",
  "invisible_real",
  "reglas",
  "umbral_listos",
];

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json(config ?? {});
}

export async function PATCH(req) {
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

  const fields = {};
  for (const k of FIELDS) {
    if (k in body) fields[k] = body[k];
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json(await getConfig());
  }

  const config = await updateConfig(fields);
  return NextResponse.json(config);
}
