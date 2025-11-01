// Backend API base URL - configurable via environment variable
// Defaults to http://localhost:8000 for FastAPI backend
// Set VITE_API_BASE_URL in .env file to point to your backend
// Example: VITE_API_BASE_URL=http://localhost:8000
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  claims: {
    upload: "/api/claims/upload",
    list: "/api/claims",
    get: (id: string) => `/api/claims/${id}`,
    reassign: (id: string) => `/api/claims/${id}/reassign`,
  },
  queues: {
    list: "/api/queues",
  },
  rules: {
    list: "/api/rules",
  },
} as const;
