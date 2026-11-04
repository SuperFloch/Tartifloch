var fs = require('fs');

var data = null;
var corrections = { verified: {} };

fs.readFile('./everything.json', function read(err, data) {
    if (err) {
        throw err;
    }
    processFile(data.toString());
});

function processFile(json) {
    data = JSON.parse(json).playlists;
    applyCorrections();

    // Usage : node analyzeScript.js <nomFonction> [args JSON...]   (ex: node analyzeScript.js countLastNames 10)
    var fn = process.argv[2];
    if (!fn) {
        console.log("Fonctions disponibles : " + Object.keys(CLI).join(", "));
        return;
    }
    if (!CLI[fn]) {
        console.log("Inconnue : " + fn + ". Disponibles : " + Object.keys(CLI).join(", "));
        return;
    }
    var args = process.argv.slice(3).map(a => { try { return JSON.parse(a); } catch (e) { return a; } });
    console.log(JSON.stringify(CLI[fn](...args), null, 1));

    /*
    var codes = data.map(c => c.img.snakeCode).flat();
    tranlatedCodes = translateSnakeCodes(codes);
    var uniqueTranslated = tranlatedCodes.distinct().sort();
    var sums = [];
    uniqueTranslated.forEach((ut) => {
        sums.push({ code: ut, count: tranlatedCodes.multiIndexOf(ut).length });
    });
    console.log(sums.sort((a, b) => {
        return b.count - a.count;
    }));
    console.log(uniqueTranslated.length);
    console.log(uniqueTranslated);
    */
}

// Applique corrections.json (valeurs vérifiées sur les images) aux données chargées en mémoire
function applyCorrections() {
    var c = JSON.parse(fs.readFileSync('./corrections.json').toString());
    corrections = c;
    var byId = {};
    data.forEach(p => { byId[+p.id] = p; });
    Object.keys(c.numbers || {}).forEach(id => { byId[id].img.number = c.numbers[id]; });
    Object.keys(c.snakeCodes || {}).forEach(id => { byId[id].img.snakeCode = c.snakeCodes[id]; });
    Object.keys(c.snakeTokenFixes || {}).forEach(id => {
        var fix = c.snakeTokenFixes[id], p = byId[id];
        p.img.snakeCode = p.img.snakeCode.split(" ").map(t => t == fix[0] ? fix[1] : t).join(" ");
    });
    Object.keys(c.gridColors || {}).forEach(id => { byId[id].img.grid.color = c.gridColors[id]; });
    Object.keys(c.gridCells || {}).forEach(id => { byId[id].img.grid.code = c.gridCells[id]; });
}

function translateSnakeCodes(codes) {
    var snakeChars = getSnakeChars();
    var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    var ret = [];
    codes.forEach((c) => {
        var letters = c.split(" ");
        var retL = "";
        letters.forEach((l) => {
            if (l != "") {
                var index = snakeChars.indexOf(l);
                retL += alphabet[index];
            }
        });
        ret.push(retL);
    });
    return ret;
}

function analyzeNames() {
    var firstNames = data.map(c => c.songs.map(s => s.split(" ")[0])).flat();
    var lastNames = data.map(c => c.songs.map(s => s.split(" ")[1])).flat();
    //const unique = [...new Set(lastNames.map(item => item))];
    console.log(getDistinctCounts(firstNames));
}

function getDistinctCounts(arr) {
    var counts = {};
    for (var i = 0; i < arr.length; i++) {
        counts[arr[i]] = 1 + (counts[arr[i]] || 0);
    }
    return counts;
}


//----------------- NOMS / TITRES DES CHANSONS
// Titre de chanson = "Prénom Nom Verbe complément..."  (songs[0] = série de nombres, sauf playlist 392)

var NUMBER_SERIES_RE = /^[\d.\-]+$/;

function isNumberSeries(title) {
    return NUMBER_SERIES_RE.test(title);
}

// Renvoie les vrais titres de chansons (sans la série chiffrée) pour une playlist
function getRealSongs(playlist) {
    return playlist.songs.filter(s => !isNumberSeries(s));
}

function getAllSongs() {
    return data.map(p => getRealSongs(p).map(s => ({ id: p.id, title: s }))).flat();
}

function getFirstNames() { return getAllSongs().map(s => s.title.split(" ")[0]); }
function getLastNames() { return getAllSongs().map(s => s.title.split(" ")[1]); }
function getVerbs() { return getAllSongs().map(s => s.title.split(" ")[2]); }

// Compte trié décroissant. limit optionnel (0 = tout)
function sortedCounts(arr, limit) {
    var counts = getDistinctCounts(arr);
    var res = Object.keys(counts).map(k => ({ value: k, count: counts[k] })).sort((a, b) => b.count - a.count);
    return limit ? res.slice(0, limit) : res;
}
function countFirstNames(limit) { return sortedCounts(getFirstNames(), limit); }
function countLastNames(limit) { return sortedCounts(getLastNames(), limit); }
function countVerbs(limit) { return sortedCounts(getVerbs(), limit); }

// Histogramme : combien de noms de famille apparaissent N fois
function lastNameCountHistogram() {
    return getDistinctCounts(countLastNames().map(c => c.count));
}

