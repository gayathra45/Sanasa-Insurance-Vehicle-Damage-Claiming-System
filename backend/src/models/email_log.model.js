import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, default: "" },
    recipientType: { type: String, default: "" },
    claimNumber: { type: String, default: "" },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued"
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
  },
  { timestamps: true }
);

const EmailLog = mongoose.model("EmailLog", emailLogSchema);
export default EmailLog;
