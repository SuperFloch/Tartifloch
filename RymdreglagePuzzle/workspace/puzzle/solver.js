// Solveur du puzzle des 64 grilles (assemblage 8x8 de pièces 4x4, rotations autorisées).
// Contraintes :
//  1. raccords : les traits qui traversent un bord doivent se retrouver des deux côtés ;
//  2. bord extérieur fermé (aucun trait ne sort de l'assemblage) ;
//  3. CHEMIN UNIQUE : les traits forment un seul chemin (2 extrémités : 656 et 880) -> aucune boucle fermée ne doit apparaître,
//     et le chemin allant d'une extrémité à l'autre ne peut être fermé qu'une fois les 64 pièces posées.
// Méthode : recherche en profondeur avec choix de la case la plus contrainte (MRV), union-find avec annulation pour les boucles,
// redémarrages aléatoires (graine) à budget croissant.
// Usage : node solver.js [--time=300] [--reflect] [--seed=1] [--out=solution.json] [--check=positions.json]
//   --reflect : autorise aussi les symétries (miroir) en plus des 4 rotations
//   --check   : affiche le nombre de raccords incohérents d'un fichier de positions (rotations lues si présentes)
// Orientation o = miroir*4 + rotations : la grille est d'abord retournée horizontalement si o>=4, puis tournée de (o%4) quarts de tour horaires.
const fs = require("fs"), path = require("path");

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith("--" + n + "=")); return a ? a.split("=")[1] : d; };
const flag = n => process.argv.includes("--" + n);
const TIME = +arg("time", 300) * 1000, REFLECT = flag("reflect"), OUT = arg("out", "solution.json");
let seed = +arg("seed", 1);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const TILES = new Function(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + ";return TILES;")();
const SYM = { 2: "ud", 3: "lr", 4: "ul", 5: "ld", 6: "dr", 7: "ur", 8: "udlr", u: "u", d: "d", l: "l", r: "r", 1: "", 0: "" };
const ROT = { u: "r", r: "d", d: "l", l: "u" }, MIR = { u: "u", d: "d", l: "r", r: "l" };
const mapDirs = (s, m) => [...s].map(c => m[c]).join("");

// --- orientations ---
function transform(D, o) {
    let g = D.map(r => r.slice());
    if (o >= 4) g = g.map(r => r.map(s => mapDirs(s, MIR)).reverse());
    for (let k = 0; k < o % 4; k++) {
        const n = [[], [], [], []];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) n[c][3 - r] = mapDirs(g[r][c], ROT);
        g = n;
    }
    return g;
}
const VEC = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };
function analyse(D) {
    const bit = (f) => [0, 1, 2, 3].reduce((a, k) => a | (f(k) ? 1 << k : 0), 0);
    const p = { top: bit(k => D[0][k].includes("u")), right: bit(k => D[k][3].includes("r")), bottom: bit(k => D[3][k].includes("d")), left: bit(k => D[k][0].includes("l")) };
    // composantes internes (chemins) : indices de cases -> composante
    const comp = Array(16).fill(-1); let nc = 0;
    for (let s = 0; s < 16; s++) {
        if (comp[s] >= 0) continue;
        const st = [s]; comp[s] = nc;
        while (st.length) {
            const i = st.pop(), r = i >> 2, c = i & 3;
            for (const d of D[r][c]) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) continue; const j = rr * 4 + cc; if (comp[j] < 0) { comp[j] = nc; st.push(j); } }
        }
        nc++;
    }
    p.nc = nc; p.trueEnds = Array(nc).fill(0); p.exits = Array(nc).fill(0);
    for (let i = 0; i < 16; i++) { const dg = D[i >> 2][i & 3].length; if (dg === 1) p.trueEnds[comp[i]]++; p.exits[comp[i]] += [...D[i >> 2][i & 3]].filter(d => { const rr = (i >> 2) + VEC[d][0], cc = (i & 3) + VEC[d][1]; return rr < 0 || rr > 3 || cc < 0 || cc > 3; }).length; }
    p.slot = { top: [], right: [], bottom: [], left: [] };
    for (let k = 0; k < 4; k++) {
        p.slot.top[k] = D[0][k].includes("u") ? comp[k] : -1;
        p.slot.bottom[k] = D[3][k].includes("d") ? comp[12 + k] : -1;
        p.slot.left[k] = D[k][0].includes("l") ? comp[k * 4] : -1;
        p.slot.right[k] = D[k][3].includes("r") ? comp[k * 4 + 3] : -1;
    }
    p.loops = 0; for (let c = 0; c < nc; c++) if (p.exits[c] + p.trueEnds[c] === 0) p.loops++;
    return p;
}

