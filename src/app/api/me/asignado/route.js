import { NextResponse } from "next/server";
import { getReceptorProfile } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const data = await getReceptorProfile(session.sub);
  if (!data) {
    return NextResponse.json({ asignado: null, viewed_at: null });
  }
  return NextResponse.json({ asignado: data.receptor, viewed_at: data.viewed_at });
}