// Noms de famille qui ne reviennent pas exactement 200 fois
function lastNamesNot200() {
    return countLastNames().filter(c => c.count != 200);
}

// Prénoms associés à un nom de famille
function firstNamesOfLastName(last) {
    return sortedCounts(getAllSongs().filter(s => s.title.split(" ")[1] == last).map(s => s.title.split(" ")[0]));
}

// Combien de titres par playlist (hors série chiffrée)
function songCountsPerPlaylist() {
    return getDistinctCounts(data.map(p => getRealSongs(p).length));
}

//----------------- SERIES DE NOMBRES (titre chiffré)

// Renvoie { id, position, series } pour chaque playlist ; position = index de la piste dans la playlist
function getNumberSeries() {
    return data.map(p => {
        var idx = p.songs.findIndex(isNumberSeries);
        return { id: p.id, position: idx, series: p.songs[idx].split("-").map(Number) };
    });
}

function seriesLengthCounts() {
    return getDistinctCounts(getNumberSeries().map(s => s.series.length));
}

// Séries dont la piste n'est pas la première (attendu : 392)
function seriesNotFirst() {
    return getNumberSeries().filter(s => s.position != 0).map(s => ({ id: s.id, position: s.position }));
}

// "asc" si croissante, "desc" si décroissante, "mixed" sinon
function seriesTrend() {
    return getNumberSeries().map(s => {
        var a = s.series, asc = true, desc = true;
        for (var i = 1; i < a.length; i++) {
            if (a[i] < a[i - 1]) asc = false;
            if (a[i] > a[i - 1]) desc = false;
        }
        return { id: s.id, trend: asc ? "asc" : desc ? "desc" : "mixed" };
    });
}
function seriesTrendCounts() {
    return getDistinctCounts(seriesTrend().map(s => s.trend));
}

function getSeriesOf(id) {
    return getNumberSeries().find(s => s.id == id);
}

//----------------- IMAGES / DOUTES (cf. README.txt)

var DOUBT_SNAKE_IDS = [3, 55, 779];                 // ambiguïté Q / R
var DOUBT_PICTURE_IDS = [83, 150, 237, 238, 239, 240, 242, 243, 246, 283, 338, 355, 374, 391, 503, 519, 570, 602, 611, 640, 651, 712, 742, 743, 751, 807, 821, 871, 932, 951, 994, 999, 1011, 1016];
var CLOSED_EYES_IDS = [237, 238, 239, 240, 242, 243, 246, 283, 374, 570, 611, 651, 742, 932, 1011];

function getPlaylist(id) {
    return data.find(p => p.id == id);
}

// Valeurs distinctes d'un champ de img.picture avec leur effectif (hat, eye, human, mouth)
function pictureFieldCounts(field) {
    return getDistinctCounts(data.map(p => p.img.picture[field]));
}

// Combinaisons CYHS avec effectif (voir aussi getCommonPictureIds)
function cyhsCounts() {
    return getCommonPictureIds().map(c => ({ code: c.code, count: c.ids.length }));
}

// Combinaisons CYHS ne correspondant qu'à une seule playlist
function uniqueCyhs() {
    return getCommonPictureIds().filter(c => c.ids.length == 1);
}

// Relation couleur de grille <-> combinaison CYHS (piste 12 x 8 = 96)
function gridColorVsCyhs() {
    var map = {};
    data.forEach(p => {
        var k = p.img.grid.color;
        var cyhs = [p.img.picture.hat, p.img.picture.eye, p.img.picture.human, p.img.picture.mouth].join(",");
        map[k] = map[k] || {};
        map[k][cyhs] = (map[k][cyhs] || 0) + 1;
    });
    return map;
}

function backgroundColorCounts() {
    return getDistinctCounts(data.map(p => p.img.backgroundColor));
}

// Nombres affichés en haut à gauche (img.number)
function getImgNumbers() {
    return data.map(p => ({ id: p.id, number: p.img.number }));
}

// Titres (name) des playlists avec effectif
function nameCounts() {
    return sortedCounts(data.map(p => p.name));
}

//----------------- SNAKECODE : fréquences / "mots"
// Un snakeCode = suite de caractères serpent séparés par des espaces (26 distincts, + code vide possible)

function snakeTokens(p) {
    return p.img.snakeCode.trim().split(/ +/).filter(c => c != "");
}

// Fréquence de chaque caractère serpent (trié décroissant)
function snakeCharFrequency() {
    return sortedCounts(data.map(snakeTokens).flat());
}

// Pour chaque caractère serpent : nombre d'occurrences et ids (liste complète si count <= maxCount)
function snakeTokenIds(maxCount) {
    maxCount = maxCount || 20;
    var map = {};
    data.forEach(p => snakeTokens(p).forEach(t => (map[t] = map[t] || []).push(p.id)));
    return Object.keys(map).map(t => ({ token: t, count: map[t].length, ids: map[t].length <= maxCount ? map[t] : undefined }))
        .sort((a, b) => a.count - b.count);
}

