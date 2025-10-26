const WebSocket = require("ws");

// Connect to server
const socket = new WebSocket("ws://localhost:8080/ws");

// Connection opened
socket.on("open", () => {
  console.log("✅ Connected");

  // Send a test message
  socket.send("Hello Server");

  // Keep Node process alive
  setInterval(() => {}, 1000); // dummy interval to keep event loop alive
});

// Messages from server
socket.on("message", (msg) => {
  console.log("📩 Message from server:", msg.toString());
});

// Connection closed
socket.on("close", () => {
  console.log("❌ Disconnected");
});

// Error handling
socket.on("error", (err) => {
  console.error("⚠️ WebSocket error:", err);
});
