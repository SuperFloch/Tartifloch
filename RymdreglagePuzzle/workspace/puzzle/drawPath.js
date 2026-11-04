// Dessine workspace/solutionChemin.png Ã  partir de path.json (ou du fichier donnÃ©) : piÃ¨ces Ã  leur place (sans rotation),
// chemin 656 -> 880 en rouge, autres traits en noir, sorties de trait sans partenaire marquÃ©es en orange.
// Usage : node drawPath.js [path.json] [sortie] (nÃ©cessite ImageMagick `magick`)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const file = process.argv[2] || "path.json", name = process.argv[3] || "solutionChemin";
const data = JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"))[process.argv[4] || "placed"];
const TILES = new Function(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + ";return TILES;")();
const SYM = { 2: "ud", 3: "lr", 4: "ul", 5: "ld", 6: "dr", 7: "ur", 8: "udlr", u: "u", d: "d", l: "l", r: "r", 1: "", 0: "" };
const VEC = { u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1] };
const S = 40, T = 12, GS = S * 4, M = 30;
const xs = data.map(d => d.x), ys = data.map(d => d.y), x0 = Math.min(...xs), y0 = Math.min(...ys);
const W = (Math.max(...xs) - x0 + 1) * GS + 2 * M, H = (Math.max(...ys) - y0 + 1) * GS + 2 * M;
const at = new Map(data.map(d => [d.x + "," + d.y, d]));
const tileOf = id => TILES.find(t => t.id === id);
function comps(D) { // composantes de cases (mÃªme ordre que pathSolver)
    const comp = Array(16).fill(-1); let nc = 0;
    for (let s = 0; s < 16; s++) { if (comp[s] >= 0) continue; const st = [s]; comp[s] = nc;
        while (st.length) { const i = st.pop(), r = i >> 2, c = i & 3; for (const d of D[r][c]) { const rr = r + VEC[d][0], cc = c + VEC[d][1]; if (rr < 0 || rr > 3 || cc < 0 || cc > 3) continue; const j = rr * 4 + cc; if (comp[j] < 0) { comp[j] = nc; st.push(j); } } } nc++; }
    return comp;
}
let body = "";
for (const d of data) {
    const t = tileOf(d.id), D = t.grid.map(r => r.map(x => SYM[x] || "")), comp = comps(D);
    const gx = M + (d.x - x0) * GS, gy = M + (d.y - y0) * GS;
    body += `<rect x="${gx}" y="${gy}" width="${GS}" height="${GS}" fill="${t.color}" fill-opacity="0.35" stroke="#555" stroke-width="1"/>`;
    for (let pass = 0; pass < 2; pass++) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const onPath = d.comp !== undefined && comp[r * 4 + c] === d.comp; if ((pass === 1) !== onPath) continue;
        const cx = gx + c * S + S / 2, cy = gy + r * S + S / 2; let p = "";
        for (const k of D[r][c]) p += `M${cx},${cy} L${cx + VEC[k][1] * S / 2},${cy + VEC[k][0] * S / 2} `;
        if (p) body += `<path d="${p}" stroke="${onPath ? "#e00000" : "#222"}" stroke-width="${T}" stroke-linecap="${onPath ? "round" : "butt"}" fill="none"/>`;
    }
    for (let k = 0; k < 4; k++) for (const [dir, ok] of [["u", D[0][k].includes("u")], ["d", D[3][k].includes("d")], ["l", D[k][0].includes("l")], ["r", D[k][3].includes("r")]]) {
        if (!ok) continue; const nb = at.get((d.x + VEC[dir][1]) + "," + (d.y + VEC[dir][0]));
        const nt = nb && tileOf(nb.id); const OPP = { u: "d", d: "u", l: "r", r: "l" };
        let matched = false;
        if (nt) { const ND = nt.grid.map(r => r.map(x => SYM[x] || "")); matched = dir === "u" ? ND[3][k].includes("d") : dir === "d" ? ND[0][k].includes("u") : dir === "l" ? ND[k][3].includes("r") : ND[k][0].includes("l"); }
        if (!matched) { const ex = dir === "l" ? gx : dir === "r" ? gx + GS : gx + k * S + S / 2, ey = dir === "u" ? gy : dir === "d" ? gy + GS : gy + k * S + S / 2;
            body += `<circle cx="${dir === "l" || dir === "r" ? ex : ex}" cy="${ey}" r="7" fill="orange" stroke="black" stroke-width="1.5"/>`; }
    }
    body += `<rect x="${gx + 2}" y="${gy + 2}" width="${String(d.id).length * 10 + 6}" height="19" fill="black" fill-opacity="0.8"/><text x="${gx + 5}" y="${gy + 17}" font-family="Arial" font-size="16" font-weight="bold" fill="white">${d.id}</text>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${process.argv[5] || "white"}"/>${body}</svg>`;
const out = path.join(__dirname, "..", name);
fs.writeFileSync(out + ".svg", svg); execFileSync("magick", ["-background", process.argv[5] || "white", out + ".svg", out + ".png"]);
console.log("image Ã©crite :", out + ".png", W + "x" + H);

