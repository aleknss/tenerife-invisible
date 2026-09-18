import { NextResponse } from "next/server";
import { applyAssignments, listUsers } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const rows = body?.assignments;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "assignments requerido" }, { status: 400 });
  }

  // Validar que todos los user_id existen.
  const users = await listUsers(true);
  const ids = new Set(users.map((u) => u.id));
  for (const row of rows) {
    if (!row.user_id || !row.ciphertext) {
      return NextResponse.json(
        { error: "Formato de assignment inválido" },
        { status: 400 },
      );
    }
    if (!ids.has(row.user_id)) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }
  }

  await applyAssignments(rows);
  return NextResponse.json({ ok: true });
}
