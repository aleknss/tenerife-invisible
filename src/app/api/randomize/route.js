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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rows = body?.assignments;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "assignments requerido" }, { status: 400 });
  }

  // Validar formato, existencia, unicidad y cobertura total.
  const users = await listUsers(true);
  const usersById = new Map(users.map((u) => [u.id, u]));
  const seen = new Set();

  for (const row of rows) {
    if (!row.user_id || !row.ciphertext) {
      return NextResponse.json(
        { error: "Formato de assignment inválido" },
        { status: 400 },
      );
    }
    if (!usersById.has(row.user_id)) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }
    if (seen.has(row.user_id)) {
      return NextResponse.json({ error: "user_id duplicado" }, { status: 400 });
    }
    seen.add(row.user_id);
  }

  if (seen.size !== users.length) {
    return NextResponse.json(
      { error: "Faltan usuarios en el sorteo" },
      { status: 400 },
    );
  }

  const sinClave = users.find((u) => !u.public_key);
  if (sinClave) {
    return NextResponse.json(
      { error: `El usuario ${sinClave.nombre} aún no tiene clave` },
      { status: 400 },
    );
  }

  await applyAssignments(rows);
  return NextResponse.json({ ok: true });
}
