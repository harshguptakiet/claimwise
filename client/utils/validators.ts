export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePolicyNumber = (policyNumber: string): boolean => {
  // Basic validation - adjust pattern as needed
  return policyNumber.length >= 3;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
};

export const validateFileSize = (
  fileSizeInBytes: number,
  maxSizeInMB: number = 100
): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSizeInBytes <= maxSizeInBytes;
};

export const validateFileType = (
  fileName: string,
  allowedTypes: string[] = ["pdf", "doc", "docx", "jpg", "jpeg", "png"]
): boolean => {
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
  return allowedTypes.includes(fileExtension);
};

export const validateClaimForm = (formData: {
  fullName: string;
  email: string;
  policyNumber: string;
  dateOfLoss: string;
  claimType: string;
  description: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!formData.fullName || formData.fullName.trim().length === 0) {
    errors.fullName = "Full name is required";
  }

  if (!validateEmail(formData.email)) {
    errors.email = "Valid email is required";
  }

  if (!validatePolicyNumber(formData.policyNumber)) {
    errors.policyNumber = "Valid policy number is required";
  }

  if (!formData.dateOfLoss) {
    errors.dateOfLoss = "Date of loss is required";
  }

  if (!formData.claimType) {
    errors.claimType = "Claim type is required";
  }

  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Description is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
