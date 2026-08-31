import Constants from "expo-constants";

const getApiBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  let url = "http://192.168.40.155:5000";
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
