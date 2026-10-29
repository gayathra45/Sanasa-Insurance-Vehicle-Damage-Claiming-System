import AgentActivity from "../models/agent_activity.model.js";
import LoginActivity from "../models/login_activity.model.js";
import User from "../models/user.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Agent from "../models/agent.model.js";
import Admin from "../models/admin.model.js";

/**
 * Extract client IP, device, browser, and OS from express request
 */
export function getClientInfo(req) {
  if (!req) {
    return { ip: "127.0.0.1", device: "Web Browser", browser: "Chrome", os: "Windows" };
  }

  const rawIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
  const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim().replace("::ffff:", "") : "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Web Browser";

  let device = "Desktop (Web)";
  if (/mobile/i.test(userAgent)) device = "Mobile Web";
  if (/android/i.test(userAgent)) device = "Android Mobile";
  if (/iphone|ipad|ipod/i.test(userAgent)) device = "iOS Mobile";
  if (/expo|okhttp/i.test(userAgent)) device = "Sanasa Mobile App";

  let browser = "Web Browser";
  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = "Google Chrome";
  else if (/edg/i.test(userAgent)) browser = "Microsoft Edge";
  else if (/firefox/i.test(userAgent)) browser = "Mozilla Firefox";
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Apple Safari";
  else if (/okhttp|expo/i.test(userAgent)) browser = "Mobile App API";

  let os = "Windows";
  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
  else if (/linux/i.test(userAgent)) os = "Linux";

  return { ip, device, browser, os, userAgent };
}

/**
 * Log login activity and update user record
 */
export async function logLoginActivity({
  req,
  userType,
  userId,
  userName = "",
  userEmail = "",
  userNic = "",
  branch = "General",
  action = "Login",
  status = "Success",
  details = ""
}) {
  try {
    const client = getClientInfo(req);
    const emailClean = (userEmail || "").trim().toLowerCase();
    const nicClean = (userNic || "").trim();

    // 1. Create audit record
    const log = await LoginActivity.create({
      userType,
      userId,
      userName: userName.trim(),
      userEmail: emailClean,
      userNic: nicClean,
      branch: branch || "Head Office",
      action,
      ipAddress: client.ip,
      device: client.device,
      browser: client.browser,
      os: client.os,
      status,
      details: details || `${action} from ${client.device} (${client.browser} on ${client.os})`,
      createdAt: new Date()
    });

    // 2. Update last login on model
    if (status === "Success") {
      const updatePayload = {
        lastLoginAt: new Date(),
        lastLoginIp: client.ip,
        lastLoginDevice: `${client.device} - ${client.browser}`
      };

      if (userType === "PolicyHolder") {
        await User.findByIdAndUpdate(userId, {
          $set: updatePayload,
          $inc: { loginCount: 1 }
        });
      } else if (userType === "OfficeStaff") {
        await OfficeStaff.findByIdAndUpdate(userId, {
          $set: updatePayload,
          $inc: { loginCount: 1 }
        });
      } else if (userType === "Agent") {
        await Agent.findByIdAndUpdate(userId, {
          $set: updatePayload,
          $inc: { loginCount: 1 }
        });
      } else if (userType === "Admin") {
        await Admin.findByIdAndUpdate(userId, {
          $set: updatePayload,
          $inc: { loginCount: 1 }
        });
      }
    }

    return log;
  } catch (err) {
    console.error("Failed to record login activity:", err);
  }
}

/**
 * Legacy Agent Activity Logger
 */
export async function logAgentActivity(agentEmail, action, device, details = "") {
  try {
    if (!agentEmail) return;
    await AgentActivity.create({
      agentEmail: agentEmail.trim().toLowerCase(),
      action,
      device,
      details
    });
  } catch (err) {
    console.error("Failed to log agent activity:", err);
  }
}
