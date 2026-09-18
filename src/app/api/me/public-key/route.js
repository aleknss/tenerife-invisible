import { NextResponse } from "next/server";
import { updatePublicKey } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const publicKey = body?.public_key;
  if (!publicKey) {
    return NextResponse.json({ error: "public_key requerida" }, { status: 400 });
  }

  await updatePublicKey(session.sub, publicKey);
  return NextResponse.json({ ok: true });
}
