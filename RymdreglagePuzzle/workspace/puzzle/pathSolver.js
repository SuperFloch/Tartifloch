// Chemin libre entre les deux extrémités (656 et 880), sans rotation ni miroir, forme libre.
// On suit le trait depuis l'extrémité de 656 : à chaque sortie de pièce, la pièce voisine doit avoir un trait au même rang sur le côté opposé.
// Les autres traits des pièces utilisées (hors du chemin) peuvent rester ouverts. Cherche le plus court chemin (approfondissement itératif).
// Usage : node pathSolver.js [--max=40] [--time=120] [--out=path.json]
const fs = require("fs"), path = require("path");
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith("--" + n + "=")); return a ? a.split("=")[1] : d; };
const MAXD = +arg("max", 40), TIME = +arg("time", 120) * 1000, OUT = arg("out", "path.json");
const TILES = new Function(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + ";return TILES;")();
const SYM = { 2: "ud", 3: "lr", 4: "ul", 5: "ld", 6: "dr", 7: "ur", 8: "udlr", u: "u", d: "d", l: "l", r: "r", 1: "", 0: "" };
const VEC = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };
function analyse(D) {
    const comp = Array(16).fill(-1); let nc = 0;
    for (let s = 0; s < 16; s++) { if (comp[s] >= 0) continue; const st = [s]; comp[s] = nc;
        while (st.length) { const i = st.pop(), r = i >> 2, c = i & 3;
            for (const d of D[r][c]) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) continue; const j = rr * 4 + cc; if (comp[j] < 0) { comp[j] = nc; st.push(j); } } }
        nc++; }
    const p = { nc, ends: Array(nc).fill(0), exits: Array(nc).fill(0).map(() => []), slot: { u: [], d: [], l: [], r: [] } };
    for (let i = 0; i < 16; i++) { const r = i >> 2, c = i & 3, g = D[r][c]; if (g.length === 1) p.ends[comp[i]]++;
        for (const d of g) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) { const k = (d === "u" || d === "d") ? c : r; p.slot[d][k] = comp[i]; p.exits[comp[i]].push([d, k]); } } }
    return p;
}
const P = TILES.map((t, i) => { const p = analyse(t.grid.map(r => r.map(x => SYM[x] || ""))); p.id = t.id; p.i = i; p.grid = t.grid; return p; });
const OPP = { u: "d", d: "u", l: "r", r: "l" };
const byId = id => P.find(p => p.id === id);
const A = byId(656), B = byId(880);
const compA = A.ends.findIndex(e => e === 1), compB = B.ends.findIndex(e => e === 1);

const used = Array(P.length).fill(false), cells = new Map(), K = (r, c) => (r + 200) * 512 + (c + 200);
let t0 = Date.now(), limit, nodes = 0, found = null;
class Stop extends Error {}
// pending : sortie à relier [r, c, d, k] (case de la pièce qui sort, direction, rang)
function dfs(pend, depth, linked) {
    if (++nodes % 4096 === 0 && Date.now() - t0 > TIME) throw new Stop();
    if (!pend) { found = [...cells].map(([key, v]) => ({ id: v.p.id, x: (key & 511) - 200, y: (key >> 9) - 200, comp: v.comp })); return true; }
    if (depth >= limit) return false;
    const [r, c, d, k] = pend, nr = r + VEC[d][0], nc = c + VEC[d][1];
    if (cells.has(K(nr, nc))) return false;
    for (const p of P) {
        if (used[p.i]) continue; const comp = p.slot[OPP[d]][k]; if (comp === undefined || comp < 0) continue;
        if (p.ends[comp] === 1 && p !== B) continue; // jamais une autre extrémité (il n'y en a que deux)
        const outs = p.exits[comp].filter(([dd, kk]) => !(dd === OPP[d] && kk === k));
        if (p === B) { if (comp !== compB || outs.length) continue; }
        else if (outs.length !== 1) continue; // un chemin traverse la pièce
        used[p.i] = true; cells.set(K(nr, nc), { p, comp });
        const ok = p === B ? dfs(null, depth + 1) : dfs([nr, nc, outs[0][0], outs[0][1]], depth + 1);
        if (ok) return true; used[p.i] = false; cells.delete(K(nr, nc));
    }
    return false;
}
const outsA = A.exits[compA];
console.log(`656 : extrémité dans le composant ${compA}, sorties ${JSON.stringify(outsA)} ; 880 : composant ${compB}, sorties ${JSON.stringify(B.exits[compB])}`);
used[A.i] = true; cells.set(K(0, 0), { p: A, comp: compA });
try {
    for (limit = 2; limit <= MAXD && !found; limit++) {
        outsA.length === 1 && dfs([0, 0, outsA[0][0], outsA[0][1]], 1);
        console.log(`profondeur ${limit} : nœuds=${nodes} ${found ? "TROUVÉ" : ""}`);
        if (found) break; used.fill(false); used[A.i] = true; cells.clear(); cells.set(K(0, 0), { p: A, comp: compA });
    }
} catch (e) { if (!(e instanceof Stop)) throw e; console.log("temps écoulé"); }
if (found) { fs.writeFileSync(path.join(__dirname, OUT), JSON.stringify({ placed: found })); console.log("chemin de", found.length, "pièces :", found.map(f => f.id + "(" + f.x + "," + f.y + ")").join(" ")); }
else console.log("aucun chemin trouvé");
