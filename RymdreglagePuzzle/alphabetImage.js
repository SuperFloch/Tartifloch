// Génère Alphabet.svg / Alphabet.png : tous les caractères serpent distincts (après corrections), avec leur fréquence.
// Usage : node alphabetImage.js   (nécessite ImageMagick `magick` pour le PNG)
// Rendu : "'" = trait horizontal haut, "." = trait horizontal bas, "|" = trait vertical ; deux "'" ou "." de suite = trait double.
const fs = require("fs");
const { execFileSync } = require("child_process");

const playlists = JSON.parse(fs.readFileSync(__dirname + "/everything.json", "utf8")).playlists;
const corr = fs.existsSync(__dirname + "/corrections.json") ? JSON.parse(fs.readFileSync(__dirname + "/corrections.json", "utf8")) : {};
const count = {}, ids = {};
playlists.forEach(p => {
    let code = (corr.snakeCodes || {})[p.id] || p.img.snakeCode;
    (corr.snakeTokenFixes || {})[p.id] && (code = code.split((corr.snakeTokenFixes[p.id])[0]).join(corr.snakeTokenFixes[p.id][1]));
    code.trim().split(/ +/).filter(c => c).forEach(t => { count[t] = (count[t] || 0) + 1; (ids[t] = ids[t] || []).push(p.id); });
});
const tokens = Object.keys(count).sort((a, b) => count[b] - count[a]);

const U = 26, H = 40, COLS = 5, CW = 330, CH = 150;
function glyph(tok, ox, oy, color) {
    let x = 0, level = null, d = "";
    const top = 0, bot = H;
    for (let i = 0; i < tok.length; i++) {
        const c = tok[i];
        if (c === "|") d += `M${x},${top} L${x},${bot} `;
        else { let n = 1; while (tok[i + 1] === c) { n++; i++; } const y = c === "'" ? top : bot; d += `M${x},${y} L${x + n * U},${y} `; x += n * U; }
    }
    return `<path transform="translate(${ox},${oy})" d="${d}" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="square"/>`;
}

const rows = Math.ceil(tokens.length / COLS), W = COLS * CW + 20, Ht = rows * CH + 70;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}" font-family="Arial">`;
svg += `<rect width="100%" height="100%" fill="white"/><text x="10" y="35" font-size="26" font-weight="bold">Alphabet serpent : ${tokens.length} caractères distincts (triés par fréquence)</text>`;
tokens.forEach((t, i) => {
    const cx = 10 + (i % COLS) * CW, cy = 60 + Math.floor(i / COLS) * CH;
    const rare = count[t] <= 15;
    svg += `<rect x="${cx}" y="${cy}" width="${CW - 10}" height="${CH - 10}" fill="${rare ? "#fff0f0" : "#f4f4f4"}" stroke="${rare ? "#c00" : "#bbb"}"/>`;
    svg += glyph(t, cx + 20, cy + 22, "black");
    svg += `<text x="${cx + 8}" y="${cy + 95}" font-size="15">#${i + 1}  ${t.replace(/&/g, "&amp;")}</text>`;
    svg += `<text x="${cx + 8}" y="${cy + 118}" font-size="15" fill="#555">${count[t]} occ.${count[t] <= 15 ? " ids " + ids[t].slice(0, 6).join(",") + (ids[t].length > 6 ? "…" : "") : ""}</text>`;
});
svg += `</svg>`;
fs.writeFileSync(__dirname + "/workspace/Alphabet.svg", svg);
execFileSync("magick", ["-background", "white", __dirname + "/workspace/Alphabet.svg", __dirname + "/workspace/Alphabet.png"]);
console.log("Alphabet.png généré :", tokens.length, "caractères");
