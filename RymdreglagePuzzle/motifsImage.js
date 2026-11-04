// Génère Motifs.svg / Motifs.png : les 8 motifs de grille d'un bloc (15 grilles du corps, ids 16k+1 .. 16k+15).
// Chaque ligne = un motif, montré par son premier bloc ; chaque case = la grille 4x4 d'un id (point noir = case remplie).
// Usage : node motifsImage.js   (nécessite ImageMagick `magick`)
const fs = require("fs");
const { execFileSync } = require("child_process");

const playlists = JSON.parse(fs.readFileSync(__dirname + "/everything.json", "utf8")).playlists;
const corr = fs.existsSync(__dirname + "/corrections.json") ? JSON.parse(fs.readFileSync(__dirname + "/corrections.json", "utf8")) : {};
const gridOf = id => ((corr.gridCells || {})[id]) || playlists[id - 1].img.grid.code;
const colorOf = id => ((corr.gridColors || {})[id]) || playlists[id - 1].img.grid.color;

// Suite des motifs par bloc (blocs 0 à 63, cf. blockPatternSequence)
const SEQ = "0123450536137610150207523637314430544667470152712043554272261766";
const blocksOf = m => [...SEQ].map((c, k) => (+c === m ? k : -1)).filter(k => k >= 0);

const C = 11, G = C * 4, GAP = 8, LEFT = 235, TOP = 60, ROWH = G + 62;
const W = LEFT + 15 * (G + GAP) + 10, H = TOP + 8 * ROWH + 10;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Arial">`;
svg += `<rect width="100%" height="100%" fill="white"/><text x="10" y="26" font-size="20" font-weight="bold">Les 8 motifs de grille (15 grilles du corps d'un bloc, ids pairs en gris clair)</text>`;
for (let i = 1; i <= 15; i++) svg += `<text x="${LEFT + (i - 1) * (G + GAP) + G / 2}" y="${TOP - 8}" font-size="12" text-anchor="middle" fill="#555">+${i}</text>`;

for (let m = 0; m < 8; m++) {
    const bl = blocksOf(m), b0 = bl[0], y = TOP + m * ROWH;
    let bits = "", pos = "";
    for (let i = 1; i <= 15; i++) {
        const id = b0 * 16 + i, g = gridOf(id), n = g.flat().filter(x => x !== "0").length;
        if (i % 2 === 0) bits += n >= 5 ? "1" : "0"; else pos += g.flat().findIndex(x => x !== "0");
        const x = LEFT + (i - 1) * (G + GAP);
        svg += `<rect x="${x}" y="${y}" width="${G}" height="${G}" fill="${i % 2 === 0 ? "#eee" : "#fff"}" stroke="#888"/>`;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
            svg += `<rect x="${x + c * C}" y="${y + r * C}" width="${C}" height="${C}" fill="none" stroke="#ddd" stroke-width="0.5"/>`;
            if (g[r][c] !== "0") svg += `<rect x="${x + c * C + 2}" y="${y + r * C + 2}" width="${C - 4}" height="${C - 4}" fill="black"/>`;
        }
    }
    svg += `<text x="10" y="${y + 22}" font-size="22" font-weight="bold">m${m}</text>`;
    svg += `<text x="10" y="${y + 42}" font-size="12">blocs : ${bl.join(",")}</text>`;
    svg += `<text x="10" y="${y + 58}" font-size="12">pairs ${bits}  impairs ${pos}</text>`;
    svg += `<text x="${LEFT}" y="${y + G + 16}" font-size="12" fill="#555">montré : bloc ${b0} (ids ${b0 * 16 + 1}-${b0 * 16 + 15}), couleur ${colorOf(b0 * 16 + 1)}</text>`;
}
svg += `</svg>`;
fs.writeFileSync(__dirname + "/workspace/Motifs.svg", svg);
execFileSync("magick", ["-background", "white", __dirname + "/workspace/Motifs.svg", __dirname + "/workspace/Motifs.png"]);
console.log("Motifs.png généré");