// Table de substitution fréquentielle vers un alphabet donné (par défaut anglais ETAOIN...)
function snakeFrequencyAlphabet(freqOrder) {
    freqOrder = freqOrder || "ETAOINSHRDLCUMWFGYPBVKJXQZ";
    var map = {};
    snakeCharFrequency().forEach((c, i) => map[c.value] = freqOrder[i]);
    return map;
}

// Chaque snakeCode traduit en lettres via la table de fréquence
function snakeWordsByFrequency(freqOrder) {
    var map = snakeFrequencyAlphabet(freqOrder);
    return data.map(p => ({ id: p.id, word: snakeTokens(p).map(c => map[c]).join("") }));
}

// Mots (suite de caractères serpent) distincts avec effectif
function snakeWordCounts() {
    return sortedCounts(data.map(p => snakeTokens(p).join(" ")));
}

function snakeLengthCounts() {
    return getDistinctCounts(data.map(p => snakeTokens(p).length));
}

// Effectif de chaque caractère serpent par position dans le mot (0 = 1re lettre)
function snakeCharByPosition() {
    var res = {};
    data.forEach(p => snakeTokens(p).forEach((c, i) => {
        res[c] = res[c] || {};
        res[c][i] = (res[c][i] || 0) + 1;
    }));
    return res;
}

// Pour un champ (chemin "img.picture.hat", "img.grid.color", "img.underlined", "name"...), valeurs observées par snakeCode
function snakeWordVsField(path) {
    var res = {};
    data.forEach(p => {
        var w = snakeTokens(p).join(" ");
        var v = getByPath(p, path);
        res[w] = res[w] || {};
        res[w][v] = (res[w][v] || 0) + 1;
    });
    return res;
}

// Mesure d'association : pour un champ, nb de valeurs distinctes de ce champ par snakeCode (1 = déterminé par le mot)
function snakeWordDeterminism(path) {
    var m = snakeWordVsField(path);
    return getDistinctCounts(Object.keys(m).map(w => Object.keys(m[w]).length));
}

function getByPath(obj, path) {
    return path.split(".").reduce((o, k) => o && o[k], obj);
}

//----------------- NAME (titre de l'image) : mots répétés

function nameWords() {
    return data.map(p => p.name.split(" ")).flat();
}
function nameWordCounts(limit) {
    return sortedCounts(nameWords(), limit);
}
// Nb de mots dans le name et effectif
function nameLengthCounts() {
    return getDistinctCounts(data.map(p => p.name.split(" ").length));
}
// Pour un mot de name, valeurs observées d'un champ pour les playlists qui le contiennent
function nameWordVsField(word, path) {
    var res = {};
    data.filter(p => p.name.split(" ").includes(word)).forEach(p => {
        var v = getByPath(p, path);
        res[v] = (res[v] || 0) + 1;
    });
    return res;
}
// Name vs champ : pour chaque name répété, valeurs du champ
function repeatedNamesVsField(path) {
    var names = sortedCounts(data.map(p => p.name)).filter(n => n.count > 1);
    return names.map(n => ({
        name: n.value,
        ids: data.filter(p => p.name == n.value).map(p => p.id),
        values: data.filter(p => p.name == n.value).map(p => getByPath(p, path))
    }));
}

//----------------- COULEURS : fond (dégradé), carrés, grille

