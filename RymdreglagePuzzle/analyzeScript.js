var fs = require('fs');

var data = null;

fs.readFile('./everything.json', function read(err, data) {
    if (err) {
        throw err;
    }
    processFile(data.toString());
});

function processFile(json) {
    data = JSON.parse(json).playlists;

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

//----------------- TABLE CLI (node analyzeScript.js <nom> [args])
var CLI = {
    gridBinary: () => gridBinary(),
    gridDecodeSimple: () => gridDecodeSimple(),
    gridSequences: () => gridSequences(),
    fullGridSymbols: () => fullGridSymbols(),
    underlinedNumbers: () => underlinedNumbers(),
    underlinedIdsDiffs: () => underlinedIdsDiffs(),
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