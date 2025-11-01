import { API_BASE, API_ENDPOINTS } from "./config";

export interface Rule {
  id: string;
  name?: string;
  description?: string;
  condition?: string;
  action?: string;
  enabled?: boolean;
  // New structure based on wireframe
  attribute?: string;
  operator?: string;
  amount?: number;
  forward_to?: string;
}

export interface CreateRuleData {
  attribute: string;
  operator: string;
  amount: number;
  forward_to: string;
}

export interface UpdateRuleData extends CreateRuleData {
  id: string;
}

export const getRules = async () => {
  const response = await fetch(`${API_BASE}${API_ENDPOINTS.rules.list}`);

  if (!response.ok) {
    throw new Error("Failed to fetch rules");
  }

  return response.json() as Promise<Rule[]>;
};

export const getRuleAttributes = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/rules/attributes`);
    if (!response.ok) {
      // Fallback to mock data if endpoint doesn't exist
      return ["severity_score", "confidence_score", "claim_type", "amount"];
    }
    return response.json() as Promise<string[]>;
  } catch {
    // Return mock data if API call fails
    return ["severity_score", "confidence_score", "claim_type", "amount"];
  }
};

export const createRule = async (data: CreateRuleData) => {
  const response = await fetch(`${API_BASE}${API_ENDPOINTS.rules.list}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create rule");
  }

  return response.json() as Promise<Rule>;
};

export const updateRule = async (id: string, data: CreateRuleData) => {
  const response = await fetch(`${API_BASE}${API_ENDPOINTS.rules.list}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to update rule");
  }

  return response.json() as Promise<Rule>;
};