const NO = REFLECT ? 8 : 4, OP = [];
TILES.forEach((t, ti) => {
    const D = t.grid.map(r => r.map(x => SYM[x] || ""));
    const seen = new Set();
    for (let o = 0; o < NO; o++) {
        const p = analyse(transform(D, o)); p.tile = ti; p.id = t.id; p.o = o;
        const sig = [p.top, p.right, p.bottom, p.left, JSON.stringify(p.slot), JSON.stringify(transform(D, o))].join("|");
        if (seen.has(sig)) continue; seen.add(sig); // rotations identiques (symétries propres à la pièce)
        OP.push(p);
    }
});
const loops = OP.reduce((a, p) => a + p.loops, 0);
if (loops) console.log("ATTENTION : boucles internes à une pièce :", loops);

// --- mode --check ---
if (arg("check", null)) {
    const f = JSON.parse(fs.readFileSync(path.resolve(arg("check")), "utf8")), ids = f.positions, rots = f.rotations || ids.map(() => 0);
    const g = ids.map((id, i) => analyse(transform(TILES.find(t => t.id === id).grid.map(r => r.map(x => SYM[x] || "")), rots[i])));
    let bad = 0, ext = 0;
    for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7, p = g[i];
        if (c < 7 && p.right !== g[i + 1].left) bad++; if (r < 7 && p.bottom !== g[i + 8].top) bad++;
        if ((r === 0 && p.top) || (r === 7 && p.bottom) || (c === 0 && p.left) || (c === 7 && p.right)) ext++; }
    console.log("raccords incohérents :", bad, "| pièces de bord avec sortie extérieure :", ext);
    process.exit(0);
}

// --- recherche ---
const keyOf = (t, r, b, l) => (t + 1) + 17 * ((r + 1) + 17 * ((b + 1) + 17 * (l + 1)));
const memo = new Map();
function cands(t, r, b, l) {
    const k = keyOf(t, r, b, l); let L = memo.get(k);
    if (!L) { L = OP.filter(p => (t < 0 || p.top === t) && (r < 0 || p.right === r) && (b < 0 || p.bottom === b) && (l < 0 || p.left === l)); memo.set(k, L); }
    return L;
}
const grid = Array(64).fill(null), used = Array(64).fill(false);
const parent = new Int32Array(64 * 16), size = new Int32Array(64 * 16), ends = new Int32Array(64 * 16);
const undo = [];
const find = x => { while (parent[x] !== x) x = parent[x]; return x; };
function initNode(ti, p) { for (let c = 0; c < p.nc; c++) { const n = ti * 16 + c; parent[n] = n; size[n] = 1; ends[n] = p.trueEnds[c]; } }
function union(a, b) { // renvoie false si cycle
    let ra = find(a), rb = find(b); if (ra === rb) return false;
    if (size[ra] < size[rb]) { const t = ra; ra = rb; rb = t; }
    parent[rb] = ra; size[ra] += size[rb]; ends[ra] += ends[rb]; undo.push(rb); return true;
}
function rollback(to) { while (undo.length > to) { const rb = undo.pop(), ra = parent[rb]; parent[rb] = rb; size[ra] -= size[rb]; ends[ra] -= ends[rb]; } }
const NB = [["top", -8, "bottom"], ["bottom", 8, "top"], ["left", -1, "right"], ["right", 1, "left"]];

