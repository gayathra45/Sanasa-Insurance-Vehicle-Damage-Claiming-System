import mongoose from "mongoose";

const deletedAgentSchema = new mongoose.Schema({
  agentId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  nic: { type: String, required: true },
  address: { type: String, required: true },
  dob: { type: String, required: true },
  branch: { type: String, required: true, index: true },
  phone: { type: String, default: "" },
  city: { type: String, default: "" },
  province: { type: String, default: "" },
  bankName: { type: String, default: "" },
  bankBranch: { type: String, default: "" },
  accountNumber: { type: String, default: "" },
  accountType: { type: String, default: "" },
  accountHolderName: { type: String, default: "" },
  nicFront: { type: String, default: "" },
  nicBack: { type: String, default: "" },
  birthCertificate: { type: String, default: "" },
  policeReport: { type: String, default: "" },
  reason: { type: String, required: true },
  note: { type: String, required: true },
  document: { type: String, default: "" },
  deletedAt: { type: Date, default: Date.now }
});

const DeletedAgent = mongoose.model("DeletedAgent", deletedAgentSchema);
export default DeletedAgent;
