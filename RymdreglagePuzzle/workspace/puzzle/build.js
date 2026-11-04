// Génère data.js (64 tuiles : id, couleur de fond, grille 4x4) à partir de everything.json + corrections.json.
// Usage : node build.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const playlists = JSON.parse(fs.readFileSync(path.join(root, "everything.json"), "utf8")).playlists;
const corr = JSON.parse(fs.readFileSync(path.join(root, "corrections.json"), "utf8"));
const tiles = [];
for (let id = 16; id <= 1024; id += 16) {
    const p = playlists[id - 1];
    tiles.push({ id, color: (corr.gridColors || {})[id] || p.img.grid.color, grid: (corr.gridCells || {})[id] || p.img.grid.code });
}
fs.writeFileSync(path.join(__dirname, "data.js"), "const TILES = " + JSON.stringify(tiles) + ";\n");
console.log("data.js généré :", tiles.length, "tuiles");
