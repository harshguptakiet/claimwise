/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Claim-related types
 */
export interface Evidence {
  source: string;
  page: number;
  span: string;
}

export interface Attachment {
  filename: string;
  url: string;
  size?: string;
}

export interface ClaimResponse {
  id: string;
  claimant: string;
  policy_no: string;
  loss_type: string;
  created_at: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  queue: string;
  status: "Processing" | "Completed" | "Rejected";
  amount?: string;
}

export interface ClaimDetailResponse extends ClaimResponse {
  email: string;
  policyNumber?: string;
  description: string;
  rationale: string;
  evidence: Evidence[];
  attachments: Attachment[];
  assignee?: string;
}

export interface ReassignData {
  queue: string;
  assignee: string;
  note: string;
}

export interface Queue {
  id: string;
  name: string;
  assignees?: string[];
}
