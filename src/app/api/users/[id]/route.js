import { NextResponse } from "next/server";
import { deleteUser } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
