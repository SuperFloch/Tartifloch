// Solveur à forme libre : pièces posées sur une grille infinie, SANS rotation ni miroir.
// But : relier les deux extrémités (656 et 880) par un chemin continu ; tous les traits qui sortent d'une pièce doivent être
// repris par la pièce voisine (aucune sortie ouverte), aucune boucle fermée. La forme finale est libre, toutes les pièces ne sont pas forcément utilisées.
// Usage : node freeSolver.js [--time=120] [--seed=1] [--out=free.json] [--start=656]
// Écrit free.json : {complete, placed:[{id,x,y}], open:n} (la meilleure fermeture trouvée, sinon l'arrangement partiel le plus proche).
const fs = require("fs"), path = require("path");
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith("--" + n + "=")); return a ? a.split("=")[1] : d; };
const TIME = +arg("time", 120) * 1000, OUT = arg("out", "free.json"), START = +arg("start", 656);
const LOOPS = process.argv.includes("--loops"); // autorise les boucles fermées
let seed = +arg("seed", 1);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TILES = new Function(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + ";return TILES;")();
const SYM = { 2: "ud", 3: "lr", 4: "ul", 5: "ld", 6: "dr", 7: "ur", 8: "udlr", u: "u", d: "d", l: "l", r: "r", 1: "", 0: "" };
const VEC = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };

function analyse(D) {
    const bit = f => [0, 1, 2, 3].reduce((a, k) => a | (f(k) ? 1 << k : 0), 0);
    const p = { top: bit(k => D[0][k].includes("u")), right: bit(k => D[k][3].includes("r")), bottom: bit(k => D[3][k].includes("d")), left: bit(k => D[k][0].includes("l")) };
    const comp = Array(16).fill(-1); let nc = 0;
    for (let s = 0; s < 16; s++) {
        if (comp[s] >= 0) continue; const st = [s]; comp[s] = nc;
        while (st.length) { const i = st.pop(), r = i >> 2, c = i & 3;
            for (const d of D[r][c]) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) continue; const j = rr * 4 + cc; if (comp[j] < 0) { comp[j] = nc; st.push(j); } } }
        nc++;
    }
    p.nc = nc; p.trueEnds = Array(nc).fill(0); p.exits = Array(nc).fill(0);
    for (let i = 0; i < 16; i++) { const g = D[i >> 2][i & 3]; if (g.length === 1) p.trueEnds[comp[i]]++;
        for (const d of g) { const rr = (i >> 2) + VEC[d][0], cc = (i & 3) + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) p.exits[comp[i]]++; } }
    p.slot = { top: [], right: [], bottom: [], left: [] };
    for (let k = 0; k < 4; k++) {
        p.slot.top[k] = D[0][k].includes("u") ? comp[k] : -1; p.slot.bottom[k] = D[3][k].includes("d") ? comp[12 + k] : -1;
        p.slot.left[k] = D[k][0].includes("l") ? comp[k * 4] : -1; p.slot.right[k] = D[k][3].includes("r") ? comp[k * 4 + 3] : -1;
    }
    return p;
}
const P = TILES.map((t, i) => { const p = analyse(t.grid.map(r => r.map(x => SYM[x] || ""))); p.tile = i; p.id = t.id; return p; });
const startTile = P.findIndex(p => p.id === START);

const parent = new Int32Array(64 * 16), size = new Int32Array(64 * 16), ends = new Int32Array(64 * 16), undo = [];
const find = x => { while (parent[x] !== x) x = parent[x]; return x; };
const union = (a, b) => { let ra = find(a), rb = find(b); if (ra === rb) return false; if (size[ra] < size[rb]) { const t = ra; ra = rb; rb = t; } parent[rb] = ra; size[ra] += size[rb]; ends[ra] += ends[rb]; undo.push(rb); return true; };
const rollback = to => { while (undo.length > to) { const rb = undo.pop(), ra = parent[rb]; parent[rb] = rb; size[ra] -= size[rb]; ends[ra] -= ends[rb]; } };
const SIDES = [["top", -1, 0, "bottom"], ["bottom", 1, 0, "top"], ["left", 0, -1, "right"], ["right", 0, 1, "left"]];
const K = (r, c) => (r + 100) * 256 + (c + 100);

const grid = new Map(), used = Array(P.length).fill(false), order = [];
function place(r, c, p) {
    const mark = undo.length;
    for (let k = 0; k < p.nc; k++) { const n = p.tile * 16 + k; parent[n] = n; size[n] = 1; ends[n] = p.trueEnds[k]; }
    for (const [side, dr, dc, opp] of SIDES) { const nb = grid.get(K(r + dr, c + dc)); if (!nb) continue;
        for (let k = 0; k < 4; k++) if (p.slot[side][k] >= 0 && !union(p.tile * 16 + p.slot[side][k], nb.tile * 16 + nb.slot[opp][k]) && !LOOPS) { rollback(mark); return false; } }
    // un fragment qui contient les deux extrémités ne peut plus avoir de sortie ouverte (calculé à la fin) ; ici : jamais plus de 2 extrémités
    for (let k = 0; k < p.nc; k++) if (ends[find(p.tile * 16 + k)] > 2) { rollback(mark); return false; }
    return true;
}
const cache = new Map();
function cands(t, r, b, l) { const k = (t + 1) + 17 * ((r + 1) + 17 * ((b + 1) + 17 * (l + 1))); let L = cache.get(k); if (!L) { L = P.filter(p => (t < 0 || p.top === t) && (r < 0 || p.right === r) && (b < 0 || p.bottom === b) && (l < 0 || p.left === l)); cache.set(k, L); } return L; }

