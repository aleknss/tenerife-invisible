import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const isAdmin = session.role === "admin";
  const users = await listUsers(isAdmin);
  return NextResponse.json(users);
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

  const nombre = (body?.nombre ?? "").trim();
  const password = body?.password ?? "";
  const role = body?.role ?? "user";

  if (!nombre || !password) {
    return NextResponse.json(
      { error: "Nombre y contraseña requeridos" },
      { status: 400 },
    );
  }

  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "role inválido" }, { status: 400 });
  }

  const hash = await hashPassword(password);

  try {
    const user = await createUser(nombre, hash, role);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Nombre ya existe" }, { status: 409 });
    }
    throw err;
  }
}
