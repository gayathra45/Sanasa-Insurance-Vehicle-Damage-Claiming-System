import { Server } from "socket.io";
import Conversation from "../models/conversation.model.js";
import Claim from "../models/claim.model.js";

let io = null;

/**
 * Initialize Socket.IO with HTTP server
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // Authentication & Session Middleware
  io.use((socket, next) => {
    try {
      const auth = socket.handshake.auth || {};
      const query = socket.handshake.query || {};

      const userId = auth.userId || query.userId;
      const userType = auth.userType || query.userType;
      const name = auth.name || query.name || "";
      const email = auth.email || query.email || "";
      const branch = auth.branch || query.branch || "";

      if (!userId || !userType) {
        console.warn("[Socket.IO] Connection rejected: Missing userId or userType in handshake");
        return next(new Error("Authentication failed: Missing userId or userType"));
      }

      // Attach user identity to socket instance
      socket.user = {
        userId: String(userId).trim(),
        userType: String(userType).trim(),
        name: String(name).trim(),
        email: String(email).trim(),
        branch: String(branch).trim()
      };

      return next();
    } catch (err) {
      console.error("[Socket.IO] Auth middleware error:", err.message);
      return next(new Error("Socket authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, userType, name } = socket.user || {};
    const userRoom = `user:${userType}:${userId}`;
    socket.join(userRoom);
    console.log(`[Socket.IO] Client connected: ${name || userId} (${userType}) -> joined room ${userRoom}`);

    // Join claim conversation room with server-side authorization check
    socket.on("join:conversation", async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        // Fetch conversation and verify access
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Check if user is participant or has claim-level access
        const isParticipant = (conv.participants || []).some(
          (p) => String(p.userId) === String(userId) || p.email === socket.user.email
        );

        let hasAccess = isParticipant;

        // If not explicit participant, check if Admin or Branch staff for this claim
        if (!hasAccess && (userType === "Admin" || userType === "OfficeStaff")) {
          const claim = await Claim.findOne({ claimNumber: conv.claimNumber }).lean();
          if (claim) {
            if (userType === "Admin") hasAccess = true;
            if (userType === "OfficeStaff" && (!socket.user.branch || claim.branch === socket.user.branch)) {
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          console.warn(`[Socket.IO] Denied join conversation: User ${userId} unauthorized for conv ${conversationId}`);
          socket.emit("error", { message: "Access denied to this conversation" });
          return;
        }

        const convRoom = `conversation:${conversationId}`;
        socket.join(convRoom);
        console.log(`[Socket.IO] User ${userId} joined room ${convRoom}`);
      } catch (err) {
        console.error("[Socket.IO] join:conversation error:", err.message);
      }
    });

    // Leave conversation room
    socket.on("leave:conversation", ({ conversationId }) => {
      if (conversationId) {
        const convRoom = `conversation:${conversationId}`;
        socket.leave(convRoom);
        console.log(`[Socket.IO] User ${userId} left room ${convRoom}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${userId} (${reason})`);
    });
  });

  return io;
}

/**
 * Access the initialized Socket.IO instance
 */
export function getIO() {
  return io;
}

/**
 * Broadcast event to all sockets in a conversation room
 */
export function emitToConversation(conversationId, event, data) {
  if (!io) return;
  const convRoom = `conversation:${conversationId}`;
  io.to(convRoom).emit(event, data);
}

/**
 * Emit event to a specific user's personal room
 */
export function emitToUser(userType, userId, event, data) {
  if (!io) return;
  const userRoom = `user:${userType}:${userId}`;
  io.to(userRoom).emit(event, data);
}

/**
 * Emit updated chat unread count to a specific user
 */
export function emitChatUnreadCount(userType, userId, unreadCount) {
  if (!io) return;
  emitToUser(userType, userId, "chat:unread-count", { unreadCount });
}

/**
 * Emit in-app notification to a specific user
 */
export function emitNotification(userType, userId, notification) {
  if (!io) return;
  emitToUser(userType, userId, "notification:new", notification);
}

/**
 * Emit updated notification unread count to a specific user
 */
export function emitNotificationUnreadCount(userType, userId, unreadCount) {
  if (!io) return;
  emitToUser(userType, userId, "notification:unread-count", { unreadCount });
}
