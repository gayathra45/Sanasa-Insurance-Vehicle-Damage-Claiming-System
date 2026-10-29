import dotenv from "dotenv";
dotenv.config({ override: true }); // Reloads updated .env with new TextBee API key
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import signupRouter from "./src/routes/signup.routes.js";
import myClaimsRouter from "./src/routes/my_claims.routes.js";
import newClaimRouter, { ensurePhotoHashesIndexed } from "./src/routes/new_claim.routes.js";
import myVehiclesRouter from "./src/routes/my_vehicles.routes.js";
import adminRouter from "./src/routes/admin.routes.js";
import officeStaffRouter from "./src/routes/office_staff.routes.js";
import agentRouter from "./src/routes/agent.routes.js";
import authRouter from "./src/routes/auth.routes.js";
import translateRouter from "./src/routes/translate.routes.js";
import chatRouter from "./src/routes/chat.routes.js";
import claimReportRouter from "./src/routes/claim_report.routes.js";
import renewalRouter from "./src/routes/renewal.routes.js";
import http from "http";
import claimChatRouter from "./src/routes/claim_chat.routes.js";
import notificationsRouter from "./src/routes/notifications.routes.js";
import smsRouter from "./src/routes/sms.routes.js";
import thirdPartyRouter from "./src/routes/third_party.routes.js";
import { initSocketServer } from "./src/utils/socket.js";




const app = express();
const __dirname = path.resolve();

app.use(cors());

// Global no-cache middleware for API routes to prevent browser/runtime caching of GET responses
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Serve local uploads from Downloads directory
app.use("/uploads", express.static("C:\\Users\\oshit\\Downloads\\ui"));

// Increase payload size limit to support base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/signup", signupRouter);
app.use("/api/policy-holder", myClaimsRouter);
app.use("/api/policy-holder", newClaimRouter);
app.use("/api/policy-holder", myVehiclesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/office-staff", officeStaffRouter);
app.use("/api/agent", agentRouter);
app.use("/api/auth", authRouter);
app.use("/api/translate", translateRouter);
app.use("/api/chat", chatRouter);
app.use("/api/claims", claimReportRouter);
app.use("/api/renewals", renewalRouter);
app.use("/api/claim-chat", claimChatRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/sms", smsRouter);
app.use("/api/third-party", thirdPartyRouter);



/*  SERVER START */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000
    });
    console.log("✅ MongoDB Connected");

    // Index historical photos in background once DB is connected
    ensurePhotoHashesIndexed().catch((err) => {
      console.warn("Photo hash indexing error:", err.message);
    });

    const httpServer = http.createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server with Socket.IO running on port ${PORT}`);
    });

    httpServer.on("error", (err) => {
      console.error("❌ Server listen error:", err.message);
    });
  } catch (error) {
    console.error("❌ Server error:", error.message);
    process.exit(1);
  }
};

startServer();
// Server initialization active
