import Constants from "expo-constants";

const getApiBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:5000`;
  }
  // Fallback to the current Wi-Fi adapter IP
  return "http://192.168.41.81:5000";
};

export const API_BASE_URL = getApiBaseUrl();
