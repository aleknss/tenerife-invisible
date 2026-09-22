// Sorteo con restricciones. Lógica pura, sin BD.
// Devuelve { ok, asignacion } o { ok: false, reason, bloqueado }.

export function sortear(ids, { vetos = [], previos = [] } = {}) {
  const n = ids.length;
  if (n < 2) {
    return { ok: false, reason: "Se necesitan al menos 2 participantes" };
  }

  const idIndex = new Map(ids.map((id, i) => [id, i]));

  const forbidden = new Set();
  for (const [a, b] of vetos) {
    const i = idIndex.get(a);
    const j = idIndex.get(b);
    if (i === undefined || j === undefined) continue;
    forbidden.add(`${i},${j}`);
    forbidden.add(`${j},${i}`);
  }
  for (const [d, r] of previos) {
    const i = idIndex.get(d);
    const j = idIndex.get(r);
    if (i === undefined || j === undefined) continue;
    forbidden.add(`${i},${j}`);
  }

  const allowed = (i, j) => i !== j && !forbidden.has(`${i},${j}`);

  // Orden aleatorio de dadores.
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }

  const matchRight = new Array(n).fill(-1); // receptor j -> dador i
  const visited = new Array(n).fill(false);

  function augment(i) {
    const js = [...Array(n).keys()];
    for (let x = n - 1; x > 0; x--) {
      const y = Math.floor(Math.random() * (x + 1));
      [js[x], js[y]] = [js[y], js[x]];
    }
    for (const j of js) {
      if (!allowed(i, j) || visited[j]) continue;
      visited[j] = true;
      if (matchRight[j] === -1 || augment(matchRight[j])) {
        matchRight[j] = i;
        return true;
      }
    }
    return false;
  }

  for (const i of order) {
    visited.fill(false);
    if (!augment(i)) {
      return {
        ok: false,
        reason: "No hay sorteo posible con los vetos actuales",
        bloqueado: ids[i],
      };
    }
  }

  const asignacion = new Map();
  for (let j = 0; j < n; j++) {
    asignacion.set(ids[matchRight[j]], ids[j]);
  }
  return { ok: true, asignacion };
}
