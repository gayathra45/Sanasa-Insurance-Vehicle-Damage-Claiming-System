import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true
    },
    senderName: {
      type: String,
      required: true,
      trim: true
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    senderPhone: {
      type: String,
      default: ""
    },
    senderRole: {
      type: String,
      enum: ["Policy Holder", "Agent", "Office Staff", "Public Visitor", "General"],
      default: "General"
    },
    category: {
      type: String,
      enum: [
        "Claims Escalation",
        "Technical Issue",
        "Policy Inquiry",
        "Agent Support",
        "Branch Operations",
        "Billing & Payments",
        "General Inquiry"
      ],
      default: "General Inquiry"
    },
    priority: {
      type: String,
      enum: ["Normal", "High", "Urgent"],
      default: "Normal"
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    branch: {
      type: String,
      default: "Head Office"
    },
    status: {
      type: String,
      enum: ["Pending", "In Review", "Resolved", "Closed"],
      default: "Pending"
    },
    adminNotes: {
      type: String,
      default: ""
    },
    replyMessage: {
      type: String,
      default: ""
    },
    repliedAt: {
      type: Date
    },
    repliedBy: {
      type: String,
      default: ""
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Pre-save hook to generate sequential / unique ticketId if not present
inquirySchema.pre("save", function (next) {
  if (!this.ticketId) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const dateYear = new Date().getFullYear();
    this.ticketId = `INQ-${dateYear}-${randomDigits}`;
  }
  next();
});

const Inquiry = mongoose.model("Inquiry", inquirySchema);
export default Inquiry;
