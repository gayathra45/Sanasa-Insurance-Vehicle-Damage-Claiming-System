import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    claimNumber: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderType: {
      type: String,
      enum: ["PolicyHolder", "Agent", "OfficeStaff", "Admin", "ThirdParty"],
      required: true
    },
    senderName: { type: String, required: true },
    senderEmail: { type: String, default: "" },
    senderRole: { type: String, default: "" },
    senderPhoto: { type: String, default: "" },
    
    // Direct recipient or target details (for direct messages or primary recipient)
    recipientId: { type: String, default: "" },
    recipientType: { type: String, default: "" },
    recipientName: { type: String, default: "" },
    recipientEmail: { type: String, default: "" },

    text: { type: String, default: "" },
    attachments: [
      {
        name: { type: String, default: "" },
        url: { type: String, default: "" },
        fileType: { type: String, default: "" },
        size: { type: Number, default: 0 }
      }
    ],
    readBy: [
      {
        userId: { type: String, required: true },
        userType: { type: String, default: "" },
        readAt: { type: Date, default: Date.now }
      }
    ],
    idempotencyKey: { type: String, index: true, sparse: true }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
