const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));
const rooms = new Map();
const MAX_PEERS = 6;

io.on("connection", (socket) => {
  socket.on("join-room", ({ room }) => {
    room = String(room || "").trim().slice(0, 32);
    if (!room) return socket.emit("room-error", "Room code likho.");
    const members = rooms.get(room) || new Set();
    if (members.size >= MAX_PEERS) return socket.emit("room-error", "Is demo room mein maximum 6 log aa sakte hain.");
    socket.join(room);
    socket.data.room = room;
    socket.emit("room-joined", { peers: [...members] });
    members.add(socket.id);
    rooms.set(room, members);
    socket.to(room).emit("peer-joined", { peerId: socket.id });
    io.to(room).emit("room-count", members.size);
  });

  socket.on("signal", ({ to, data }) => {
    if (to && data) io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("leave-room", () => leave(socket));
  socket.on("disconnect", () => leave(socket));
});

function leave(socket) {
  const room = socket.data.room;
  if (!room) return;
  const members = rooms.get(room);
  if (members) {
    members.delete(socket.id);
    socket.to(room).emit("peer-left", { peerId: socket.id });
    io.to(room).emit("room-count", members.size);
    if (!members.size) rooms.delete(room);
  }
  socket.leave(room);
  socket.data.room = null;
}

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Rahul Mic Pro running on ${port}`));
