const LIVE_BACKEND_URL = "https://sanasa-insurance-api.onrender.com/api";

const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }
    // If running on Vercel or cloud domain without NEXT_PUBLIC_API_URL
    if (host.includes("vercel.app") || host.includes("sanasainsurance.lk")) {
      return LIVE_BACKEND_URL;
    }
    return `http://${host}:5000/api`;
  }
  return LIVE_BACKEND_URL;
};

export const API_URL = getApiUrl();
