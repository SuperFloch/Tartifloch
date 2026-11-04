// Chemin le plus long en partant du bout de 656 (ou de 880 avec --from=880), sans rotation ni miroir, forme libre.
// Seule la continuitÃ© du chemin compte : chaque piÃ¨ce est traversÃ©e par un trait qui entre Ã  un rang d'un cÃ´tÃ© et ressort ailleurs ;
// la piÃ¨ce suivante doit avoir un trait au mÃªme rang sur le cÃ´tÃ© opposÃ©. Cases (piÃ¨ces) distinctes, piÃ¨ces uniques.
// Cherche le plus long chemin (recherche alÃ©atoire avec redÃ©marrages), mÃ©morise aussi le plus long qui ATTEINT l'autre bout.
// Usage : node longPath.js [--time=120] [--from=656] [--seed=1] [--out=long.json]
const fs = require("fs"), path = require("path");
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith("--" + n + "=")); return a ? a.split("=")[1] : d; };
const TIME = +arg("time", 120) * 1000, FROM = +arg("from", 656), OUT = arg("out", "long.json");
let seed = +arg("seed", 1); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TILES = new Function(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + ";return TILES;")();
const SYM = { 2: "ud", 3: "lr", 4: "ul", 5: "ld", 6: "dr", 7: "ur", 8: "udlr", u: "u", d: "d", l: "l", r: "r", 1: "", 0: "" };
const VEC = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] }, OPP = { u: "d", d: "u", l: "r", r: "l" };
function analyse(D) {
    const comp = Array(16).fill(-1); let nc = 0;
    for (let s = 0; s < 16; s++) { if (comp[s] >= 0) continue; const st = [s]; comp[s] = nc;
        while (st.length) { const i = st.pop(), r = i >> 2, c = i & 3; for (const d of D[r][c]) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) continue; const j = rr * 4 + cc; if (comp[j] < 0) { comp[j] = nc; st.push(j); } } } nc++; }
    const p = { ends: Array(nc).fill(0), exits: Array(nc).fill(0).map(() => []) };
    for (let i = 0; i < 16; i++) { const r = i >> 2, c = i & 3, g = D[r][c]; if (g.length === 1) p.ends[comp[i]]++;
        for (const d of g) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) p.exits[comp[i]].push([d, d === "u" || d === "d" ? c : r]); } }
    return p;
}
const P = TILES.map((t, i) => Object.assign(analyse(t.grid.map(r => r.map(x => SYM[x] || ""))), { id: t.id, i }));
const A = P.find(p => p.id === FROM), B = P.find(p => p.id === (FROM === 656 ? 880 : 656));
// arÃªtes : entrÃ©e (cÃ´tÃ© d du nouveau morceau, rang k) -> [tuile, comp, sortie|null]
const IN = {}; // clÃ© "d,k" : cÃ´tÃ© par lequel on ENTRE dans la tuile
for (const p of P) p.exits.forEach((ex, comp) => {
    if (p.ends[comp] === 1 && p !== B) return;
    if (p === B && ex.length === 1 && p.ends[comp] === 1) (IN[ex[0].join()] = IN[ex[0].join()] || []).push({ p, comp, out: null });
    else if (ex.length === 2 && p.ends[comp] === 0) { (IN[ex[0].join()] = IN[ex[0].join()] || []).push({ p, comp, out: ex[1] }); (IN[ex[1].join()] = IN[ex[1].join()] || []).push({ p, comp, out: ex[0] }); }
});
const compA = A.ends.findIndex(e => e === 1), startOut = A.exits[compA][0];
const K = (r, c) => (r + 300) * 1024 + (c + 300);
const used = Array(P.length).fill(false), cells = new Set(), cur = [];
let best = null, bestEnd = null, t0 = Date.now(), nodes = 0, limit = 0;
class Stop extends Error {}
const snap = () => cur.map(s => ({ id: s.p.id, x: s.c, y: s.r, comp: s.comp }));
function dfs(r, c, out) { // out = sortie [d,k] depuis la case (r,c)
    if (++nodes > limit) throw new Stop(); if ((nodes & 1023) === 0 && Date.now() - t0 > TIME) throw new Stop();
    const nr = r + VEC[out[0]][0], nc = c + VEC[out[0]][1]; if (cells.has(K(nr, nc))) return;
    const L = (IN[OPP[out[0]] + "," + out[1]] || []).filter(e => !used[e.p.i]);
    for (let i = L.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = L[i]; L[i] = L[j]; L[j] = t; }
    if (!L.length) return;
    for (const e of L) {
        used[e.p.i] = true; cells.add(K(nr, nc)); cur.push({ p: e.p, r: nr, c: nc, comp: e.comp });
        if (e.out === null) { if (!bestEnd || cur.length > bestEnd.length) { bestEnd = snap(); console.log("  atteint l'autre bout :", cur.length, "piÃ¨ces"); } }
        else { if (!best || cur.length > best.length) { best = snap(); } dfs(nr, nc, e.out); }
        cur.pop(); cells.delete(K(nr, nc)); used[e.p.i] = false;
    }
}
let budget = 20000, runs = 0, lastLog = t0;
while (Date.now() - t0 < TIME) {
    runs++; nodes = 0; limit = budget; used.fill(false); used[A.i] = true; cells.clear(); cells.add(K(0, 0)); cur.length = 0; cur.push({ p: A, r: 0, c: 0, comp: compA });
    try { dfs(0, 0, startOut); } catch (e) { if (!(e instanceof Stop)) throw e; }
    budget = Math.floor(budget * 1.15);
    if (Date.now() - lastLog > 15000) { lastLog = Date.now(); console.log(`  ${((Date.now() - t0) / 1000) | 0}s runs=${runs} plus long=${best ? best.length : 1}`); }
}
const out = bestEnd && (!best || bestEnd.length >= best.length) ? bestEnd : best;
console.log(`Plus long chemin depuis ${FROM} : ${best ? best.length : 1} piÃ¨ces ; plus long atteignant l'autre bout : ${bestEnd ? bestEnd.length : "aucun"}`);
const all = [{ id: A.id, x: 0, y: 0, comp: compA }].concat(best || []);
fs.writeFileSync(path.join(__dirname, OUT), JSON.stringify({ placed: all.filter((v, i, a) => a.findIndex(w => w.id === v.id) === i), end: bestEnd ? [{ id: A.id, x: 0, y: 0, comp: compA }].concat(bestEnd) : null }));

