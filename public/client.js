const room = location.pathname.replace("/", "") || "lobby";

/**
 * Backend resolution:
 * - Render / Vercel: CHAT_BACKEND is injected
 * - Railway: fallback to same host
 */
const BACKEND = window.CHAT_BACKEND || location.host;


// Username color hashing
function nameColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "#6cf", "#f66", "#6f6", "#fc6",
    "#c6f", "#f6c", "#66f", "#6ff"
  ];

  return colors[Math.abs(hash) % colors.length];
}

// Prompt for name (temporary, memory-only)
const name = prompt("Enter your name (temporary):")?.trim() || "anon";

// WebSocket connection (ALWAYS to Railway backend)
const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") +
  BACKEND + "/" + room
);

const chat = document.getElementById("chat");
const input = document.getElementById("input");

function add(text, cls = "") {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Send name once connected
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "setname",
    name: name.substring(0, 20)
  }));
};

// Receive messages
ws.onmessage = e => {
  const msg = JSON.parse(e.data);

  switch (msg.type) {
    case "system":
      add(`* ${msg.text}`, "system");
      break;

    case "chat":
      const span = document.createElement("span");
      span.textContent = msg.name;
      span.style.color = nameColor(msg.name);

      const div = document.createElement("div");
      div.appendChild(span);
      div.appendChild(document.createTextNode(`: ${msg.text}`));

      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
      break;
  }
};

// Input handling
input.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !input.value.trim()) return;

  const value = input.value.trim();

  if (value === "/clear") {
    chat.innerHTML = "";
  } else if (value === "/help") {
    ws.send(JSON.stringify({ type: "command", cmd: "help" }));
  } else {
    ws.send(JSON.stringify({
      type: "chat",
      text: value
    }));
  }

  input.value = "";
});

// Always keep focus (terminal-like UX)
function focusInput() {
  input.focus();
}
window.addEventListener("load", focusInput);
document.addEventListener("click", focusInput);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) focusInput();
});

