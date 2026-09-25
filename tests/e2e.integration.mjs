import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const ADMIN_NOMBRE = process.env.E2E_ADMIN_NOMBRE;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const configured = Boolean(
  ADMIN_NOMBRE &&
    ADMIN_PASSWORD &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const skip = configured ? false : "faltan E2E_ADMIN_NOMBRE/PASSWORD o SUPABASE_*";

const prefix = `e2e_${Date.now()}_`;
const created = [];

const supabase = configured
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function api(path, { method = "GET", body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

async function login(nombre, password) {
  const { res } = await api("/api/login", {
    method: "POST",
    body: { nombre, password },
  });
  if (res.status !== 200) {
    throw new Error(`login ${nombre} → ${res.status}`);
  }
  const raw = res.headers.getSetCookie().find((c) => c.startsWith("session="));
  return raw.split(";")[0];
}

after(async () => {
  if (!configured) return;
  if (created.length > 0) {
    await supabase.from("usuario").delete().in("nombre", created);
  }
  await supabase.from("login_attempt").delete().like("nombre", `${prefix}%`);
});

test("login: ok, password mala, nombre inexistente", { skip }, async () => {
  const { res: ok } = await api("/api/login", {
    method: "POST",
    body: { nombre: ADMIN_NOMBRE, password: ADMIN_PASSWORD },
  });
  assert.equal(ok.status, 200);

  const { res: badPass } = await api("/api/login", {
    method: "POST",
    body: { nombre: ADMIN_NOMBRE, password: "definitivamente-mala" },
  });
  assert.equal(badPass.status, 401);

  const { res: badUser } = await api("/api/login", {
    method: "POST",
    body: { nombre: `${prefix}noexiste`, password: "x" },
  });
  assert.equal(badUser.status, 401);
});

test("rate limit: 5 fallos 401, el 6º 429", { skip }, async () => {
  const nombre = `${prefix}ratelimit`;
  for (let i = 0; i < 5; i++) {
    const { res } = await api("/api/login", {
      method: "POST",
      body: { nombre, password: "mala" },
    });
    assert.equal(res.status, 401, `intento ${i + 1}`);
  }
  const { res } = await api("/api/login", {
    method: "POST",
    body: { nombre, password: "mala" },
  });
  assert.equal(res.status, 429);
});

test("me: sin cookie 401, con cookie 200", { skip }, async () => {
  const { res: anon } = await api("/api/me");
  assert.equal(anon.status, 401);

  const cookie = await login(ADMIN_NOMBRE, ADMIN_PASSWORD);
  const { res: me } = await api("/api/me", { cookie });
  assert.equal(me.status, 200);
});

test("cambio de contraseña: revoca la cookie vieja y acepta la nueva", { skip }, async () => {
  const nombre = `${prefix}pwd`;
  created.push(nombre);
  const adminCookie = await login(ADMIN_NOMBRE, ADMIN_PASSWORD);
  const { res: create } = await api("/api/users", {
    method: "POST",
    cookie: adminCookie,
    body: { nombre, password: "old-pass-123" },
  });
  assert.equal(create.status, 201);

  const oldCookie = await login(nombre, "old-pass-123");

  // contraseña actual incorrecta → 401
  const { res: wrong } = await api("/api/me/password", {
    method: "POST",
    cookie: oldCookie,
    body: { actual: "incorrecta", nueva: "new-pass-456" },
  });
  assert.equal(wrong.status, 401);

  // cambio correcto → 200
  const { res: change } = await api("/api/me/password", {
    method: "POST",
    cookie: oldCookie,
    body: { actual: "old-pass-123", nueva: "new-pass-456" },
  });
  assert.equal(change.status, 200);

  // la cookie vieja queda revocada (token_version subió)
  const { res: stale } = await api("/api/me", { cookie: oldCookie });
  assert.equal(stale.status, 401);

  // la contraseña antigua ya no entra
  const { res: oldLogin } = await api("/api/login", {
    method: "POST",
    body: { nombre, password: "old-pass-123" },
  });
  assert.equal(oldLogin.status, 401);

  // la nueva sí
  await login(nombre, "new-pass-456");
});

test("evento único: sorteo con veto + pregunta anónima", { skip }, async () => {
  const adminCookie = await login(ADMIN_NOMBRE, ADMIN_PASSWORD);

  const { data: cfgBefore } = await supabase
    .from("config")
    .select("estado")
    .eq("id", 1)
    .single();
  const { data: adminBefore } = await supabase
    .from("usuario")
    .select("id, asignado_id, viewed_at")
    .eq("nombre", ADMIN_NOMBRE)
    .single();

  const names = [`${prefix}ba`, `${prefix}bb`, `${prefix}bc`];
  const users = [];

  try {
    await supabase.from("config").update({ estado: "abierto" }).eq("id", 1);

    // Aislar: borrar cualquier usuario e2e_* residual (tests previos de esta
    // corrida o huérfanos de corridas abortadas) para que el sorteo cubra solo
    // admin + los 3 de este test.
    const { data: residuales } = await supabase
      .from("usuario")
      .select("id")
      .like("nombre", "e2e_%");
    const residualIds = (residuales ?? []).map((u) => u.id);
    if (residualIds.length) {
      await supabase.from("pregunta").delete().in("autor_id", residualIds);
      await supabase.from("pregunta").delete().in("destinatario_id", residualIds);
      await supabase.from("veto").delete().in("a_id", residualIds);
      await supabase.from("veto").delete().in("b_id", residualIds);
      await supabase.from("asignacion").delete().in("dador_id", residualIds);
      await supabase.from("asignacion").delete().in("receptor_id", residualIds);
      await supabase.from("usuario").update({ asignado_id: null }).in("asignado_id", residualIds);
      await supabase.from("usuario").delete().in("id", residualIds);
    }

    // crear + login
    for (const nombre of names) {
      created.push(nombre);
      const { res } = await api("/api/users", {
        method: "POST",
        cookie: adminCookie,
        body: { nombre, password: "pw-test-1234" },
      });
      assert.equal(res.status, 201);
      const cookie = await login(nombre, "pw-test-1234");
      const me = (await api("/api/me", { cookie })).data;
      users.push({ nombre, id: me.id, cookie });
    }

    // formulario + listo
    for (const u of users) {
      const { res: f } = await api("/api/me/form", {
        method: "PATCH",
        cookie: u.cookie,
        body: {
          hobbies: "leer, correr, cocinar",
          tallas: { camiseta: "M", zapato: "42" },
          palabra_vetada: "velas",
        },
      });
      assert.equal(f.status, 200, `form ${u.nombre}`);
      const { res: l } = await api("/api/me/listo", { method: "POST", cookie: u.cookie });
      assert.equal(l.status, 200, `listo ${u.nombre}`);
    }

    // estado: abierto, mis usuarios listo
    const estado = (await api("/api/estado", { cookie: adminCookie })).data;
    assert.equal(estado.estado, "abierto");
    const estadoYo = (await api("/api/estado", { cookie: users[0].cookie })).data;
    assert.equal(estadoYo.listo_yo, true);

    // veto entre ba y bb
    const a = users[0];
    const b = users[1];
    const { res: vetoRes } = await api("/api/admin/vetos", {
      method: "POST",
      cookie: adminCookie,
      body: { a_id: a.id, b_id: b.id },
    });
    assert.equal(vetoRes.status, 200);

    // sortear
    const { res: sortRes } = await api("/api/admin/sortear", {
      method: "POST",
      cookie: adminCookie,
    });
    assert.equal(sortRes.status, 200);

    const estado2 = (await api("/api/estado", { cookie: adminCookie })).data;
    assert.equal(estado2.estado, "sorteado");

    // asignados de admin + mis 3 usuarios
    const adminMe = (await api("/api/me", { cookie: adminCookie })).data;
    const todos = [{ id: adminMe.id, nombre: ADMIN_NOMBRE, cookie: adminCookie }, ...users];
    const asignadoDe = new Map();
    for (const u of todos) {
      const { asignado } = (await api("/api/me/asignado", { cookie: u.cookie })).data;
      assert.ok(asignado, `sin asignado ${u.nombre}`);
      asignadoDe.set(u.id, asignado.id);
    }
    for (const u of todos) {
      assert.notEqual(asignadoDe.get(u.id), u.id, `autoasignado ${u.nombre}`);
    }
    assert.notEqual(asignadoDe.get(a.id), b.id, "veto violado a->b");
    assert.notEqual(asignadoDe.get(b.id), a.id, "veto violado b->a");
    assert.equal(new Set(asignadoDe.values()).size, todos.length, "receptores no únicos");

    // pregunta anónima de a a su asignado
    const targetId = asignadoDe.get(a.id);
    const target = todos.find((u) => u.id === targetId);

    const { res: qCreate } = await api("/api/me/pregunta", {
      method: "POST",
      cookie: a.cookie,
      body: { texto: "¿Cuál es tu color favorito?" },
    });
    assert.equal(qCreate.status, 200);

    const enviada = (await api("/api/me/pregunta", { cookie: a.cookie })).data.enviada;
    assert.equal(enviada.texto, "¿Cuál es tu color favorito?");

    const recibida = (await api("/api/me/pregunta", { cookie: target.cookie })).data.recibida;
    assert.equal(recibida.texto, "¿Cuál es tu color favorito?");
    assert.ok(!("autor_id" in recibida), "recibida filtra autor_id");
    assert.ok(!("nombre" in recibida), "recibida filtra nombre");

    const { res: qResp } = await api("/api/me/pregunta/respuesta", {
      method: "POST",
      cookie: target.cookie,
      body: { pregunta_id: recibida.id, respuesta: "Azul" },
    });
    assert.equal(qResp.status, 200);

    const enviada2 = (await api("/api/me/pregunta", { cookie: a.cookie })).data.enviada;
    assert.equal(enviada2.respuesta, "Azul");

    // segunda pregunta → 409
    const { res: qAgain } = await api("/api/me/pregunta", {
      method: "POST",
      cookie: a.cookie,
      body: { texto: "otra" },
    });
    assert.equal(qAgain.status, 409);
  } finally {
    const e2eIds = users.map((u) => u.id);
    if (e2eIds.length) {
      await supabase.from("pregunta").delete().in("autor_id", e2eIds);
      await supabase.from("pregunta").delete().in("destinatario_id", e2eIds);
      await supabase.from("veto").delete().in("a_id", e2eIds);
      await supabase.from("veto").delete().in("b_id", e2eIds);
    }
    await supabase.from("asignacion").delete().eq("anio", new Date().getFullYear());
    await supabase
      .from("usuario")
      .update({
        asignado_id: adminBefore.asignado_id,
        viewed_at: adminBefore.viewed_at,
      })
      .eq("id", adminBefore.id);
    await supabase.from("config").update({ estado: cfgBefore.estado }).eq("id", 1);
  }
});
