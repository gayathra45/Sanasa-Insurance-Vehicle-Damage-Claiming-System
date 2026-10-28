import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import Claim from "../models/claim.model.js";
import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Admin from "../models/admin.model.js";
import {
  emitToConversation,
  emitToUser,
  emitChatUnreadCount,
  emitNotification,
  emitNotificationUnreadCount
} from "../utils/socket.js";
import { queueChatEmailNotification } from "../utils/chatEmailService.js";

const router = express.Router();

/**
 * Helper to calculate total unread chat messages for a specific user
 */
export async function calculateChatUnreadCount(userId, userType) {
  try {
    // Find all conversations where this user is a participant
    const conversations = await Conversation.find({
      "participants.userId": String(userId)
    }).select("_id participants").lean();

    if (!conversations || conversations.length === 0) return 0;

    let totalUnread = 0;

    for (const conv of conversations) {
      const part = (conv.participants || []).find(
        (p) => String(p.userId) === String(userId)
      );
      const lastReadAt = part?.lastReadAt ? new Date(part.lastReadAt) : new Date(0);

      // Count messages sent by others after lastReadAt
      const unreadInConv = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: String(userId) },
        createdAt: { $gt: lastReadAt }
      });

      totalUnread += unreadInConv;
    }

    return totalUnread;
  } catch (err) {
    console.error("calculateChatUnreadCount error:", err.message);
    return 0;
  }
}

/**
 * Helper to calculate total unread in-app notifications for a user
 */
export async function calculateNotificationUnreadCount(userId) {
  try {
    return await Notification.countDocuments({
      userId: String(userId),
      isRead: false
    });
  } catch (err) {
    console.error("calculateNotificationUnreadCount error:", err.message);
    return 0;
  }
}

/**
 * GET /api/claim-chat/claims
 * Returns claims accessible to the user
 */
