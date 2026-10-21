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

export function isClaimUnreadMobile(
  claim: { _id?: string; id?: string; createdAt?: string | Date; updatedAt?: string | Date },
  viewedMap: Record<string, number>
): boolean {
  const claimId = claim._id || claim.id;
  if (!claimId) return false;

  const lastViewed = viewedMap[claimId];
  if (!lastViewed) return true; // Never viewed -> unread

  const claimTimestamp = new Date(claim.updatedAt || claim.createdAt || 0).getTime();
  return claimTimestamp > lastViewed;
}

export async function markClaimAsReadMobile(
  claimId: string,
  viewedMap: Record<string, number>,
  setViewedMap: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  userKey: string = "default"
): Promise<void> {
  if (!claimId) return;
  const updated = {
    ...viewedMap,
    [claimId]: Date.now()
  };
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