function hexToRgb(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}
function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max != min) {
        var dd = max - min;
        s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
        if (max == r) h = (g - b) / dd + (g < b ? 6 : 0);
        else if (max == g) h = (b - r) / dd + 2;
        else h = (r - g) / dd + 4;
        h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

// Teinte (H) du fond pour chaque playlist (échantillon : un point tous les "step")
function backgroundHueSeries(step) {
    step = step || 32;
    return data.filter((p, i) => i % step == 0).map(p => ({ id: p.id, bg: p.img.backgroundColor, hsl: rgbToHsl(hexToRgb(p.img.backgroundColor)) }));
}

// Le fond est-il continu ? distance RGB max entre playlists consécutives
function backgroundMaxStep() {
    var max = 0, at = null;
    for (var i = 1; i < data.length; i++) {
        var a = hexToRgb(data[i - 1].img.backgroundColor), b = hexToRgb(data[i].img.backgroundColor);
        var dist = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
        if (dist > max) { max = dist; at = data[i].id; }
    }
    return { max: max, atId: at };
}

// Couleurs des 7 carrés : effectif global, nb de couleurs distinctes, doublons à l'intérieur d'un bloc
function squareColorStats() {
    var all = data.map(p => p.img.colors).flat();
    var withDup = data.filter(p => p.img.colors.distinct().length < 7).length;
    return { total: all.length, distinct: all.distinct().length, playlistsWithDuplicateInBlock: withDup, top: sortedCounts(all, 10) };
}

// Couleurs de carrés : distribution (R,G,B) en niveaux distincts
function squareColorChannelLevels() {
    var lv = [{}, {}, {}];
    data.map(p => p.img.colors).flat().forEach(c => {
        hexToRgb(c).forEach((v, i) => lv[i][v] = (lv[i][v] || 0) + 1);
    });
    return lv.map(o => Object.keys(o).length);
}

// Compare le fond avec chaque carré : distance minimale / moyenne
function backgroundVsSquares(limit) {
    return data.slice(0, limit || 10).map(p => ({
        id: p.id, bg: p.img.backgroundColor, colors: p.img.colors,
        hslBg: rgbToHsl(hexToRgb(p.img.backgroundColor)), hslColors: p.img.colors.map(c => rgbToHsl(hexToRgb(c)))
    }));
}

//----------------- GRILLE 4x4

function gridKey(p) {
    return p.img.grid.code.map(r => r.join("")).join("/");
}
// Nb de cases non vides par grille
function gridFilledCounts() {
    return getDistinctCounts(data.map(p => p.img.grid.code.flat().filter(c => c != "0").length));
}
// Symboles utilisés (1-8) et leur effectif
function gridSymbolCounts() {
    return getDistinctCounts(data.map(p => p.img.grid.code.flat().filter(c => c != "0")).flat());
}
// Grilles identiques / répétées
function gridPatternCounts(limit) {
    return sortedCounts(data.map(gridKey), limit);
}
// Un symbole donné apparaît-il en position (ligne, colonne) ? matrice d'effectifs
function gridCellHeatmap(symbol) {
    var m = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    data.forEach(p => p.img.grid.code.forEach((r, i) => r.forEach((c, j) => {
        if (symbol === undefined ? c != "0" : c == symbol) m[i][j]++;
    })));
    return m;
}
// Nb de grilles où un même symbole apparaît plusieurs fois
function gridDuplicateSymbols() {
    return getDistinctCounts(data.map(p => {
        var f = p.img.grid.code.flat().filter(c => c != "0");
        return f.length - f.distinct().length;
    }));
}
// Corrélation grille <-> autre champ : nb de valeurs distinctes du champ par grille
function gridVsField(path) {
    var res = {};
    data.forEach(p => {
        var k = gridKey(p), v = getByPath(p, path);
        res[k] = res[k] || {};
        res[k][v] = (res[k][v] || 0) + 1;
    });
    return res;
}

// Nb max de grilles distinctes par résidu de (id mod m) : 1 = grille entièrement déterminée par id mod m
function gridDistinctPerIdModulo(m) {
    var t = {};
    data.forEach(p => {
        var k = (+p.id) % m;
        t[k] = t[k] || {};
        t[k][gridKey(p)] = 1;
    });
    return Math.max(...Object.values(t).map(s => Object.keys(s).length));
}
// Même chose pour un snakeCode (mot) : nb max de mots distincts par résidu
function snakeDistinctPerIdModulo(m) {
    var t = {};
    data.forEach(p => {
        var k = (+p.id) % m;
        t[k] = t[k] || {};
        t[k][snakeTokens(p).join(" ")] = 1;
    });
    return Math.max(...Object.values(t).map(s => Object.keys(s).length));
}
// Ids dont la grille a N cases remplies (ex: 16 = grille pleine)
function idsWithGridFilled(n) {
    return data.filter(p => p.img.grid.code.flat().filter(c => c != "0").length == n).map(p => p.id);
}
// Ids dont la grille n'est pas grise (#808080) avec leur couleur
// Cartographie des couleurs de grille : suites d'ids consécutifs de même couleur (après corrections)
function gridColorRuns() {
    var runs = [];
    data.forEach(p => {
        var last = runs[runs.length - 1], c = p.img.grid.color.toLowerCase(), id = parseInt(p.id);
        if (last && last.color == c) { last.to = id; last.count++; }
        else runs.push({ color: c, from: id, to: id, count: 1 });
    });
    return runs;
}

// Par bloc de 16 : couleur d'en-tête (id 16k), couleur(s) du corps, et séparation en sous-suites
function gridColorBlocks() {
    var out = [];
    for (var k = 0; k <= 64; k++) {
        var ps = data.filter(p => Math.floor(parseInt(p.id) / 16) == k);
        if (!ps.length) continue;
        var head = k * 16 >= 1 && ps[0].id == String(k * 16) ? ps[0].img.grid.color.toLowerCase() : "";
        var body = {};
        ps.filter(p => parseInt(p.id) % 16 != 0).forEach(p => { var c = p.img.grid.color.toLowerCase(); body[c] = (body[c] || 0) + 1; });
        out.push({ block: k, head: head, body: body });
    }
    return out;
}

function idsWithColoredGrid() {
    return data.filter(p => p.img.grid.color != "#808080").map(p => p.id + ":" + p.img.grid.color);
}

//----------------- GRILLE EN BINAIRE / SOULIGNÉS

function gridCells(p) {
    return p.img.grid.code.flat();
}
function gridFilled(p) {
    return gridCells(p).filter(c => c != "0").length;
}
// Masque binaire 16 bits (cases remplies = 1, lecture ligne par ligne) de chaque playlist
function gridBinary() {
    return data.map(p => ({ id: p.id, bits: gridCells(p).map(c => c != "0" ? 1 : 0).join("") }));
}
// Id impair -> position (0-15) de la case unique ; id pair -> 3 cases (0) ou 5 cases (1) ; autres cas listés
function gridDecodeSimple() {
    var odd = [], even = [], other = [];
    data.forEach(p => {
        var n = +p.id, f = gridFilled(p), cells = gridCells(p);
        if (f == 1) odd.push({ id: n, pos: cells.findIndex(c => c != "0") });
        else if (f == 3 || f == 5) even.push({ id: n, bit: f == 5 ? 1 : 0 });
        else other.push({ id: n, filled: f });
    });
    return { oddPositions: odd, evenBits: even, other: other };
}
// Séquences en chaînes pour inspection
function gridSequences() {
    var r = gridDecodeSimple();
    return {
        oddPositions: r.oddPositions.map(x => x.pos.toString(16)).join(""),
        evenBits: r.evenBits.map(x => x.bit).join(""),
        exceptionsEvenSingle: r.oddPositions.filter(x => x.id % 2 == 0).map(x => x.id),
        nonStandardFill: r.other.filter(x => x.filled != 16)
    };
}
// Symboles des grilles pleines (id multiples de 16), un par ligne de 16 chiffres
function fullGridSymbols() {
    return data.filter(p => gridFilled(p) >= 14).map(p => p.id + ":" + gridCells(p).join(""));
}

// Détails des nombres soulignés (img.number) et ids soulignés
function underlinedNumbers() {
    return data.filter(p => p.img.underlined).map(p => ({ id: +p.id, number: p.img.number }));
}
function underlinedIdsDiffs() {
    var ids = underlinedNumbers().map(u => u.id);
    return ids.slice(1).map((x, i) => x - ids[i]);
}
function underlinedDigitStats() {
    var digits = underlinedNumbers().map(u => u.number).join("");
    return { count: digits.length, freq: getDistinctCounts(digits.split("")) };
}
// Longueur/caractères atypiques dans img.number (OCR douteux)
function oddImgNumbers() {
    return data.filter(p => !/^\d{10}$/.test(p.img.number)).map(p => p.id + ":" + p.img.number);
}
function idUnderlinedInfo() {
    return data.filter(p => p.img.idUnderlined).map(p => ({ id: +p.id, number: p.img.number }));
}

//----------------- MAJUSCULES

// Occurrences de chaque lettre majuscule (A-Z) dans les name des images (ou "songs" : titres des chansons)
function capitalLetterCounts(source) {
    var texts = source == "songs" ? getAllSongs().map(s => s.title) : data.map(p => p.name);
    var counts = {};
    texts.join(" ").split("").forEach(c => {
        if (c != c.toLowerCase() && c == c.toUpperCase()) counts[c] = (counts[c] || 0) + 1;
    });
    return Object.keys(counts).sort().map(k => ({ letter: k, count: counts[k] }));
}
// Mots d'un name qui ne commencent pas par une majuscule
function nameWordsNotCapitalized() {
    return nameWords().filter(w => w[0] == w[0].toLowerCase());
}
// Lettres initiales de chaque name (ex. "Ambient Meditation Music" -> "AMM") pour chaque playlist
function nameInitials() {
    return data.map(p => ({ id: p.id, initials: p.name.split(" ").map(w => w[0]).join("") }));
}

//----------------- DECOUPAGE EN BLOCS DE 16 (grille pleine à chaque id multiple de 16)

// Bloc k = ids 16k .. 16k+15 (l'id 16k est l'"en-tête" à grille pleine ; bloc 0 = ids 1-15)
function blockOf(id, size) {
    return Math.floor(id / (size || 16));
}
function blockSummary(size) {
    size = size || 16;
    var blocks = {};
    data.forEach(p => {
        var b = blockOf(+p.id, size);
        (blocks[b] = blocks[b] || []).push(p);
    });
    return Object.keys(blocks).map(k => {
        var ps = blocks[k];
        var header = ps.find(p => (+p.id) % size == 0);
        var body = ps.filter(p => (+p.id) % size != 0);
        return {
            block: +k,
            firstId: +ps[0].id,
            headerGridColor: header ? header.img.grid.color : null,
            bodyGridColors: body.map(p => p.img.grid.color).distinct().join("|"),
            hats: body.map(p => p.img.picture.hat).distinct().length,
            humans: body.map(p => p.img.picture.human).join(""),
            snakeWords: body.map(p => snakeTokens(p).join(" ")).distinct().length,
            underlined: ps.filter(p => p.img.underlined).map(p => p.id).join(","),
            evenBits: body.filter(p => +p.id % 2 == 0).map(p => gridFilled(p) == 5 ? 1 : 0).join(""),
            oddPos: body.filter(p => +p.id % 2 == 1).map(p => gridCells(p).findIndex(c => c != "0").toString(16)).join(""),
            seriesLen: ps.map(p => p.songs.find(isNumberSeries).split("-").length).distinct().join("|"),
            bgHue: rgbToHsl(hexToRgb(ps[0].img.backgroundColor))[0]
        };
    });
}
// Symboles de la grille pleine de chaque bloc (en-tête) : une ligne de 16 chiffres
function blockHeaderSymbols(size) {
    size = size || 16;
    return data.filter(p => (+p.id) % size == 0).map(p => p.id + ":" + gridCells(p).join(""));
}

// Motif de grille d'un bloc (bits des ids pairs + positions des ids impairs) -> indice de motif ; suite des 64 blocs
function blockPatternSequence() {
    var patterns = {};
    var seq = blockSummary(16).filter(b => b.block < 64).map(b => {
        var key = b.evenBits + "/" + b.oddPos;
        if (!(key in patterns)) patterns[key] = Object.keys(patterns).length;
        return patterns[key];
    });
    return { patterns: patterns, sequence: seq.join(""), counts: getDistinctCounts(seq) };
}

//----------------- RECHERCHE D'ERREURS DE SAISIE (génère toCheck.txt)

// Renvoie { catégorie: [{ id, detail }] } avec les ids suspects
function findSuspects() {
    var res = {};
    var add = (cat, id, detail) => {
        var v = (corrections.verified || {})[cat]; // ids déjà vérifiés à la main (corrections.json) : ignorés
        if (v == "*" || (v && v.includes(+id))) return;
        (res[cat] = res[cat] || []).push({ id: +id, detail: detail });
    };

    // 1. img.number (haut gauche) : doit faire 10 chiffres
    data.forEach(p => {
        if (!/^\d{10}$/.test(p.img.number)) add("number", p.id, "lu \"" + p.img.number + "\" (" + p.img.number.length + " car.)");
    });
    // nombres identiques sur plusieurs ids
    var byNum = {};
    data.forEach(p => { (byNum[p.img.number] = byNum[p.img.number] || []).push(p.id); });
    Object.keys(byNum).filter(n => byNum[n].length > 1 && /^\d{10}$/.test(n)).forEach(n =>
        byNum[n].forEach(id => add("numberDuplicate", id, "même nombre " + n + " que ids " + byNum[n].join(",")))
    );

    // 2. grille : cases remplies inattendues
    data.forEach(p => {
        var f = gridFilled(p), n = +p.id;
        if (n % 16 == 0 && f != 16) add("gridFilled", p.id, "multiple de 16 : " + f + " cases remplies au lieu de 16");
        if (n % 16 != 0 && n % 2 == 0 && f == 1) add("gridFilled", p.id, "id pair avec 1 seule case (attendu 3 ou 5)");
        if (n % 16 != 0 && n % 2 == 1 && f != 1) add("gridFilled", p.id, "id impair avec " + f + " cases (attendu 1)");
        if (n % 16 != 0 && n % 2 == 1 && f == 1 && gridCells(p).findIndex(c => c != "0") > 7) add("gridFilled", p.id, "case unique hors positions 0-7");
    });
    // blocs dont le motif n'est pas un des 8 motifs attendus (comparaison sur ids pairs/impairs)
    var rows = blockSummary(16).filter(b => b.block < 64);
    var keyCount = {};
    rows.forEach(b => { var k = b.evenBits + "/" + b.oddPos; keyCount[k] = (keyCount[k] || 0) + 1; });
    rows.forEach(b => {
        var k = b.evenBits + "/" + b.oddPos;
        if (keyCount[k] < 4) add("blockPattern", b.firstId, "bloc " + b.block + " (ids " + (b.block * 16) + "-" + (b.block * 16 + 15) + ") motif rare " + k + " (seulement " + keyCount[k] + " bloc(s) ainsi)");
    });

    // 3. couleur de grille : id dont la couleur diffère du reste de son bloc
    var blocks = {};
    data.forEach(p => { if (+p.id % 16 != 0) (blocks[blockOf(+p.id)] = blocks[blockOf(+p.id)] || []).push(p); });
    Object.keys(blocks).forEach(b => {
        var counts = getDistinctCounts(blocks[b].map(p => p.img.grid.color));
        var majority = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0];
        blocks[b].forEach(p => { if (p.img.grid.color != majority) add("gridColor", p.id, p.img.grid.color + " au lieu de " + majority + " (couleur du reste du bloc)"); });
    });
    data.filter(p => +p.id % 16 == 0 && !["#00ff01", "#ffff00", "#fe0000", "#0000fe"].includes(p.img.grid.color))
        .forEach(p => add("gridColorHeader", p.id, "couleur d'en-tête atypique " + p.img.grid.color));

    // 4. snakeCode vide
    data.filter(p => snakeTokens(p).length == 0).forEach(p => add("snakeEmpty", p.id, "snakeCode vide"));
    // snakeCode : caractère rare (effectif <= 3) = possible erreur de lecture
    var freq = {};
    snakeCharFrequency().forEach(c => freq[c.value] = c.count);
    data.forEach(p => snakeTokens(p).forEach(c => { if (freq[c] <= 3) add("snakeRare", p.id, "caractère serpent \"" + c + "\" rare (" + freq[c] + " occurrence(s))"); }));

    // 5. séries chiffrées : longueur attendue selon l'id (8 jusqu'à 729, 7 jusqu'à 1009, 6 ensuite ; ids 1-based = index + 1)
    data.forEach((p, i) => {
        var len = p.songs.find(isNumberSeries).split("-").length;
        var expected = i <= 729 ? 8 : i <= 1009 ? 7 : 6;
        if (len != expected) add("seriesLength", p.id, "série de " + len + " nombres (attendu " + expected + ")");
    });

    // 6. name : mots uniques (probables erreurs d'OCR) ; minuscules
    var wc = getDistinctCounts(nameWords());
    data.forEach(p => {
        p.name.split(" ").forEach(w => {
            if (wc[w] == 1) add("nameRareWord", p.id, "mot unique \"" + w + "\" dans \"" + p.name + "\"");
        });
        if (!/Music$/.test(p.name)) add("nameNoMusic", p.id, "ne finit pas par Music : \"" + p.name + "\"");
    });

    // 7. nombres soulignés : écarts irréguliers sur la fin (régulier ~12,3)
    var ul = underlinedNumbers().map(u => u.id);
    ul.forEach((id, i) => {
        if (i > 6 && i < ul.length - 1) {
            var a = id - ul[i - 1], b = ul[i + 1] - id;
            if (a <= 10 || a >= 14 || b <= 10 || b >= 14) add("underlinedGap", id, "écart avec voisins soulignés : " + a + " puis " + b);
        }
    });
    return res;
}

