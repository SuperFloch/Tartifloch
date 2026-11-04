// Mini serveur local : sert le dossier puzzle et enregistre les positions dans positions.json.
// Usage : node server.js [port=8765]  puis ouvrir http://localhost:8765
const http = require("http"), fs = require("fs"), path = require("path");
const PORT = +process.argv[2] || 8765, FILE = path.join(__dirname, "positions.json");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json" };

http.createServer((req, res) => {
    if (req.url === "/api/positions") {
        if (req.method === "GET") {
            if (!fs.existsSync(FILE)) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(fs.readFileSync(FILE));
        }
        if (req.method === "POST") {
            let body = "";
            req.on("data", d => (body += d));
            req.on("end", () => {
                try { JSON.parse(body); fs.writeFileSync(FILE, body); res.writeHead(200); res.end("ok"); }
                catch (e) { res.writeHead(400); res.end("json invalide"); }
            });
            return;
        }
    }
    const name = req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0].slice(1));
    const file = path.join(__dirname, name);
    if (path.dirname(file) !== __dirname || !fs.existsSync(file)) { res.writeHead(404); return res.end("introuvable"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "text/plain" });
    res.end(fs.readFileSync(file));
}).listen(PORT, "127.0.0.1", () => console.log("Puzzle : http://localhost:" + PORT));
