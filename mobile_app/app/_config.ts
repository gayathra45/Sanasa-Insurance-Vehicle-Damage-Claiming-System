import Constants from "expo-constants";
import { Platform } from "react-native";

const isAndroidEmulator = (): boolean => {
  if (Platform.OS !== "android") return false;
  const c: any = Platform.constants || {};
  const model = String(c.Model || "").toLowerCase();
  const brand = String(c.Brand || "").toLowerCase();
  const fingerprint = String(c.Fingerprint || "").toLowerCase();
  const serial = String(c.Serial || "").toLowerCase();
  const manufacturer = String(c.Manufacturer || "").toLowerCase();

  return (
    model.includes("sdk") ||
    model.includes("emulator") ||
    model.includes("gphone") ||
    (brand.includes("google") && model.includes("gphone")) ||
    fingerprint.includes("generic") ||
    serial.includes("emulator") ||
    manufacturer.includes("genymotion")
  );
};

const getApiBaseUrl = () => {
  // 1. Android Emulator loopback to host PC
  if (isAndroidEmulator()) {
    console.log("MOBILE API BASE URL (Android Emulator): http://10.0.2.2:5000");
    return "http://10.0.2.2:5000";
  }

  // 2. iOS Simulator loopback
  if (Platform.OS === "ios" && !Constants.isDevice) {
    console.log("MOBILE API BASE URL (iOS Simulator): http://localhost:5000");
    return "http://localhost:5000";
  }

  // 3. Physical device or Web - resolve host IP from Expo hostUri or fallback
  const hostUri = Constants.expoConfig?.hostUri;
  let url = "http://192.168.42.36:5000";
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    url = `http://${ip}:5000`;
  }
  console.log("MOBILE API BASE URL:", url);
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

export default function Config() {
  return null;
}