// Écrit toCheck.txt à partir de findSuspects() (node analyzeScript.js writeToCheck)
function writeToCheck() {
    var s = findSuspects();
    var sections = [
        ["number", "PRIORITE HAUTE - Nombre en haut à gauche (img.number) : attendu 10 chiffres. Relire le nombre sur l'image et corriger (OCR Tesseract ancien)."],
        ["gridFilled", "PRIORITE HAUTE - Grille 4x4 : relire les cases remplies. Attendu : id impair = 1 case (position 0-7), id pair = 3 cases (ligne centrale) ou 5 cases (croix), multiple de 16 = 16 cases."],
        ["blockPattern", "PRIORITE HAUTE - Bloc de 16 ids dont le motif de grille ne correspond qu'à 2 blocs sur 64 (les autres motifs existent 8 fois chacun). Vérifier les grilles paires du bloc (3 ou 5 cases) : le motif attendu est 1110000/16207153."],
        ["gridColor", "PRIORITE MOYENNE - Couleur de fond de la grille différente du reste de son bloc de 16."],
        ["gridColorHeader", "PRIORITE MOYENNE - Couleur de grille d'un id multiple de 16 qui n'est ni vert, jaune, rouge ni bleu purs (vérifier si c'est une vraie couleur, par ex. noir)."],
        ["snakeEmpty", "PRIORITE MOYENNE - snakeCode vide (échec du script de décodage) : relire le code serpent sur l'image."],
        ["snakeRare", "PRIORITE BASSE - Caractère serpent n'apparaissant que 2 fois (peut être une vraie lettre rare ou une erreur de lecture)."],
        ["underlinedGap", "PRIORITE BASSE - Nombre souligné dont l'écart avec les voisins soulignés est irrégulier (attendu ~12 ; un souligné oublié ou en trop ?). Vérifier ces ids et leurs voisins 10-14 ids autour."],
        ["nameRareWord", "PRIORITE BASSE - Mot du titre (name) qui n'apparaît qu'une fois (vraie rareté ou faute d'OCR)."]
    ];
    var out = ["A VERIFIER (généré par analyzeScript.js writeToCheck)", "Les images 0001 à 0056 sont dans Miniatures/. Format : id - ce qu'il faut vérifier", ""];
    sections.forEach(sec => {
        var items = (s[sec[0]] || []).filter(x => !(sec[0] == "underlinedGap" && x.id == 727));
        if (!items.length) return;
        out.push("== " + sec[1] + " (" + items.length + ")");
        items.forEach(x => out.push(x.id + " - " + x.detail));
        out.push("");
    });
    require("fs").writeFileSync("toCheck.txt", out.join("\n"), "utf8");
    return "toCheck.txt écrit";
}

