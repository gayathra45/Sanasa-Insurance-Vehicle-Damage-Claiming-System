import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export interface CurrentUserSession {
  userId: string;
  userType: "PolicyHolder" | "Agent" | "OfficeStaff" | "Admin";
  name: string;
  email: string;
  branch: string;
}

/**
 * Retrieve the active user from sessionStorage across all supported roles
 */
export function getActiveUserSession(): CurrentUserSession | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Policyholder
    const userStr = sessionStorage.getItem("logged_in_user");
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u) {
        return {
          userId: String(u.nic || u.email || u._id || "Policyholder"),
          userType: "PolicyHolder",
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.name || "Policyholder",
          email: u.email || "",
          branch: u.branch || "Galle"
        };
      }
    }

    // 2. Office Staff / Branch
    const staffStr = sessionStorage.getItem("logged_in_staff");
    if (staffStr) {
      const s = JSON.parse(staffStr);
      if (s) {
        return {
          userId: String(s.branch || s.email || s._id || "OfficeStaff"),
          userType: "OfficeStaff",
          name: s.name || `${s.branch || "Branch"} Office`,
          email: s.email || "",
          branch: s.branch || "Galle"
        };
      }
    }

    // 3. Agent
    const agentStr = sessionStorage.getItem("logged_in_agent");
    if (agentStr) {
      const a = JSON.parse(agentStr);
      if (a) {
        return {
          userId: String(a.agentId || a.email || a._id || "Agent"),
          userType: "Agent",
          name: a.name || "Agent",
          email: a.email || "",
          branch: a.branch || ""
        };
      }
    }

    // 4. Admin
    const adminStr = sessionStorage.getItem("logged_in_admin");
    if (adminStr) {
      const adm = JSON.parse(adminStr);
      if (adm) {
        return {
          userId: String(adm._id || adm.email || "Admin"),
          userType: "Admin",
          name: adm.name || "Administrator",
          email: adm.email || "",
          branch: "Head Office"
        };
      }
    }
  } catch (err) {
    console.warn("[Socket] Error parsing user session:", err);
  }

  return null;
}

/**
 * Get or initialize the singleton Socket.IO client instance
 */
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const session = getActiveUserSession();
  if (!session) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      auth: {
        userId: session.userId,
        userType: session.userType,
        name: session.name,
        email: session.email,
        branch: session.branch
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketInstance.on("connect", () => {
      console.log(`[Socket.IO] Connected to ${socketUrl} as ${session.name} (${session.userType})`);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Disconnected: ${reason}`);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn(`[Socket.IO] Connection error:`, err.message);
    });
  }

  return socketInstance;
}

/**
 * Disconnect socket on logout
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
