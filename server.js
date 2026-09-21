const { createServer } = require("http");
const { Server } = require("socket.io");

const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const httpServer = createServer();
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow localhost or designated production URL
      if (!origin || origin === allowedOrigin || origin.startsWith("http://localhost:")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 1e6, // 1MB maximum payload size
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  // Join online presence
  socket.on("user:join", (userId) => {
    if (typeof userId === "string" && userId.length < 50) {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      io.emit("users:online", Array.from(onlineUsers.keys()));
    }
  });

  // Join chat room with validation
  socket.on("chat:join", (chatId) => {
    if (typeof chatId === "string" && chatId.length < 50) {
      socket.join(`chat:${chatId}`);
    }
  });

  socket.on("chat:leave", (chatId) => {
    if (typeof chatId === "string" && chatId.length < 50) {
      socket.leave(`chat:${chatId}`);
    }
  });

  // Broadcast message to room members
  socket.on("chat:message", (data) => {
    if (data && typeof data.chatId === "string" && data.message) {
      io.to(`chat:${data.chatId}`).emit("chat:message", {
        chatId: data.chatId,
        message: data.message,
      });
    }
  });

  socket.on("chat:typing", (data) => {
    if (data && typeof data.chatId === "string") {
      socket.to(`chat:${data.chatId}`).emit("chat:typing", {
        chatId: data.chatId,
        userId: socket.userId,
        userName: typeof data.userName === "string" ? data.userName.slice(0, 50) : "",
        isTyping: !!data.isTyping,
      });
    }
  });

  socket.on("chat:read", (data) => {
    if (data && typeof data.chatId === "string") {
      socket.to(`chat:${data.chatId}`).emit("chat:read", {
        chatId: data.chatId,
        readBy: socket.userId,
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("users:online", Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => console.log(`🛡️ Secure Socket.IO server running on port ${PORT}`));
