import { API_BASE, API_ENDPOINTS } from "./config";

export interface Queue {
  id: string;
  name: string;
  description: string;
  claimCount: number;
  averageProcessingTime: string;
}

export const getQueues = async () => {
  const response = await fetch(`${API_BASE}${API_ENDPOINTS.queues.list}`);

  if (!response.ok) {
    throw new Error("Failed to fetch queues");
  }

  return response.json() as Promise<Queue[]>;
};
