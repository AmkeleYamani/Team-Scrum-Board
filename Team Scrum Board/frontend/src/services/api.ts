import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "/api";

export const backendBaseUrl = (() => {
  if (!apiUrl.startsWith("http")) return "";
  try { return new URL(apiUrl).origin; } catch { return ""; }
})();

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
