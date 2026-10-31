import NfcCard from "../models/nfc_card.model.js";
import ThirdPartyRegistration from "../models/third_party_registration.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { sendSms } from "./smsService.js";
import { emitNfcCardUpdated, emitThirdPartyRequestUpdated, emitNotification } from "../utils/socket.js";

let intervalRef = null;

export function initExpirationWorker() {
  if (intervalRef) return;

  const runWorker = async () => {
    try {
      const now = new Date();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // ==========================================
      // 1. NFC CARDS (Expiration, Activation, 24h Warning)
      // ==========================================
      const cardsToCheck = await NfcCard.find({
        status: { $in: ["Active", "Scheduled", "Temporarily Blocked"] },
        "currentAssignment.assignmentId": { $exists: true, $ne: "" }
      });

      for (const card of cardsToCheck) {
        const asg = card.currentAssignment;
        if (!asg) continue;

        // Auto-expire past-due assignments
        if (asg.endDate && now > new Date(asg.endDate)) {
          console.log(`[ExpirationWorker] Auto-expiring NFC assignment ${asg.assignmentId} on card ${card.cardId}`);
          card.assignmentHistory = card.assignmentHistory || [];
          card.assignmentHistory.push({
            assignmentId: asg.assignmentId,
            driverName: asg.driverName,
            driverPhone: asg.driverPhone,
            driverNic: asg.driverNic,
            driverAddress: asg.driverAddress,
            driverPhoto: asg.driverPhoto,
            vehiclePlate: asg.vehiclePlate,
            vehicleType: asg.vehicleType,
            vehicleModel: asg.vehicleModel,
            startDate: asg.startDate,
            endDate: asg.endDate,
            durationType: asg.durationType,
            reason: asg.reason,
            status: "Expired",
            assignedAt: asg.assignedAt || now,
            endedAt: now,
            endReason: "Auto-expired based on assignment end date",
            assignedBy: asg.assignedBy,
            events: [
              {
                eventType: "Expired",
                timestamp: now,
                performedBy: "System",
                note: "Auto-expired by backend worker based on assignment end date"
              }
            ]
          });

          card.status = "Available";
          card.currentAssignment = {
            assignmentId: "",
            driverName: "",
            driverPhone: "",
            driverNic: "",
            driverAddress: "",
            driverPhoto: "",
            vehiclePlate: "",
            vehicleType: "",
            vehicleModel: "",
            startDate: null,
            endDate: null,
            durationType: "",
            reason: "",
            status: "None",
            isBlocked: false,
            blockedAt: null,
            blockedReason: "",
            tokenHash: "",
            rawToken: "",
            accessUrl: "",
            assignedAt: null,
            assignedBy: ""
          };
          card.lastActivity = now;
          await card.save();
          emitNfcCardUpdated(card);
        }
        // Activate scheduled assignments
        else if (
          card.status === "Scheduled" &&
          asg.startDate &&
          now >= new Date(asg.startDate) &&
          (!asg.endDate || now < new Date(asg.endDate))
        ) {
          console.log(`[ExpirationWorker] Activating scheduled NFC assignment ${asg.assignmentId} on card ${card.cardId}`);
          card.status = "Active";
          asg.status = "Active";
          await card.save();
          emitNfcCardUpdated(card);
        }
        // 24-Hour Pre-Expiration SMS & In-App Alert
        else if (asg.endDate && card.status === "Active" && !asg.expiryAlertSent) {
          const msRemaining = new Date(asg.endDate).getTime() - now.getTime();
          if (msRemaining > 0 && msRemaining <= oneDayMs) {
            console.log(`[ExpirationWorker] Sending 24h pre-expiry warning for card ${card.cardId}`);
            asg.expiryAlertSent = true;
            await card.save();

            // Look up policyholder phone & notify
            User.findOne({ nic: card.policyHolderNic }).then(async (owner) => {
              if (owner && owner.phone) {
                sendSms({
                  phone: owner.phone,
                  message: `[SANASA NOTICE]\nDear ${owner.fullName},\n\nYour temporary driver ${asg.driverName}'s authorization on NFC Card ${card.cardId} (${asg.vehiclePlate}) expires in less than 24 hours on ${new Date(asg.endDate).toLocaleString("en-LK")}.\nPlease log in to your Sanasa portal to extend or manage this card.\nHotline: 0725 575 575`,
                  recipientType: "PolicyHolder",
                  recipientName: owner.fullName,
                  eventType: "nfc_24h_expiry_warning"
                }).catch((e) => console.warn("24h warning SMS error:", e.message));

                // In-App Notification
                try {
                  const notif = new Notification({
                    userId: owner.nic,
                    userType: "PolicyHolder",
                    title: `NFC Card Pass Expires in 24 Hours`,
                    body: `Driver ${asg.driverName}'s authorization for ${asg.vehiclePlate} on card ${card.cardId} expires on ${new Date(asg.endDate).toLocaleDateString("en-LK")}.`,
                    type: "system",
                    actionUrl: `/Policy_Holder/ThirdParty?tab=optional`
                  });
                  await notif.save();
                  emitNotification("PolicyHolder", owner.nic, notif);
                } catch (notifErr) {
                  console.warn("24h notif error:", notifErr.message);
                }
              }
            });
          }
        }
      }

      // ==========================================
      // 2. PERMANENT DRIVER REGISTRATIONS (Expiration, Activation, 24h Warning)
      // ==========================================
      const registrationsToCheck = await ThirdPartyRegistration.find({
        status: { $in: ["Approved", "Scheduled", "Temporarily Blocked"] },
        "accessDuration.endDate": { $exists: true, $ne: null }
      });

      for (const reg of registrationsToCheck) {
        const dur = reg.accessDuration;
        if (!dur) continue;

        // Auto-expire past-due authorizations
        if (dur.endDate && now > new Date(dur.endDate)) {
          if (reg.status !== "Expired") {
            console.log(`[ExpirationWorker] Expiring permanent driver pass ${reg.requestReference}`);
            reg.status = "Expired";
            dur.isExpired = true;
            reg.updatedAt = now;
            await reg.save();
            emitThirdPartyRequestUpdated(reg);
          }
        }
        // Activate scheduled authorizations
        else if (
          reg.status === "Scheduled" &&
          dur.startDate &&
          now >= new Date(dur.startDate) &&
          (!dur.endDate || now < new Date(dur.endDate))
        ) {
          console.log(`[ExpirationWorker] Activating scheduled permanent driver pass ${reg.requestReference}`);
          reg.status = "Approved";
          dur.isScheduled = false;
          reg.updatedAt = now;
          await reg.save();
          emitThirdPartyRequestUpdated(reg);
        }
        // 24-Hour Pre-Expiration SMS & In-App Alert
        else if (dur.endDate && reg.status === "Approved" && !dur.expiryAlertSent) {
          const msRemaining = new Date(dur.endDate).getTime() - now.getTime();
          if (msRemaining > 0 && msRemaining <= oneDayMs) {
            console.log(`[ExpirationWorker] Sending 24h pre-expiry warning for driver pass ${reg.requestReference}`);
            dur.expiryAlertSent = true;
            await reg.save();

            if (reg.policyHolderPhone) {
              const plates = (reg.selectedVehicles || []).map((v) => v.numberPlate).join(", ");
              sendSms({
                phone: reg.policyHolderPhone,
                message: `[SANASA NOTICE]\nDear ${reg.policyHolderName},\n\nYour authorized driver ${reg.driverDetails.fullName}'s pass for vehicle(s) ${plates} expires in less than 24 hours on ${new Date(dur.endDate).toLocaleString("en-LK")}.\nPlease log in to your Sanasa portal to renew authorization.\nHotline: 0725 575 575`,
                recipientType: "PolicyHolder",
                recipientName: reg.policyHolderName,
                eventType: "third_party_24h_expiry_warning"
              }).catch((e) => console.warn("Permanent driver 24h SMS error:", e.message));

              // In-App Notification
              try {
                const notif = new Notification({
                  userId: reg.policyHolderNic,
                  userType: "PolicyHolder",
                  title: `Driver Authorization Expires in 24 Hours`,
                  body: `Driver ${reg.driverDetails.fullName}'s authorization for vehicle(s) ${plates} will expire on ${new Date(dur.endDate).toLocaleDateString("en-LK")}.`,
                  type: "system",
                  actionUrl: `/Policy_Holder/ThirdParty?tab=permanent`
                });
                await notif.save();
                emitNotification("PolicyHolder", reg.policyHolderNic, notif);
              } catch (notifErr) {
                console.warn("Permanent driver 24h notif error:", notifErr.message);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[ExpirationWorker] Periodic check notice:", err.message);
    }
  };

  // Run on startup and every 30 seconds
  runWorker();
  intervalRef = setInterval(runWorker, 30000);
  console.log("⏱️ Auto-Expiration & 24h Pre-Expiry Notification Worker initialized (running every 30s).");
}
