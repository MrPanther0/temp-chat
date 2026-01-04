const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const publicDir = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  let filePath = path.join(publicDir, req.url);

  // If requesting root or a room, serve index.html
  if (req.url === "/" || !path.extname(req.url)) {
    filePath = path.join(publicDir, "index.html");
  }

  const ext = path.extname(filePath);
  const type = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css"
  }[ext] || "text/plain";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

function randomNick() {
  return "anon" + Math.floor(Math.random() * 9999);
}

function broadcast(room, msg) {
  if (!rooms.has(room)) return;
  for (const ws of rooms.get(room)) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

wss.on("connection", (ws, req) => {
  const room = req.url.replace("/", "") || "lobby";
  ws.nick = randomNick();

  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);

  broadcast(room, { type: "system", text: `${ws.nick} joined` });

  ws.on("message", msg => {
    msg = msg.toString().trim();
    broadcast(room, { type: "chat", nick: ws.nick, text: msg });
  });

  ws.on("close", () => {
    rooms.get(room)?.delete(ws);
    broadcast(room, { type: "system", text: `${ws.nick} left` });
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
