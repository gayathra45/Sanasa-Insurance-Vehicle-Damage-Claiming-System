import React from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "sanasa_viewed_claims_";

export async function getViewedClaimsMobile(userKey: string = "default"): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${userKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Failed to load viewed claims on mobile:", err);
    return {};
  }
}

export async function saveViewedClaimsMobile(map: Record<string, number>, userKey: string = "default"): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${userKey}`, JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to save viewed claims on mobile:", err);
  }
}

/**
 * Calculates the latest timestamp of any activity or update on a claim:
 * - Direct updatedAt / createdAt
 * - Uploaded documents (e.g. Garage Estimate, Inspection photos)
 * - Messages sent (e.g. auto request for garage estimate, audit logs)
 * - Milestone timestamps (payment settlement, AI analysis, manual overrides)
 */
export function getClaimLatestTimestampMobile(claim: any): number {
  if (!claim) return 0;
  let maxTime = 0;

  // 1. Direct timestamps
  if (claim.updatedAt) {
    const t = new Date(claim.updatedAt).getTime();
    if (!isNaN(t) && t > maxTime) maxTime = t;
  }
  if (claim.createdAt) {
    const t = new Date(claim.createdAt).getTime();
    if (!isNaN(t) && t > maxTime) maxTime = t;
  }

  // 2. Additional documents uploaded (e.g. Garage Estimate Report, inspection report photos)
  const docs = claim.additionalDocuments || claim.documents;
  if (Array.isArray(docs)) {
    for (const d of docs) {
      if (d?.uploadedAt) {
        const t = new Date(d.uploadedAt).getTime();
        if (!isNaN(t) && t > maxTime) maxTime = t;
      }
    }
  }

  // 3. Messages / audit updates
  if (Array.isArray(claim.messages)) {
    for (const m of claim.messages) {
      if (m?.sentAt) {
        const t = new Date(m.sentAt).getTime();
        if (!isNaN(t) && t > maxTime) maxTime = t;
      }
    }
  }

  // 4. Milestone events
  if (claim.paymentSettledAt) {
    const t = new Date(claim.paymentSettledAt).getTime();
    if (!isNaN(t) && t > maxTime) maxTime = t;
  }
  if (claim.manualUpdateAt) {
    const t = new Date(claim.manualUpdateAt).getTime();
    if (!isNaN(t) && t > maxTime) maxTime = t;
  }
  if (claim.aiAnalysis?.analyzedAt) {
    const t = new Date(claim.aiAnalysis.analyzedAt).getTime();
    if (!isNaN(t) && t > maxTime) maxTime = t;
  }
  if (claim.garageEstimateComparison?.reviewedAt) {
    const t = new Date(claim.garageEstimateComparison.reviewedAt).getTime();
    if (!isNaN(t) && t > maxTime) maxTime = t;
  }

  return maxTime;
}

export function isClaimUnreadMobile(
  claim: any,
  viewedMap: Record<string, number> = {}
): boolean {
  if (!claim) return false;

  const id1 = claim._id ? String(claim._id) : "";
  const id2 = claim.claimNumber ? String(claim.claimNumber) : "";
  const id3 = claim.id ? String(claim.id) : "";
  const claimId = id1 || id2 || id3;
  if (!claimId) return false;

  const lastViewed = (id1 && viewedMap[id1]) || (id2 && viewedMap[id2]) || (id3 && viewedMap[id3]) || 0;
  if (!lastViewed) return true; // Never viewed -> unread

  const claimTimestamp = getClaimLatestTimestampMobile(claim);
  // If claim was created/updated/document received after last view, mark as unread
  return claimTimestamp > lastViewed;
}

export async function markClaimAsReadMobile(
  claimOrId: any,
  viewedMap: Record<string, number>,
  setViewedMap: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  userKey: string = "default"
): Promise<void> {
  if (!claimOrId) return;
  const now = Date.now();
  const updated = { ...viewedMap };

  if (typeof claimOrId === "string") {
    updated[claimOrId] = now;
  } else {
    if (claimOrId._id) updated[String(claimOrId._id)] = now;
    if (claimOrId.claimNumber) updated[String(claimOrId.claimNumber)] = now;
    if (claimOrId.id) updated[String(claimOrId.id)] = now;
  }

  setViewedMap(updated);
  await saveViewedClaimsMobile(updated, userKey);
}

export function UnreadDotMobile({ size = 8 }: { size?: number }) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  }
});
