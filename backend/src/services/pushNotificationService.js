import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Validates whether a token string is a valid Expo push token format
 */
export function isValidExpoPushToken(token) {
  if (!token || typeof token !== "string") return false;
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

/**
 * Low-level sender to Expo Push Notification HTTP API
 * @param {Array<{ to: string, title: string, body: string, data?: object, sound?: string, channelId?: string, priority?: string }>} messages
 */
export async function sendExpoPushMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return { success: false, reason: "No messages" };

  // Filter only valid tokens
  const validMessages = messages.filter(m => isValidExpoPushToken(m.to));
  if (validMessages.length === 0) {
    return { success: false, reason: "No valid Expo push tokens found" };
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(validMessages)
    });

    const data = await response.json().catch(() => ({}));
    return { success: response.ok, data };
  } catch (err) {
    console.error("sendExpoPushMessages network error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send push notification to a policyholder by NIC or User document
 */
export async function sendPushToUser(userOrNic, { title, body, data = {} }) {
  try {
    let user = userOrNic;
    if (typeof userOrNic === "string") {
      user = await User.findOne({ nic: userOrNic.trim().toUpperCase() }).lean();
    }
    if (!user || !Array.isArray(user.pushTokens) || user.pushTokens.length === 0) {
      return { success: false, reason: "User has no registered push tokens" };
    }

    const messages = user.pushTokens
      .filter(isValidExpoPushToken)
      .map(token => ({
        to: token,
        sound: "default",
        title: title || "Sanasa Insurance",
        body: body || "",
        data: { ...data, timestamp: Date.now() },
        priority: "high",
        channelId: "default"
      }));

    if (messages.length === 0) return { success: false, reason: "No valid tokens" };

    return await sendExpoPushMessages(messages);
  } catch (err) {
    console.error("sendPushToUser error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send push notification to an agent by email, agentId or Agent document
 */
export async function sendPushToAgent(agentOrIdentifier, { title, body, data = {} }) {
  try {
    let agent = agentOrIdentifier;
    if (typeof agentOrIdentifier === "string") {
      agent = await Agent.findOne({
        $or: [
          { email: agentOrIdentifier.trim().toLowerCase() },
          { agentId: agentOrIdentifier.trim() },
          { name: agentOrIdentifier.trim() }
        ]
      }).lean();
    }
    if (!agent || !Array.isArray(agent.pushTokens) || agent.pushTokens.length === 0) {
      return { success: false, reason: "Agent has no registered push tokens" };
    }

    const messages = agent.pushTokens
      .filter(isValidExpoPushToken)
      .map(token => ({
        to: token,
        sound: "default",
        title: title || "Sanasa Agent Alert",
        body: body || "",
        data: { ...data, timestamp: Date.now() },
        priority: "high",
        channelId: "default"
      }));

    if (messages.length === 0) return { success: false, reason: "No valid tokens" };

    return await sendExpoPushMessages(messages);
  } catch (err) {
    console.error("sendPushToAgent error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches a push notification to both parties of a claim safely in background
 */
export function sendClaimPushSafe({ claim, userNic, agentEmail, title, body, data = {} }) {
  setImmediate(async () => {
    try {
      if (userNic) {
        await sendPushToUser(userNic, { title, body, data: { ...data, claimNumber: claim?.claimNumber } });
      }
      if (agentEmail) {
        await sendPushToAgent(agentEmail, { title, body, data: { ...data, claimNumber: claim?.claimNumber } });
      }
    } catch (err) {
      console.warn("sendClaimPushSafe warning:", err.message);
    }
  });
}
