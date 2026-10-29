import React from "react";

const STORAGE_PREFIX = "sanasa_viewed_claims_";

export function getViewedClaims(userKey: string = "default"): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Failed to load viewed claims:", err);
    return {};
  }
}

export function saveViewedClaims(map: Record<string, number>, userKey: string = "default"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userKey}`, JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to save viewed claims:", err);
  }
}

/**
 * Calculates the latest timestamp of any activity or update on a claim:
 * - Direct updatedAt / createdAt
 * - Uploaded documents (e.g. Garage Estimate, Inspection photos)
 * - Messages sent (e.g. auto request for garage estimate, audit logs)
 * - Milestone timestamps (payment settlement, AI analysis, manual overrides)
 */
export function getClaimLatestTimestamp(claim: any): number {
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

export function isClaimUnread(
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

  const claimTimestamp = getClaimLatestTimestamp(claim);
  // If claim was created/updated/document received after last view, mark as unread
  return claimTimestamp > lastViewed;
}

export function markClaimAsRead(
  claimOrId: any,
  viewedMap: Record<string, number>,
  setViewedMap: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  userKey: string = "default"
): void {
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
  saveViewedClaims(updated, userKey);
}

export function UnreadDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 shrink-0 ${className}`} title="New / Unread Update">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 ring-2 ring-white"></span>
    </span>
  );
}