//----------------- TABLE CLI (node analyzeScript.js <nom> [args])
var CLI = {
    writeToCheck: () => writeToCheck(),
    findSuspects: () => findSuspects(),
    blockPatternSequence: () => blockPatternSequence(),
    blockSummary: (s) => blockSummary(s),
    blockHeaderSymbols: (s) => blockHeaderSymbols(s),
    capitalLetterCounts: (s) => capitalLetterCounts(s),
    nameWordsNotCapitalized: () => nameWordsNotCapitalized(),
    nameInitials: () => nameInitials(),
    gridBinary: () => gridBinary(),
    gridDecodeSimple: () => gridDecodeSimple(),
    gridSequences: () => gridSequences(),
    fullGridSymbols: () => fullGridSymbols(),
    underlinedNumbers: () => underlinedNumbers(),
    underlinedIdsDiffs: () => underlinedIdsDiffs(),
    snakeTokenIds: (n) => snakeTokenIds(n),
    gridColorRuns: () => gridColorRuns(),
    gridColorBlocks: () => gridColorBlocks(),
    underlinedDigitStats: () => underlinedDigitStats(),
    oddImgNumbers: () => oddImgNumbers(),
    idUnderlinedInfo: () => idUnderlinedInfo(),
    gridDistinctPerIdModulo: (m) => gridDistinctPerIdModulo(m),
    snakeDistinctPerIdModulo: (m) => snakeDistinctPerIdModulo(m),
    idsWithGridFilled: (n) => idsWithGridFilled(n),
    idsWithColoredGrid: () => idsWithColoredGrid(),
    snakeCharFrequency: () => snakeCharFrequency(),
    snakeWordsByFrequency: (f) => snakeWordsByFrequency(f),
    snakeWordCounts: () => snakeWordCounts(),
    snakeLengthCounts: () => snakeLengthCounts(),
    snakeCharByPosition: () => snakeCharByPosition(),
    snakeWordVsField: (p) => snakeWordVsField(p),
    snakeWordDeterminism: (p) => snakeWordDeterminism(p),
    nameWordCounts: (l) => nameWordCounts(l),
    nameLengthCounts: () => nameLengthCounts(),
    nameWordVsField: (w, p) => nameWordVsField(w, p),
    repeatedNamesVsField: (p) => repeatedNamesVsField(p),
    backgroundHueSeries: (s) => backgroundHueSeries(s),
    backgroundMaxStep: () => backgroundMaxStep(),
    squareColorStats: () => squareColorStats(),
    squareColorChannelLevels: () => squareColorChannelLevels(),
    backgroundVsSquares: (l) => backgroundVsSquares(l),
    gridFilledCounts: () => gridFilledCounts(),
    gridSymbolCounts: () => gridSymbolCounts(),
    gridPatternCounts: (l) => gridPatternCounts(l),
    gridCellHeatmap: (s) => gridCellHeatmap(s),
    gridDuplicateSymbols: () => gridDuplicateSymbols(),
    gridVsField: (p) => gridVsField(p),
    getUnderlinedNumbers: () => getUnderlinedNumbers(),
    getUnderlinedIds: () => getUnderlinedIds(),
    countSnakeChars: () => countSnakeChars(),
    getGridColors: () => getGridColors(),
    getCommonPictureIds: () => getCommonPictureIds(),
    cyhsCounts: () => cyhsCounts(),
    uniqueCyhs: () => uniqueCyhs(),
    gridColorVsCyhs: () => gridColorVsCyhs(),
    backgroundColorCounts: () => backgroundColorCounts(),
    pictureFieldCounts: (f) => pictureFieldCounts(f),
    getImgNumbers: () => getImgNumbers(),
    nameCounts: (l) => nameCounts().slice(0, l || 50),
    countFirstNames: (l) => countFirstNames(l),
    countLastNames: (l) => countLastNames(l),
    countVerbs: (l) => countVerbs(l),
    lastNameCountHistogram: () => lastNameCountHistogram(),
    lastNamesNot200: () => lastNamesNot200(),
    firstNamesOfLastName: (n) => firstNamesOfLastName(n),
    songCountsPerPlaylist: () => songCountsPerPlaylist(),
    seriesLengthCounts: () => seriesLengthCounts(),
    seriesNotFirst: () => seriesNotFirst(),
    seriesTrendCounts: () => seriesTrendCounts(),
    getSeriesOf: (id) => getSeriesOf(id),
    translateSnakeCodeOf: (id) => translateSnakeCodes([getPlaylist(id).img.snakeCode])
};

