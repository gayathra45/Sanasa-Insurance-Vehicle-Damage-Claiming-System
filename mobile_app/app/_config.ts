import Constants from "expo-constants";
import { Platform, LogBox } from "react-native";

// Ignore recurring background polling and connection warnings in developer LogBox
LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "Background claims polling failed",
  "Error fetching availability",
  "Failed to connect",
  "ConnectException",
  "Network request failed",
  "fetch failed",
]);

const getApiBaseUrl = () => {
  // 1. Resolve host IP from Expo hostUri (Metro server IP)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  let metroIp = "";
  if (hostUri) {
    metroIp = hostUri.split(":")[0];
  }

  // 2. Physical device (Android or iOS) - must use local network IP
  if (Constants.isDevice) {
    const ip = metroIp || "192.168.42.36";
    console.log(`MOBILE API BASE URL (Physical Device): http://${ip}:5000`);
    return `http://${ip}:5000`;
  }

  // 3. Android Emulator - route through 10.0.2.2 (host loopback)
  if (Platform.OS === "android") {
    console.log("MOBILE API BASE URL (Android Emulator): http://10.0.2.2:5000");
    return "http://10.0.2.2:5000";
  }

  // 4. iOS Simulator loopback
  if (Platform.OS === "ios") {
    console.log("MOBILE API BASE URL (iOS Simulator): http://localhost:5000");
    return "http://localhost:5000";
  }

  // 5. Fallback to detected LAN IP
  const fallbackIp = metroIp || "192.168.42.36";
  console.log("MOBILE API BASE URL (Fallback):", `http://${fallbackIp}:5000`);
  return `http://${fallbackIp}:5000`;
};

export const API_BASE_URL = getApiBaseUrl();

// Global safety patch for React Native / Hermes whatwg-fetch bugs:
// 1. RangeError: Failed to construct 'Response': The status provided (0) is outside the range [200, 599].
// 2. SyntaxError: JSON Parse error: Unexpected end of input on empty response bodies.
// 3. java.net.ConnectException / Network request failed — handled as 503 so background polling doesn't crash LogBox.
const _global = typeof globalThis !== "undefined" ? (globalThis as any) : {};
if (_global.fetch && !_global.__sanasa_fetch_patched) {
  _global.__sanasa_fetch_patched = true;
  const _origFetch = _global.fetch;

  _global.fetch = async function (...args: any[]) {
    try {
      const res = await _origFetch.apply(this, args as any);

      // Safe .json() parser to prevent 'Unexpected end of input' crashes
      res.json = async function () {
        try {
          const text = await res.text();
          if (!text || text.trim().length === 0) return {};
          return JSON.parse(text);
        } catch {
          return {};
        }
      };

      return res;
    } catch (err: any) {
      const msg = String(err?.message || "");

      // Hermes RangeError when whatwg-fetch passes status: 0
      if (err instanceof RangeError && msg.includes("status provided (0)")) {
        return new Response(JSON.stringify({ error: "Network connection failed" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Catch ALL network connection refusal/offline errors so polling does not crash LogBox
      const isNetworkDown =
        msg.includes("Network request failed") ||
        msg.includes("ConnectException") ||
        msg.includes("Failed to connect") ||
        msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("NetworkError");

      if (isNetworkDown) {
        return new Response(JSON.stringify({ error: "Network connection offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw err;
    }
  };
}

export default function Config() {
  return null;
}
