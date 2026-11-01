import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const BIOMETRIC_ENABLED_KEY = "@sanasa_biometric_enabled";
export const BIOMETRIC_CREDENTIALS_KEY = "@sanasa_biometric_credentials";

export interface BiometricCredentials {
  role: "policy_holder" | "insurance_agent";
  loginId: string; // NIC or Email
  password?: string;
  displayName: string;
  userData: any;
  savedAt: string;
}

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  type: "face" | "fingerprint" | "iris" | "multiple" | "none";
  label: string;
  iconName: "finger-print-outline" | "scan-outline" | "shield-checkmark-outline";
  details: string;
}

/**
 * Detect device biometric hardware capabilities (Face Unlock vs Fingerprint)
 */
export async function getBiometricCapabilities(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        available: false,
        enrolled: false,
        type: "none",
        label: "Biometrics Not Supported",
        iconName: "finger-print-outline",
        details: "This device does not have biometric hardware sensors.",
      };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const hasFace = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasIris = supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS);

    let type: "face" | "fingerprint" | "iris" | "multiple" | "none" = "none";
    let label = "Biometric Unlock";
    let iconName: "finger-print-outline" | "scan-outline" | "shield-checkmark-outline" = "finger-print-outline";

    if (hasFace && hasFingerprint) {
      type = "multiple";
      label = Platform.OS === "ios" ? "Face ID / Touch ID" : "Face & Fingerprint Unlock";
      iconName = "scan-outline";
    } else if (hasFace) {
      type = "face";
      label = Platform.OS === "ios" ? "Face ID" : "Face Unlock";
      iconName = "scan-outline";
    } else if (hasFingerprint) {
      type = "fingerprint";
      label = Platform.OS === "ios" ? "Touch ID" : "Fingerprint Scanner";
      iconName = "finger-print-outline";
    } else if (hasIris) {
      type = "iris";
      label = "Iris Scanner";
      iconName = "scan-outline";
    } else {
      type = "multiple";
      label = "Device Biometrics";
      iconName = "shield-checkmark-outline";
    }

    return {
      available: true,
      enrolled: isEnrolled,
      type,
      label,
      iconName,
      details: isEnrolled
        ? `Device supports ${label}. Ready for secure instant login.`
        : `Biometrics hardware found, but no fingerprints or face profiles enrolled on device.`,
    };
  } catch (err) {
    console.warn("Error checking biometric capabilities:", err);
    return {
      available: false,
      enrolled: false,
      type: "none",
      label: "Biometric Authentication",
      iconName: "finger-print-outline",
      details: "Could not inspect biometric hardware.",
    };
  }
}

/**
 * Prompt OS biometric dialog (Face ID / Android BiometricPrompt)
 */
export async function authenticateWithBiometrics(
  promptMessage: string = "Verify your identity to log in to SANASA"
): Promise<{ success: boolean; error?: string }> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, error: "Biometric hardware is not available on this device." };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        success: false,
        error: "No biometrics (fingerprints or face data) enrolled in device settings.",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use Password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error === "user_cancel" ? "Authentication canceled" : result.warning || "Biometric check failed",
      };
    }
  } catch (err: any) {
    console.error("Biometric prompt error:", err);
    return { success: false, error: err?.message || "Biometric verification error" };
  }
}

/**
 * Check if user enabled biometric login in settings
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Enable or disable biometric login
 */
export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
    } else {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "false");
    }
  } catch (e) {
    console.warn("Error setting biometric enabled flag:", e);
  }
}

/**
 * Save user credentials and role for biometric fast-login
 */
export async function saveBiometricCredentials(creds: BiometricCredentials): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(creds));
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
  } catch (e) {
    console.warn("Error saving biometric credentials:", e);
  }
}

/**
 * Retrieve saved user credentials for biometric fast-login
 */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  try {
    const data = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
    if (!data) return null;
    return JSON.parse(data) as BiometricCredentials;
  } catch {
    return null;
  }
}

/**
 * Clear saved biometric credentials
 */
export async function clearBiometricCredentials(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "false");
  } catch (e) {
    console.warn("Error clearing biometric credentials:", e);
  }
}
