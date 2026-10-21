import Constants from "expo-constants";
import { Platform } from "react-native";

const getApiBaseUrl = () => {
  // 1. Android — always route through 10.0.2.2 (emulator host loopback).
  //    isAndroidEmulator() detection via Platform.constants is unreliable
  //    on first bundle load. Since this project targets the emulator,
  //    we hard-route all Android traffic through 10.0.2.2.
  if (Platform.OS === "android") {
    console.log("MOBILE API BASE URL (Android): http://10.0.2.2:5000");
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

// Global safety patch for React Native / Hermes whatwg-fetch bugs:
// 1. RangeError: Failed to construct 'Response': The status provided (0) is outside the range [200, 599].
// 2. SyntaxError: JSON Parse error: Unexpected end of input on empty response bodies.
// 3. TypeError: Network request failed — silenced so polls don't spam the error overlay.
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

      // Network request failed — return empty 503 so callers handle gracefully
      if (msg.includes("Network request failed")) {
        return new Response(JSON.stringify({ error: "Network request failed" }), {
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
