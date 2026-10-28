import express from "express";
import Notification from "../models/notification.model.js";
import { emitNotificationUnreadCount } from "../utils/socket.js";
import { calculateNotificationUnreadCount } from "./claim_chat.routes.js";

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch notifications for user with pagination
 */
router.get("/", async (req, res) => {
  try {
    const { userId, userType, page = 1, limit = 20 } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: String(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments({ userId: String(userId) }),
      calculateNotificationUnreadCount(userId)
    ]);

    return res.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get("/unread-count", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    const count = await calculateNotificationUnreadCount(userId);
    return res.json({ success: true, count });
  } catch (err) {
    console.error("GET unread-count error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userType } = req.body;

    const notif = await Notification.findById(id);
    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();

    const targetUserId = notif.userId;
    const targetUserType = notif.userType;
    const unreadCount = await calculateNotificationUnreadCount(targetUserId);

    if (targetUserType) {
      emitNotificationUnreadCount(targetUserType, targetUserId, unreadCount);
    }

    return res.json({ success: true, notification: notif, unreadCount });
  } catch (err) {
    console.error("PATCH notification read error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for a user
 */
router.patch("/read-all", async (req, res) => {
  try {
    const { userId, userType } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    await Notification.updateMany(
      { userId: String(userId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    if (userType) {
      emitNotificationUnreadCount(userType, userId, 0);
    }

    return res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    console.error("PATCH read-all error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