function place(pos, p, count) {
    const mark = undo.length; initNode(p.tile, p);
    for (const [side, d, opp] of NB) {
        const q = pos + d; if (q < 0 || q > 63 || (side === "left" && (pos & 7) === 0) || (side === "right" && (pos & 7) === 7)) continue;
        const nb = grid[q]; if (!nb) continue;
        for (let k = 0; k < 4; k++) {
            if (p.slot[side][k] < 0) continue;
            if (!union(p.tile * 16 + p.slot[side][k], nb.tile * 16 + nb.slot[opp][k])) { rollback(mark); return false; }
        }
    }
    if (count < 64) for (let c = 0; c < p.nc; c++) if (ends[find(p.tile * 16 + c)] >= 2) { rollback(mark); return false; }
    return true;
}

let nodes = 0, bestDepth = 0, nodeLimit = 0, t0 = Date.now(), lastLog = t0, solution = null;
class Stop extends Error {}
function search(count) {
    if (count === 64) { solution = grid.map(p => ({ id: p.id, o: p.o })); return true; }
    if (++nodes > nodeLimit) throw new Stop();
    if ((nodes & 1023) === 0) { const now = Date.now(); if (now - t0 > TIME) throw new Stop(); if (now - lastLog > 15000) { lastLog = now; console.log(`  ${((now - t0) / 1000) | 0}s nœuds=${nodes} profondeur max=${bestDepth}`); } }
    let bp = -1, bl = null, bc = 1e9;
    for (let pos = 0; pos < 64; pos++) {
        if (grid[pos]) continue; const r = pos >> 3, c = pos & 7;
        const t = r === 0 ? 0 : grid[pos - 8] ? grid[pos - 8].bottom : -1, b = r === 7 ? 0 : grid[pos + 8] ? grid[pos + 8].top : -1;
        const l = c === 0 ? 0 : grid[pos - 1] ? grid[pos - 1].right : -1, rr = c === 7 ? 0 : grid[pos + 1] ? grid[pos + 1].left : -1;
        if (t < 0 && rr < 0 && b < 0 && l < 0 && bp >= 0) continue; // case sans contrainte : jamais la plus contrainte
        const list = cands(t, rr, b, l); let n = 0; for (const p of list) if (!used[p.tile]) n++;
        if (n === 0) return false;
        if (n < bc) { bc = n; bp = pos; bl = list; if (n === 1) break; }
    }
    const L = bl.filter(p => !used[p.tile]);
    for (let i = L.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = L[i]; L[i] = L[j]; L[j] = t; }
    for (const p of L) {
        const mark = undo.length;
        if (!place(bp, p, count + 1)) continue;
        grid[bp] = p; used[p.tile] = true; if (count + 1 > bestDepth) bestDepth = count + 1;
        if (search(count + 1)) return true;
        grid[bp] = null; used[p.tile] = false; rollback(mark);
    }
    return false;
}

let budget = 200000, run = 0;
console.log(`Solveur : ${OP.length} pièces orientées, ${REFLECT ? "rotations + miroirs" : "rotations"}, temps max ${TIME / 1000}s`);
while (Date.now() - t0 < TIME && !solution) {
    run++; nodes = 0; nodeLimit = budget; grid.fill(null); used.fill(false); undo.length = 0;
    let done = false, stopped = false;
    try { done = search(0); } catch (e) { if (!(e instanceof Stop)) throw e; stopped = true; }
    if (!done && !solution && !stopped) { console.log("Espace de recherche épuisé : aucune solution avec ces contraintes."); break; }
    budget = Math.floor(budget * 1.3);
}
console.log(`redémarrages=${run} profondeur max=${bestDepth} temps=${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (solution) {
    fs.writeFileSync(path.join(__dirname, OUT), JSON.stringify({ saved: new Date().toISOString(), size: 8, positions: solution.map(s => s.id), rotations: solution.map(s => s.o) }, null, 1));
    console.log("SOLUTION trouvée, écrite dans", OUT);
} else console.log("Pas de solution trouvée dans le temps imparti.");
