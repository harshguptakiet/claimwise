export type ClaimSeverity = "Low" | "Medium" | "High" | "Critical";
export type ClaimStatus =
  | "Draft"
  | "Processing"
  | "Under Review"
  | "Completed"
  | "Rejected";
export type ClaimType =
  | "Property Damage"
  | "Auto Accident"
  | "Health"
  | "Workers Compensation";

export interface Claim {
  id: string;
  claimant: string;
  email: string;
  policyNumber: string;
  dateOfLoss: string;
  claimType: ClaimType;
  amount: string;
  severity: ClaimSeverity;
  confidence: number;
  queue: string;
  status: ClaimStatus;
  description: string;
}

export interface ClaimDetail extends Claim {
  extractedFields: Record<string, string>;
  pdfs: Array<{
    name: string;
    size: string;
    uploaded: string;
  }>;
}

export interface FormErrors {
  [key: string]: string;
}
