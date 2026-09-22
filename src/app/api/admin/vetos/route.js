import { NextResponse } from "next/server";
import { listVetos, addVeto, removeVeto } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json(await listVetos());
}

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

  const { a_id, b_id } = body ?? {};
  if (!a_id || !b_id || a_id === b_id) {
    return NextResponse.json({ error: "a_id y b_id distintos requeridos" }, { status: 400 });
  }

  await addVeto(a_id, b_id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
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

  const { a_id, b_id } = body ?? {};
  if (!a_id || !b_id) {
    return NextResponse.json({ error: "a_id y b_id requeridos" }, { status: 400 });
  }

  await removeVeto(a_id, b_id);
  return NextResponse.json({ ok: true });
}
