import mongoose from "mongoose";

const smsSettingSchema = new mongoose.Schema(
  {
    masterSwitch: {
      type: Boolean,
      default: true
    },
    categories: {
      claimSubmission: { type: Boolean, default: true },
      agentAssignment: { type: Boolean, default: true },
      statusUpdates: { type: Boolean, default: true },
      documentRequests: { type: Boolean, default: true },
      inspection: { type: Boolean, default: true },
      decision: { type: Boolean, default: true },
      settlement: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true }
    },
    defaultDeviceId: {
      type: String,
      default: ""
    },
    lastUpdatedBy: {
      type: String,
      default: "System"
    }
  },
  { timestamps: true }
);

const SmsSetting = mongoose.model("SmsSetting", smsSettingSchema);
export default SmsSetting;
