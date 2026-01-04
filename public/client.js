let room = location.pathname.replace("/", "") || "lobby";
let ws = connect(room);

const chat = document.getElementById("chat");
const input = document.getElementById("input");

function connect(roomName) {
  const socket = new WebSocket(
    (location.protocol === "https:" ? "wss://" : "ws://") +
    location.host + "/" + roomName
  );

  socket.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === "system") {
      add(`* ${msg.text}`, "system");
    } else {
      add(`<span class="nick">${msg.nick}</span>: ${msg.text}`);
    }
  };

  return socket;
}

function add(text, cls = "") {
  const div = document.createElement("div");
  div.className = cls;
  div.innerHTML = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function newRoom() {
  if (ws) ws.close();
  chat.innerHTML = "";

  room = Math.random().toString(36).substring(2, 8);
  history.pushState({}, "", "/" + room);
  ws = connect(room);

  add(`* created new room: /${room}`, "system");
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && input.value.trim()) {
    const value = input.value.trim();

    if (value === "/new") {
      newRoom();
    } else {
      ws.send(value);
    }

    input.value = "";
  }
});