router.get("/claims", async (req, res) => {
  try {
    const { userId, userType, branch } = req.query;
    if (!userId || !userType) {
      return res.status(400).json({ success: false, message: "Missing userId or userType" });
    }

    let filter = {};
    if (userType === "PolicyHolder") {
      filter = { userNic: new RegExp(`^${String(userId).trim()}$`, "i") };
    } else if (userType === "Agent") {
      // Find agent record to get all possible identifiers (agentId, email, name, _id)
      const agentDoc = await Agent.findOne({
        $or: [
          { agentId: String(userId) },
          { email: String(userId) },
          { name: String(userId) },
          { _id: mongoose.isValidObjectId(userId) ? userId : null }
        ]
      }).lean();

      const identifiers = [String(userId)];
      if (agentDoc?.email) identifiers.push(agentDoc.email);
      if (agentDoc?.name) identifiers.push(agentDoc.name);
      if (agentDoc?.agentId) identifiers.push(agentDoc.agentId);

      filter = { assignedAgent: { $in: identifiers } };
    } else if (userType === "OfficeStaff") {
      const cleanBranch = (branch || "").replace(/ Branch$/i, "").trim();
      if (cleanBranch) {
        filter = {
          branch: { $regex: new RegExp(`^${cleanBranch}`, "i") }
        };
      }
    } else if (userType === "Admin") {
      // Admins can access all claims
      filter = {};
    }

    let claims = await Claim.find(filter)
      .select("claimNumber vehiclePlate incidentDate status branch assignedAgent userNic")
      .sort({ createdAt: -1 })
      .lean();

    // If no claims found for specific filter, fallback to returning recent claims so staff/agents can always communicate
    if (claims.length === 0 && (userType === "OfficeStaff" || userType === "Admin" || userType === "Agent")) {
      claims = await Claim.find()
        .select("claimNumber vehiclePlate incidentDate status branch assignedAgent userNic")
        .sort({ createdAt: -1 })
        .limit(25)
        .lean();
    }

    return res.json({ success: true, claims });
  } catch (err) {
    console.error("GET /api/claim-chat/claims error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/claim-chat/directory
 * Returns branches and agents directory for direct communication
 */
router.get("/directory", async (req, res) => {
  try {
    const staffDocs = await OfficeStaff.find()
      .select("branch email")
      .sort({ branch: 1 })
      .lean();

    const agentDocs = await Agent.find()
      .select("name email branch agentId")
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      branches: staffDocs.map((b) => ({
        id: b.branch || String(b._id),
        name: b.branch?.includes("Branch") ? b.branch : `${b.branch} Branch`,
        branch: b.branch,
        email: b.email,
        role: "Branch Officer"
      })),
      agents: agentDocs.map((a) => ({
        id: a.agentId || a.email || String(a._id),
        name: a.name,
        email: a.email,
        branch: a.branch,
        agentId: a.agentId,
        role: "Field Agent"
      }))
    });
  } catch (err) {
    console.error("GET /api/claim-chat/directory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/claim-chat/claims/:claimNumber/recipients
 * Returns eligible dynamic recipients for a claim based on user role and permissions
 */
router.get("/claims/:claimNumber/recipients", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const { userId, userType } = req.query;

    const claim = await Claim.findOne({ claimNumber }).lean();
    if (!claim) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    // 1. Fetch Policyholder
    const policyholder = await User.findOne({ nic: claim.userNic })
      .select("firstName lastName nic email mobile branch")
      .lean();

    // 2. Fetch Assigned Agent (if any)
    let agent = null;
    if (claim.assignedAgent) {
      agent = await Agent.findOne({
        $or: [
          { agentId: claim.assignedAgent },
          { email: claim.assignedAgent },
          { name: claim.assignedAgent },
          { _id: mongoose.isValidObjectId(claim.assignedAgent) ? claim.assignedAgent : null }
        ]
      })
        .select("agentId name email phone branch")
        .lean();
    }

    // 3. Fetch Branch Office Staff
    let branchStaff = null;
    if (claim.branch) {
      const cleanBranch = claim.branch.replace(/ Branch$/i, "").trim();
      branchStaff = await OfficeStaff.findOne({
        $or: [
          { branch: { $regex: new RegExp(`^${cleanBranch}`, "i") } },
          { branch: claim.branch }
        ]
      })
        .select("name email mobile branch managerName managerEmail")
        .lean();
    }

    // Fallback: If no staff found for this specific branch, find any active branch office staff
    if (!branchStaff) {
      branchStaff = await OfficeStaff.findOne()
        .select("name email mobile branch managerName managerEmail")
        .lean();
    }

    // 4. Fetch Primary Admin
    const admin = await Admin.findOne({ status: "Approved" })
      .select("name email mobile")
      .lean();

    const eligibleRecipients = [];

    // Role-specific eligible recipient logic
    if (userType === "PolicyHolder") {
      // Can talk to Assigned Agent and Branch Office Staff
      if (agent) {
        eligibleRecipients.push({
          userId: agent.agentId || String(agent._id),
          userType: "Agent",
          name: agent.name,
          email: agent.email,
          role: "Assigned Agent",
          branch: agent.branch || claim.branch,
          badgeColor: "bg-emerald-100 text-emerald-800"
        });
      }
      if (branchStaff) {
        eligibleRecipients.push({
          userId: branchStaff.branch || String(branchStaff._id),
          userType: "OfficeStaff",
          name: `${branchStaff.branch} Branch Office`,
          email: branchStaff.email,
          role: "Branch Officer",
          branch: branchStaff.branch,
          badgeColor: "bg-blue-100 text-blue-800"
        });
      }
    } else if (userType === "Agent") {
      // Can talk to Policyholder and Branch Office Staff
      if (policyholder) {
        eligibleRecipients.push({
          userId: policyholder.nic,
          userType: "PolicyHolder",
          name: `${policyholder.firstName} ${policyholder.lastName}`,
          email: policyholder.email,
          role: "Policyholder",
          branch: policyholder.branch || claim.branch,
          badgeColor: "bg-indigo-100 text-indigo-800"
        });
      }
      if (branchStaff) {
        eligibleRecipients.push({
          userId: branchStaff.branch || String(branchStaff._id),
          userType: "OfficeStaff",
          name: `${branchStaff.branch} Branch Office`,
          email: branchStaff.email,
          role: "Branch Officer",
          branch: branchStaff.branch,
          badgeColor: "bg-blue-100 text-blue-800"
        });
      }
    } else if (userType === "OfficeStaff") {
      // Branch can talk to Policyholder, Agent, and Admin
      if (policyholder) {
        eligibleRecipients.push({
          userId: policyholder.nic,
          userType: "PolicyHolder",
          name: `${policyholder.firstName} ${policyholder.lastName}`,
          email: policyholder.email,
          role: "Policyholder",
          branch: policyholder.branch || claim.branch,
          badgeColor: "bg-indigo-100 text-indigo-800"
        });
      }
      if (agent) {
        eligibleRecipients.push({
          userId: agent.agentId || String(agent._id),
          userType: "Agent",
          name: agent.name,
          email: agent.email,
          role: "Assigned Agent",
          branch: agent.branch || claim.branch,
          badgeColor: "bg-emerald-100 text-emerald-800"
        });
      }
      if (admin) {
        eligibleRecipients.push({
          userId: String(admin._id),
          userType: "Admin",
          name: admin.name || "Head Office Claims Admin",
          email: admin.email,
          role: "Administrator",
          branch: "Head Office",
          badgeColor: "bg-purple-100 text-purple-800"
        });
      }
    } else if (userType === "Admin") {
      // Admin can talk to all participants
      if (policyholder) {
        eligibleRecipients.push({
          userId: policyholder.nic,
          userType: "PolicyHolder",
          name: `${policyholder.firstName} ${policyholder.lastName}`,
          email: policyholder.email,
          role: "Policyholder",
          branch: policyholder.branch || claim.branch,
          badgeColor: "bg-indigo-100 text-indigo-800"
        });
      }
      if (agent) {
        eligibleRecipients.push({
          userId: agent.agentId || String(agent._id),
          userType: "Agent",
          name: agent.name,
          email: agent.email,
          role: "Assigned Agent",
          branch: agent.branch || claim.branch,
          badgeColor: "bg-emerald-100 text-emerald-800"
        });
      }
      if (branchStaff) {
        eligibleRecipients.push({
          userId: branchStaff.branch || String(branchStaff._id),
          userType: "OfficeStaff",
          name: `${branchStaff.branch} Branch Office`,
          email: branchStaff.email,
          role: "Branch Officer",
          branch: branchStaff.branch,
          badgeColor: "bg-blue-100 text-blue-800"
        });
      }
    }

    // If no specific match, ensure at least one fallback recipient is available so communication is never blocked
    if (eligibleRecipients.length === 0) {
      if (admin) {
        eligibleRecipients.push({
          userId: String(admin._id),
          userType: "Admin",
          name: admin.name || "Head Office Claims Admin",
          email: admin.email,
          role: "Administrator",
          branch: "Head Office",
          badgeColor: "bg-purple-100 text-purple-800"
        });
      }
      if (branchStaff && userType !== "OfficeStaff") {
        eligibleRecipients.push({
          userId: branchStaff.branch || String(branchStaff._id),
          userType: "OfficeStaff",
          name: `${branchStaff.branch} Branch Office`,
          email: branchStaff.email,
          role: "Branch Officer",
          branch: branchStaff.branch,
          badgeColor: "bg-blue-100 text-blue-800"
        });
      }
    }

    return res.json({
      success: true,
      claim: {
        claimNumber: claim.claimNumber,
        vehiclePlate: claim.vehiclePlate,
        status: claim.status,
        branch: claim.branch
      },
      recipients: eligibleRecipients
    });
  } catch (err) {
    console.error("GET /api/claim-chat/claims/:claimNumber/recipients error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/claim-chat/conversations
 * Fetch all conversations for the authenticated user with unread counts
 */
router.get("/conversations", async (req, res) => {
  try {
    const { userId, userType } = req.query;
    if (!userId || !userType) {
      return res.status(400).json({ success: false, message: "Missing userId or userType" });
    }

    const conversations = await Conversation.find({
      "participants.userId": String(userId)
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Augment with unread count per conversation for this user
    const augmented = await Promise.all(
      conversations.map(async (conv) => {
        const part = (conv.participants || []).find(
          (p) => String(p.userId) === String(userId)
        );
        const lastReadAt = part?.lastReadAt ? new Date(part.lastReadAt) : new Date(0);

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: String(userId) },
          createdAt: { $gt: lastReadAt }
        });

        // Determine the other participant name for direct chat
        const otherParticipant = (conv.participants || []).find(
          (p) => String(p.userId) !== String(userId)
        );

        return {
          ...conv,
          unreadCount,
          otherParticipant: otherParticipant || null
        };
      })
    );

    return res.json({ success: true, conversations: augmented });
  } catch (err) {
    console.error("GET /api/claim-chat/conversations error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/claim-chat/conversations
 * Create or retrieve an existing conversation for claim + target recipient
 */
router.post("/conversations", async (req, res) => {
  try {
    const { claimNumber, sender, recipient, type = "direct" } = req.body;

    if (!claimNumber || !sender?.userId || (!recipient?.userId && type === "direct")) {
      return res.status(400).json({ success: false, message: "Missing required conversation fields" });
    }

    const claim = await Claim.findOne({ claimNumber }).lean();
    if (!claim) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    let conversation = null;

    if (type === "direct") {
      // Find existing direct conversation between sender and recipient for this claim
      conversation = await Conversation.findOne({
        claimNumber,
        type: "direct",
        $and: [
          { "participants.userId": String(sender.userId) },
          { "participants.userId": String(recipient.userId) }
        ]
      });

      if (!conversation) {
        conversation = await Conversation.create({
          claimId: claim._id,
          claimNumber,
          vehiclePlate: claim.vehiclePlate || "",
          type: "direct",
          participants: [
            {
              userId: String(sender.userId),
              userType: sender.userType,
              name: sender.name,
              email: sender.email || "",
              role: sender.role || sender.userType,
              branch: sender.branch || claim.branch,
              lastReadAt: new Date()
            },
            {
              userId: String(recipient.userId),
              userType: recipient.userType,
              name: recipient.name,
              email: recipient.email || "",
              role: recipient.role || recipient.userType,
              branch: recipient.branch || claim.branch,
              lastReadAt: new Date(0)
            }
          ],
          lastMessage: {
            text: "Conversation started",
            senderId: String(sender.userId),
            senderType: sender.userType,
            senderName: sender.name,
            sentAt: new Date()
          }
        });
      }
    } else {
      // Group conversation for this claim
      conversation = await Conversation.findOne({ claimNumber, type: "group" });
      if (!conversation) {
        conversation = await Conversation.create({
          claimId: claim._id,
          claimNumber,
          vehiclePlate: claim.vehiclePlate || "",
          type: "group",
          participants: [
            {
              userId: String(sender.userId),
              userType: sender.userType,
              name: sender.name,
              email: sender.email || "",
              role: sender.role || sender.userType,
              branch: sender.branch || claim.branch,
              lastReadAt: new Date()
            }
          ],
          lastMessage: {
            text: "Claim group conversation started",
            senderId: String(sender.userId),
            senderType: sender.userType,
            senderName: sender.name,
            sentAt: new Date()
          }
        });
      }
    }

    return res.status(200).json({ success: true, conversation });
  } catch (err) {
    console.error("POST /api/claim-chat/conversations error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/claim-chat/conversations/:conversationId/messages
 * Fetch message history for a conversation
 */
router.get("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    return res.json({ success: true, messages, conversation });
  } catch (err) {
    console.error("GET messages error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/claim-chat/conversations/:conversationId/messages
 * Send message: persist -> socket dispatch -> in-app notification -> email queue
 */
router.post("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const {
      senderId,
      senderType,
      senderName,
      senderEmail,
      senderRole,
      text,
      attachments = [],
      idempotencyKey
    } = req.body;

    if (!senderId || !senderType || !text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Missing required message parameters" });
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await Message.findOne({ idempotencyKey }).lean();
      if (existing) {
        return res.json({ success: true, message: existing, duplicate: true });
      }
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Fetch claim status for email context
    const claim = await Claim.findOne({ claimNumber: conversation.claimNumber })
      .select("status branch")
      .lean();

    // 1. Identify recipient(s)
    const otherParticipants = (conversation.participants || []).filter(
      (p) => String(p.userId) !== String(senderId)
    );

    const primaryRecipient = otherParticipants[0] || null;

    // 2. Persist Message to Database
    const newMessage = await Message.create({
      conversationId: conversation._id,
      claimNumber: conversation.claimNumber,
      senderId: String(senderId),
      senderType,
      senderName,
      senderEmail: senderEmail || "",
      senderRole: senderRole || senderType,
      recipientId: primaryRecipient ? String(primaryRecipient.userId) : "",
      recipientType: primaryRecipient?.userType || "",
      recipientName: primaryRecipient?.name || "",
      recipientEmail: primaryRecipient?.email || "",
      text: text.trim(),
      attachments,
      readBy: [
        {
          userId: String(senderId),
          userType: senderType,
          readAt: new Date()
        }
      ],
      idempotencyKey: idempotencyKey || null
    });

    // 3. Update Conversation Last Message & timestamp
    conversation.lastMessage = {
      text: text.trim(),
      senderId: String(senderId),
      senderType,
      senderName,
      sentAt: newMessage.createdAt
    };

    // Update sender's lastReadAt
    const senderPart = conversation.participants.find(
      (p) => String(p.userId) === String(senderId)
    );
    if (senderPart) {
      senderPart.lastReadAt = new Date();
    }
    await conversation.save();

    const plainMessage = newMessage.toObject();

    // 4. Publish real-time event to conversation room
    emitToConversation(conversationId, "message:new", {
      message: plainMessage,
      conversationId
    });

    // 5. For each recipient: update unread counts, trigger in-app notification, queue email
    for (const recipient of otherParticipants) {
      const recId = String(recipient.userId);
      const recType = recipient.userType;

      // Update recipient's chat unread count in real-time
      const newChatUnread = await calculateChatUnreadCount(recId, recType);
      emitChatUnreadCount(recType, recId, newChatUnread);

      // Create persistent in-app notification
      try {
        const notif = await Notification.create({
          userId: recId,
          userType: recType,
          userEmail: recipient.email || "",
          title: `New message on Claim ${conversation.claimNumber}`,
          body: `${senderName}: "${text.trim().slice(0, 70)}${text.trim().length > 70 ? "..." : ""}"`,
          type: "chat_message",
          claimNumber: conversation.claimNumber,
          conversationId: conversation._id,
          actionUrl: `/claim-chat?conversationId=${conversation._id}`
        });

        // Emit real-time notification to recipient
        emitNotification(recType, recId, notif);
        const newNotifUnread = await calculateNotificationUnreadCount(recId);
        emitNotificationUnreadCount(recType, recId, newNotifUnread);
      } catch (notifErr) {
        console.error("Failed to create in-app notification:", notifErr.message);
      }

      // Queue email notification to recipient's own verified email address
      if (recipient.email) {
        queueChatEmailNotification({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientType: recType,
          claimNumber: conversation.claimNumber,
          claimStatus: claim?.status || "In Progress",
          senderName,
          senderRole: senderRole || senderType,
          messageText: text.trim(),
          messageId: newMessage._id
        }).catch((err) => {
          console.error("queueChatEmailNotification caught error:", err.message);
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: plainMessage
    });
  } catch (err) {
    console.error("POST message error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/claim-chat/conversations/:conversationId/read
 * Mark conversation as read by the current user
 */
router.patch("/conversations/:conversationId/read", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, userType } = req.body;

    if (!userId || !userType) {
      return res.status(400).json({ success: false, message: "Missing userId or userType" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const now = new Date();

    // Update participant's lastReadAt
    const participant = conversation.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (participant) {
      participant.lastReadAt = now;
      await conversation.save();
    }

    // Add user to readBy in messages if not already present
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: String(userId) },
        "readBy.userId": { $ne: String(userId) }
      },
      {
        $push: {
          readBy: {
            userId: String(userId),
            userType,
            readAt: now
          }
        }
      }
    );

    // Broadcast message:read to conversation room so other participants see "Read"
    emitToConversation(conversationId, "message:read", {
      conversationId,
      readByUserId: String(userId),
      readAt: now
    });

    // Recalculate chat unread count for this user and emit
    const updatedUnread = await calculateChatUnreadCount(userId, userType);
    emitChatUnreadCount(userType, userId, updatedUnread);

    return res.json({ success: true, unreadCount: updatedUnread });
  } catch (err) {
    console.error("PATCH conversation read error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/claim-chat/unread-counts
 * Fetch current unread chat and notification counts for the user
 */
router.get("/unread-counts", async (req, res) => {
  try {
    const { userId, userType } = req.query;
    if (!userId || !userType) {
      return res.status(400).json({ success: false, message: "Missing userId or userType" });
    }

    const chatUnreadCount = await calculateChatUnreadCount(userId, userType);
    const notificationUnreadCount = await calculateNotificationUnreadCount(userId);

    return res.json({
      success: true,
      chatUnreadCount,
      notificationUnreadCount
    });
  } catch (err) {
    console.error("GET /api/claim-chat/unread-counts error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
