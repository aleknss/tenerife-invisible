import { NextResponse } from "next/server";
import { deleteUser, updateUser, adminSetPassword } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

export async function PATCH(req, { params }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { nombre, password } = body ?? {};

  if (nombre !== undefined) {
    const limpio = String(nombre).trim();
    if (!limpio) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    try {
      await updateUser(id, { nombre: limpio });
    } catch (err) {
      if (err?.code === "23505") {
        return NextResponse.json({ error: "Ese nombre ya existe" }, { status: 409 });
      }
      throw err;
    }
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    await adminSetPassword(id, await hashPassword(password));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }
  if (id === session.sub) {
    return NextResponse.json({ error: "No puedes borrarte a ti mismo" }, { status: 400 });
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
