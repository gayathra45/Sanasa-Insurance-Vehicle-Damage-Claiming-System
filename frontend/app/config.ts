export const getApiUrl = (): string => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

