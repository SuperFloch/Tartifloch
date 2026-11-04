// Vérifie les grilles 4x4 (cases remplies par un point noir) et leurs couleurs directement sur les images.
// Usage : node checkGridImages.js [ids séparés par des virgules | all] [dossier des images, défaut E:/]
// Pour les grilles pleines (id multiple de 16, symboles en traits) seule la couleur est vérifiée.
// Position de la grille dans l'image 5000x5000 : x ~4210-4880, y ~4185-4855 (cases de ~169 px).
var fs = require('fs');
var cp = require('child_process');

var GRID = { x: 4210, y: 4185, size: 700, scale: 10 }; // crop 700x700 réduit 10x -> 70x70 px (1 case = 16,75 px)
var imagesDir = process.argv[4] || 'E:/';
var data = JSON.parse(fs.readFileSync('./everything.json').toString()).playlists;

function pad(n) { return ('000' + n).slice(-4); }

function readPixels(id) {
    var file = imagesDir + pad(id) + '/' + pad(id) + '.jpg';
    var out = cp.execFileSync('magick', [file, '-crop', GRID.size + 'x' + GRID.size + '+' + GRID.x + '+' + GRID.y, '+repage',
        '-resize', (GRID.size / GRID.scale) + 'x' + (GRID.size / GRID.scale) + '!', 'txt:-'], { maxBuffer: 1 << 26 }).toString();
    var w = GRID.size / GRID.scale, px = [];
    out.split('\n').forEach(function(line) {
        var m = /^(\d+),(\d+):\s*\((\d+),(\d+),(\d+)/.exec(line);
        if (m) px[(+m[2]) * w + (+m[1])] = [+m[3], +m[4], +m[5]];
    });
    return { px: px, w: w };
}

function hex(c) { return '#' + c.map(function(v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }

// Décode la grille d'une image : masque 16 cases (point noir au centre) + couleur de fond de la case 0
function decodeGrid(id) {
    var r = readPixels(id);
    var origin = 0.5, cellSize = 16.9, mask = '';
    for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 4; col++) {
            var cx = Math.round(origin + (col + 0.5) * cellSize), cy = Math.round(origin + (row + 0.5) * cellSize);
            var sum = 0, n = 0;
            for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
                var p = r.px[(cy + dy) * r.w + cx + dx];
                sum += (p[0] + p[1] + p[2]) / 3; n++;
            }
            mask += (sum / n < 60) ? '1' : '0';
        }
    }
    // Couleur de fond : couleur claire la plus fréquente de la zone de la grille (traits noirs et antialiasing ignorés)
    var hist = {};
    for (var y = 1; y < 67; y++) for (var x = 1; x < 67; x++) {
        var q = r.px[y * r.w + x];
        if (q[0] + q[1] + q[2] > 180) {
            var k = q.map(function(v) { return Math.round(v / 16) * 16; }).join(',');
            hist[k] = (hist[k] || 0) + 1;
        }
    }
    var best = Object.keys(hist).sort(function(a, b) { return hist[b] - hist[a]; })[0];
    var corner = best ? best.split(',').map(function(v) { return Math.min(255, +v); }) : [0, 0, 0];
    return { mask: mask, color: hex(corner) };
}

function jsonMask(p) {
    return p.img.grid.code.flat().map(function(c) { return c != '0' ? '1' : '0'; }).join('');
}

function colorClose(a, b) {
    var x = [1, 3, 5].map(function(i) { return parseInt(a.substr(i, 2), 16); });
    var y = [1, 3, 5].map(function(i) { return parseInt(b.substr(i, 2), 16); });
    return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 60;
}

var arg = process.argv[2] || 'all';
var ids = arg == 'all' ? data.map(function(p) { return +p.id; }) : arg.split(',').map(Number);
var bad = 0;
ids.forEach(function(id) {
    var p = data.find(function(d) { return +d.id == id; });
    var full = id % 16 == 0;
    var g;
    try { g = decodeGrid(id); } catch (e) { console.log(id + ' : image illisible (' + e.message.split('\n')[0] + ')'); return; }
    var issues = [];
    if (!full && g.mask != jsonMask(p)) issues.push('cases image=' + g.mask + ' json=' + jsonMask(p));
    if (!colorClose(g.color, p.img.grid.color)) issues.push('couleur image=' + g.color + ' json=' + p.img.grid.color);
    if (issues.length) { bad++; console.log(id + ' : ' + issues.join(' ; ')); }
});
console.log('Terminé : ' + ids.length + ' images, ' + bad + ' différence(s).');
