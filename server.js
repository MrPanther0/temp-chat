const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const publicDir = path.join(__dirname, "public");
const server = http.createServer((req, res) => {
  let filePath = path.join(publicDir, req.url);

  // SPA fallback: any room URL loads index.html
  if (req.url === "/" || !path.extname(req.url)) {
    filePath = path.join(publicDir, "index.html");
  }

  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css"
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

function broadcast(room, data) {
  if (!rooms.has(room)) return;
  for (const ws of rooms.get(room)) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

wss.on("connection", (ws, req) => {
  const room = req.url.replace("/", "") || "lobby";
  ws.room = room;
  ws.name = "anon";

  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);

  ws.on("message", message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // Set name (first message)
    if (data.type === "setname") {
      ws.name = data.name || "anon";
      broadcast(room, {
        type: "system",
        text: `${ws.name} joined`
      });
      return;
    }

    // Help command
    if (data.type === "command" && data.cmd === "help") {
      ws.send(JSON.stringify({
        type: "system",
        text:
          "Commands:\n" +
          "/help   show this help\n" +
          "/clear  clear your screen"
      }));
      return;
    }

    // Normal chat
    if (data.type === "chat") {
      broadcast(room, {
        type: "chat",
        name: ws.name,
        text: data.text
      });
    }
  });

  ws.on("close", () => {
    rooms.get(room)?.delete(ws);
    broadcast(room, {
      type: "system",
      text: `${ws.name} left`
    });
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
