import test from "node:test";
import assert from "node:assert/strict";
import { sortear } from "../src/lib/sorteo.js";

test("menos de 2 participantes → error", () => {
  const r = sortear(["a"]);
  assert.equal(r.ok, false);
});

test("2 participantes: cada uno recibe al otro", () => {
  const r = sortear(["a", "b"]);
  assert.equal(r.ok, true);
  assert.equal(r.asignacion.get("a"), "b");
  assert.equal(r.asignacion.get("b"), "a");
});

test("sin vetos: derangement válido (nadie se autoasigna)", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const r = sortear(ids);
  assert.equal(r.ok, true);
  assert.equal(r.asignacion.size, ids.length);
  for (const id of ids) {
    assert.notEqual(r.asignacion.get(id), id, `${id} se asignó a sí mismo`);
  }
  // cada receptor recibe exactamente de uno
  const receptores = new Set(r.asignacion.values());
  assert.equal(receptores.size, ids.length);
});

test("veto: par prohibido nunca aparece en ningún sentido", () => {
  const ids = ["a", "b", "c", "d"];
  for (let t = 0; t < 50; t++) {
    const r = sortear(ids, { vetos: [["a", "b"]] });
    assert.equal(r.ok, true);
    assert.notEqual(r.asignacion.get("a"), "b");
    assert.notEqual(r.asignacion.get("b"), "a");
  }
});

test("veto total sobre un usuario → imposible", () => {
  const ids = ["a", "b", "c"];
  const r = sortear(ids, { vetos: [["a", "b"], ["a", "c"]] });
  assert.equal(r.ok, false);
  assert.equal(r.bloqueado, "a");
});

test("previos (año pasado): par no se repite", () => {
  const ids = ["a", "b", "c", "d"];
  for (let t = 0; t < 50; t++) {
    const r = sortear(ids, { previos: [["a", "b"]] });
    assert.equal(r.ok, true);
    assert.notEqual(r.asignacion.get("a"), "b");
  }
});
