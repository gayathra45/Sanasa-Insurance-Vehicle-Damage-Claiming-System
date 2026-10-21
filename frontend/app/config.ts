const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return `http://${host}:5000/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";
};

export const API_URL = getApiUrl();