let nodes = 0, nodeLimit = 0, t0 = Date.now(), best = null, bestScore = -1, bestPartial = null, bestPartialScore = -1e9, lastLog = t0;
class Stop extends Error {}
function pending() { // cases vides adjacentes à une sortie ouverte, avec les contraintes de leurs voisins posés
    const m = new Map();
    for (const [key, p] of grid) { const r = (key >> 8) - 100, c = (key & 255) - 100;
        for (const [side, dr, dc] of SIDES) if (p[side] && !grid.has(K(r + dr, c + dc))) m.set(K(r + dr, c + dc), [r + dr, c + dc]); }
    return m;
}
function constraint(r, c) {
    const g = (dr, dc, s) => { const nb = grid.get(K(r + dr, c + dc)); return nb ? nb[s] : -1; };
    return [g(-1, 0, "bottom"), g(0, 1, "left"), g(1, 0, "top"), g(0, -1, "right")]; // top, right, bottom, left demandés
}
function snapshot(open) { return { complete: open === 0, open, placed: [...grid].map(([key, p]) => ({ id: p.id, x: (key & 255) - 100, y: (key >> 8) - 100 })) }; }
function search() {
    if (++nodes > nodeLimit) throw new Stop();
    if ((nodes & 255) === 0) { const now = Date.now(); if (now - t0 > TIME) throw new Stop(); if (now - lastLog > 15000) { lastLog = now; console.log(`  ${((now - t0) / 1000) | 0}s nœuds=${nodes} meilleur=${bestScore} pièces`); } }
    const pend = pending();
    if (pend.size === 0) { // fermé : les extrémités sont forcément reliées (chaque fragment ouvert a >= 1 sortie)
        let ok = true; for (const [, p] of grid) for (let k = 0; k < p.nc; k++) { const root = find(p.tile * 16 + k); if (ends[root] === 1) ok = false; }
        const ids = new Set([...grid.values()].map(p => p.id));
        if (ok && grid.size > bestScore) { bestScore = grid.size; best = snapshot(0); best.hasBoth = ids.has(656) && ids.has(880); console.log(`  fermé : ${grid.size} pièces (880 présent : ${ids.has(880)})`); }
        return false;
    }
    // score partiel : peu de sorties ouvertes
    const score = grid.size * 10 - pend.size; if (score > bestPartialScore) { bestPartialScore = score; bestPartial = snapshot(pend.size); }
    let bc = null, bl = null, bn = 1e9;
    for (const [, [r, c]] of pend) { const [t, rr, b, l] = constraint(r, c); const L = cands(t, rr, b, l).filter(p => !used[p.tile]); if (L.length < bn) { bn = L.length; bc = [r, c]; bl = L; if (bn === 0) return false; if (bn === 1) break; } }
    const L = bl.slice(); for (let i = L.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = L[i]; L[i] = L[j]; L[j] = t; }
    for (const p of L) { const mark = undo.length; if (!place(bc[0], bc[1], p)) continue;
        grid.set(K(bc[0], bc[1]), p); used[p.tile] = true; search(); grid.delete(K(bc[0], bc[1])); used[p.tile] = false; rollback(mark); }
    return false;
}
let budget = 100000, runs = 0, exhausted = false;
console.log(`Départ ${START}, ${P.length} pièces, sans rotation, temps ${TIME / 1000}s`);
while (Date.now() - t0 < TIME && !exhausted) {
    runs++; nodes = 0; nodeLimit = budget; grid.clear(); used.fill(false); undo.length = 0;
    const p0 = P[startTile]; for (let k = 0; k < p0.nc; k++) { const n = p0.tile * 16 + k; parent[n] = n; size[n] = 1; ends[n] = p0.trueEnds[k]; }
    grid.set(K(0, 0), p0); used[startTile] = true;
    try { search(); exhausted = true; } catch (e) { if (!(e instanceof Stop)) throw e; }
    budget = Math.floor(budget * 1.5);
}
console.log(exhausted ? "Espace exploré en entier (pour ce départ)." : "Temps écoulé.", `redémarrages=${runs}`);
const out = best ? best : bestPartial;
console.log(best ? `Meilleur arrangement fermé : ${best.placed.length} pièces (contient 656 et 880 : ${best.hasBoth})` : `Aucun arrangement fermé. Plus proche : ${bestPartial && bestPartial.placed.length} pièces, ${bestPartial && bestPartial.open} sorties ouvertes`);
fs.writeFileSync(path.join(__dirname, OUT), JSON.stringify(out));
