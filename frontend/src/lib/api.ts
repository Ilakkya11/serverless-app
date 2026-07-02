import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("prepai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function get<T>(url: string): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(url);
  return response.data.data;
}

export async function post<T>(url: string, payload?: unknown): Promise<T> {
  const response = await api.post<ApiEnvelope<T>>(url, payload);
  return response.data.data;
}

export async function put<T>(url: string, payload?: unknown): Promise<T> {
  const response = await api.put<ApiEnvelope<T>>(url, payload);
  return response.data.data;
}

export async function remove<T>(url: string): Promise<T> {
  const response = await api.delete<ApiEnvelope<T>>(url);
  return response.data.data;
}
