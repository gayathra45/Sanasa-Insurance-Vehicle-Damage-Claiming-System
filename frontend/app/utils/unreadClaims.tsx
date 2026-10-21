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

export function isClaimUnread(
  claim: { _id?: string; id?: string; createdAt?: string | Date; updatedAt?: string | Date },
  viewedMap: Record<string, number>
): boolean {
  const claimId = claim._id || claim.id;
  if (!claimId) return false;

  const lastViewed = viewedMap[claimId];
  if (!lastViewed) return true; // Never viewed -> unread

  const claimTimestamp = new Date(claim.updatedAt || claim.createdAt || 0).getTime();
  // If claim was created/updated after last view, mark as unread
  return claimTimestamp > lastViewed;
}

export function markClaimAsRead(
  claimId: string,
  viewedMap: Record<string, number>,
  setViewedMap: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  userKey: string = "default"
): void {
  if (!claimId) return;
  const updated = {
    ...viewedMap,
    [claimId]: Date.now()
  };
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
