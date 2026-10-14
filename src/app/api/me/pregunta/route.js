import { NextResponse } from "next/server";
import {
  getConfig,
  getUserState,
  getPreguntasEnviadas,
  getPreguntasRecibidas,
  createPregunta,
  countPreguntasEnviadas,
  listUsers,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

const TEMAS = [
  "la música", "el cine", "la lectura", "los viajes", "la cocina",
  "el deporte", "la naturaleza", "los videojuegos", "el arte",
  "la fotografía", "la tecnología", "la historia", "los animales",
  "las manualidades", "la jardinería", "el senderismo",
];

const PLANTILLAS = [
  { id: "t01", tipo: "tema", texto: "¿Qué te engancha de ___?" },
  { id: "t02", tipo: "tema", texto: "¿Desde cuándo te interesa ___?" },
  { id: "t03", tipo: "tema", texto: "¿Con qué frecuencia dedicas tiempo a ___?" },
  { id: "t04", tipo: "tema", texto: "¿Qué es lo que más te gusta de ___?" },
  { id: "t05", tipo: "tema", texto: "¿Por qué empezaste con ___?" },
  { id: "t06", tipo: "tema", texto: "¿Qué me recomiendas sobre ___?" },
  { id: "t07", tipo: "tema", texto: "¿Prefieres ___ o algo más tranquilo?" },
  { id: "t08", tipo: "tema", texto: "¿Qué te falta para disfrutar más de ___?" },
  { id: "t09", tipo: "tema", texto: "¿Qué pequeño capricho de ___ te darías?" },
  { id: "t10", tipo: "tema", texto: "¿Qué has querido probar de ___ y aún no?" },
  { id: "t11", tipo: "tema", texto: "¿Qué te frena para empezar con ___?" },
  { id: "t12", tipo: "tema", texto: "¿Qué te haría ilusión de ___?" },
  { id: "t13", tipo: "tema", texto: "¿Qué te ha marcado de ___?" },
  { id: "t14", tipo: "tema", texto: "¿Qué te gustaría aprender de ___?" },
  { id: "t15", tipo: "tema", texto: "¿Qué plan relacionado con ___ te apetece?" },
  { id: "o01", tipo: "objeto", texto: "¿Cuál es tu ___ favorito?" },
  { id: "o02", tipo: "objeto", texto: "¿Qué buscas cuando eliges ___?" },
  { id: "o03", tipo: "objeto", texto: "¿Tienes ya ___ o te haría falta?" },
  { id: "o04", tipo: "objeto", texto: "¿Qué ___ recomendarías a cualquiera?" },
];

function hash(texto) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) % 2147483647;
  }
  return h;
}

function elegirPlantilla(userId, offset = 0) {
  const index = (hash(String(userId)) + offset) % PLANTILLAS.length;
  const plantilla = PLANTILLAS[index];
  return { ...plantilla, opciones: plantilla.tipo === "tema" ? TEMAS : null };
}

function componer(plantilla, valor) {
  return plantilla.texto
    .replace("___", valor)
    .replace(/\bde el\b/g, "del")
    .replace(/\ba el\b/g, "al");
}

function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [enviadas, recibidas] = await Promise.all([
    getPreguntasEnviadas(session.sub),
    getPreguntasRecibidas(session.sub),
  ]);
  const yo = await getUserState(session.sub);
  const extra = yo?.preguntas_extra ?? 0;
  const restantes = 1 + extra - enviadas.length;
  const plantilla = restantes > 0 ? elegirPlantilla(session.sub, enviadas.length) : null;
  return NextResponse.json({
    enviada: enviadas[0] ?? null,
    recibida: recibidas[0] ?? null,
    enviadas,
    recibidas,
    restantes,
    plantilla,
  });
}

export async function POST(req) {
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
  if (!config || config.estado === "abierto") {
    return NextResponse.json({ error: "Aún no se ha sorteado" }, { status: 409 });
  }

  const yo = await getUserState(session.sub);
  if (!yo?.asignado_id) {
    return NextResponse.json({ error: "No tienes asignado" }, { status: 409 });
  }

  const enviadas = await countPreguntasEnviadas(session.sub);
  const extra = yo.preguntas_extra ?? 0;
  if (enviadas >= 1 + extra) {
    return NextResponse.json({ error: "Ya usaste tus preguntas" }, { status: 409 });
  }

  const valor = typeof body?.valor === "string" ? body.valor.trim() : "";
  if (!valor) {
    return NextResponse.json({ error: "valor requerido" }, { status: 400 });
  }

  const plantilla = elegirPlantilla(session.sub, enviadas);
  if (body?.plantilla_id && body.plantilla_id !== plantilla.id) {
    return NextResponse.json({ error: "Plantilla no válida" }, { status: 400 });
  }

  if (plantilla.tipo === "tema") {
    if (!TEMAS.includes(valor)) {
      return NextResponse.json({ error: "Opción no válida" }, { status: 400 });
    }
  } else {
    if (valor.length < 2 || valor.length > 40) {
      return NextResponse.json({ error: "Usa entre 2 y 40 caracteres" }, { status: 400 });
    }
    if (/\d/.test(valor)) {
      return NextResponse.json({ error: "No incluyas números" }, { status: 400 });
    }
    const participantes = await listUsers();
    const conNombre = participantes.some((p) =>
      new RegExp(`\\b${escapar(p.nombre)}\\b`, "i").test(valor),
    );
    if (conNombre) {
      return NextResponse.json({ error: "No incluyas nombres" }, { status: 400 });
    }
  }

  const texto = componer(plantilla, valor);
  await createPregunta(session.sub, yo.asignado_id, texto);
  return NextResponse.json({ ok: true });
}
