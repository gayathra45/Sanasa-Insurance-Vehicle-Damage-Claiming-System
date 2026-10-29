import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: "Claim" },
    claimNumber: { type: String, required: true, index: true },
    vehiclePlate: { type: String, default: "" },
    type: { type: String, enum: ["direct", "group"], default: "direct" },
    participants: [
      {
        userId: { type: String, required: true },
        userType: {
          type: String,
          enum: ["PolicyHolder", "Agent", "OfficeStaff", "Admin", "ThirdParty"],
          required: true
        },
        name: { type: String, required: true },
        email: { type: String, default: "" },
        role: { type: String, default: "" },
        branch: { type: String, default: "" },
        profilePhoto: { type: String, default: "" },
        lastReadAt: { type: Date, default: Date.now }
      }
    ],
    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: String, default: "" },
      senderType: { type: String, default: "" },
      senderName: { type: String, default: "" },
      sentAt: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);

conversationSchema.index({ "participants.userId": 1 });
conversationSchema.index({ claimNumber: 1, type: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
