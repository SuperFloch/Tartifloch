// Génère workspace/testMotif.png : les 64 grilles pleines (ids multiples de 16, de 16 à 1024) concaténées en une grille 8x8 de grilles 4x4,
// soit 32x32 symboles, rangées dans l'ordre des ids (ligne par ligne). Symboles : trait épais du centre de la case vers les bords
// (1 point, 2 vertical, 3 horizontal, 4 haut+gauche, 5 gauche+bas, 6 bas+droite, 7 haut+droite, 8 croix, 0 vide).
// Usage : node testMotifImage.js [colonnes=8]   (nécessite ImageMagick `magick`)
const fs = require("fs");
const { execFileSync } = require("child_process");

const playlists = JSON.parse(fs.readFileSync(__dirname + "/everything.json", "utf8")).playlists;
const corr = fs.existsSync(__dirname + "/corrections.json") ? JSON.parse(fs.readFileSync(__dirname + "/corrections.json", "utf8")) : {};
const gridOf = id => ((corr.gridCells || {})[id]) || playlists[id - 1].img.grid.code;

const COLS = +process.argv[2] || 8, N = 64, ROWS = Math.ceil(N / COLS);
const S = 36, T = 11, GS = S * 4; // taille d'une case, épaisseur du trait, taille d'une grille
// directions : u haut, d bas, l gauche, r droite
const SYM = { 2: "ud", 3: "lr", 4: "ul", 5: "ld", 6: "dr", 7: "ur", 8: "udlr", u: "u", d: "d", l: "l", r: "r" }; // u/d/l/r : demi-traits (cf. corrections.json)
const VEC = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };

const colorOf = id => ((corr.gridColors || {})[id]) || playlists[id - 1].img.grid.color;

// colored = true : fond de chaque grille à sa couleur (img.grid.color) + id inscrit dessus
function render(colored) {
let body = "";
for (let n = 0; n < N; n++) {
    const id = (n + 1) * 16, g = gridOf(id), gx = (n % COLS) * GS, gy = Math.floor(n / COLS) * GS;
    if (colored) body += `<rect x="${gx}" y="${gy}" width="${GS}" height="${GS}" fill="${colorOf(id)}"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const s = g[r][c], cx = gx + c * S + S / 2, cy = gy + r * S + S / 2;
        if (s === "1") body += `<rect x="${cx - T / 2}" y="${cy - T / 2}" width="${T}" height="${T}" fill="black"/>`;
        else if (SYM[s]) {
            let d = "";
            for (const k of SYM[s]) d += `M${cx},${cy} L${cx + VEC[k][0] * S / 2},${cy + VEC[k][1] * S / 2} `;
            body += `<path d="${d}" stroke="black" stroke-width="${T}" stroke-linecap="square" fill="none"/>`;
        }
    }
    body += `<rect x="${gx}" y="${gy}" width="${GS}" height="${GS}" fill="none" stroke="${colored ? "#000" : "#e0a0a0"}" stroke-width="1"/>`;
    if (colored) body += `<rect x="${gx + 2}" y="${gy + 2}" width="${String(id).length * 10 + 6}" height="19" fill="black" fill-opacity="0.8"/><text x="${gx + 5}" y="${gy + 17}" font-family="Arial" font-size="16" font-weight="bold" fill="white">${id}</text>`;
}
const W = COLS * GS, H = ROWS * GS;
return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
}

const out = __dirname + "/workspace";
fs.mkdirSync(out, { recursive: true });
[["testMotif", false], ["testMotifCouleurs", true]].forEach(([name, colored]) => {
    fs.writeFileSync(out + "/" + name + ".svg", render(colored));
    execFileSync("magick", ["-background", "white", out + "/" + name + ".svg", out + "/" + name + ".png"]);
    console.log(name + ".png généré :", COLS, "x", ROWS, "grilles");
});
