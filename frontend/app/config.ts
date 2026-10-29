const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }
    return `http://${host}:5000/api`;
  }
  return "http://127.0.0.1:5000/api";
};

export const API_URL = getApiUrl();