//----------------- UTILS

function getUnderlinedNumbers() {
    return data.filter(j => j.img.underlined).map(function(v) {
        return v.img.number;
    });
}

function getUnderlinedIds() {
    return data.filter(j => j.img.idUnderlined).map(function(v) {
        return v.id;
    });
}

function getSnakeChars() {
    var chars = [];
    data.forEach(function(j) {
        var snakeParts = j.img.snakeCode.split(" ");
        snakeParts.forEach(function(p) {
            if (p != "" && !chars.find(c => c == p)) {
                chars.push(p);
            }
        });
    });
    return chars.sort(function(a, b) {
        return a.length - b.length;
    });
}

function countSnakeChars() {
    var ret = {};
    data.forEach(function(d) {
        d.img.snakeCode.split(" ").forEach(function(c) {
            if (!ret[c] && c != "") {
                ret[c] = 0;
            }
            ret[c]++;
        });
    });
    return ret;
}

function getGridColors() {
    var ret = [];
    data.forEach(function(e) {
        if (!ret.find(c => c == e.img.grid.color)) {
            ret.push(e.img.grid.color);
        }
    });
    return ret;
}

function getCommonPictureIds() {
    var ret = [];
    data.forEach(function(j) {
        var photoInfo = j.img.picture.eye + "," + j.img.picture.hat + "," + j.img.picture.human + "," + j.img.picture.mouth;
        var theInfo = ret.find(p => p.code == photoInfo);
        if (!theInfo) {
            ret.push({ code: photoInfo, ids: [j.id] });
        } else {
            theInfo.ids.push(j.id);
        }
    });

    return ret.sort(function(a, b) {
        return parseInt(a.ids[0], 10) - parseInt(b.ids[0], 10);
    });
}

/*
 *	Array Override
 */
if (Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
Array.prototype.equals = function(array) {
    if (!array)
        return false;
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].equals(array[i]))
                return false;
        } else if (this[i] != array[i]) {
            return false;
        }
    }
    return true;
}
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

Array.prototype.distinct = function() {
    return [...new Set(this.map(obj => obj))];
}

Array.prototype.multiIndexOf = function(el) {
    var idxs = [];
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] === el) {
            idxs.unshift(i);
        }
    }
    return idxs;
};