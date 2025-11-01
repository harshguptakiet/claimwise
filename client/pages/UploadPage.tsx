import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { uploadClaim } from "@/api/claims";
import type { AxiosProgressEvent } from "axios";

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

interface FileSection {
  acord: FileWithPreview[];
  police: FileWithPreview[];
  assessment: FileWithPreview[];
  healthEvidence: FileWithPreview[];
  bills: FileWithPreview[];
  prescriptions: FileWithPreview[];
  vehiclePhotos: FileWithPreview[];
  repairEstimates: FileWithPreview[];
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES = ".pdf";

const UploadPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    policy_no: "",
    date_of_loss: "",
    claim_type: "",
    description: "",
  });

  const [files, setFiles] = useState<FileSection>({
    acord: [],
    police: [],
    assessment: [],
    healthEvidence: [],
    bills: [],
    prescriptions: [],
    vehiclePhotos: [],
    repairEstimates: [],
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claimId, setClaimId] = useState<string>("");

  // Fix cursor disappearing issue - track focused input
  const focusedInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Store focus before state update
  useEffect(() => {
    if (focusedInputRef.current) {
      focusedInputRef.current.focus();
    }
  }, [form]);

  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      focusedInputRef.current = e.target as HTMLInputElement | HTMLTextAreaElement;
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} exceeds 20MB limit`;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return `File ${file.name} is not a PDF`;
    }
    return null;
  };

  const handleFileAdd = useCallback(
    (
      section: keyof FileSection,
      newFiles: FileList | null,
      inputElement?: HTMLInputElement
    ) => {
      if (!newFiles || newFiles.length === 0) return;

      const validFiles: FileWithPreview[] = [];
      const errors: string[] = [];

      Array.from(newFiles).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          const id = `${Date.now()}-${Math.random()}`;
          validFiles.push({
            file,
            preview: URL.createObjectURL(file),
            id,
          });
        }
      });

      if (errors.length > 0) {
        toast.error(errors.join(", "));
      }

      if (validFiles.length > 0) {
        setFiles((prev) => ({
          ...prev,
          [section]: [...prev[section], ...validFiles],
        }));
        toast.success(`Added ${validFiles.length} file(s) to ${section}`);
      }

      // Reset input
      if (inputElement) {
        inputElement.value = "";
      }
    },
    []
  );

  const handleFileRemove = useCallback((section: keyof FileSection, fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev[section].find((f) => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return {
        ...prev,
        [section]: prev[section].filter((f) => f.id !== fileId),
      };
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, section: keyof FileSection) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileAdd(section, e.dataTransfer.files);
    },
    [handleFileAdd]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !form.name ||
      !form.email ||
      !form.policy_no ||
      !form.date_of_loss ||
      !form.claim_type ||
      !form.description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (files.acord.length === 0) {
      toast.error("Please upload at least one ACORD/FNOL form");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append form fields
      Object.entries(form).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });

      // Append files - backend expects arrays
      Object.entries(files).forEach(([sectionKey, fileList]) => {
        if (fileList.length > 0) {
          fileList.forEach((fileWithPreview) => {
            formData.append(sectionKey, fileWithPreview.file);
          });
        }
      });

      const onUploadProgress = (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      const response = await uploadClaim(formData, onUploadProgress);
      setClaimId(response.id);
      setSuccess(true);
      setUploadProgress(100);
      toast.success("✅ Claim Submitted Successfully!");

      // Navigate to confirmation page after 2-3 seconds
      setTimeout(() => {
        navigate("/upload-confirmation", { state: { claimId: response.id } });
      }, 2500);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit claim";
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    // Clean up object URLs
    Object.values(files).forEach((fileList) => {
      fileList.forEach((fileWithPreview) => {
        URL.revokeObjectURL(fileWithPreview.preview);
      });
    });

    setForm({
      name: "",
      email: "",
      phone: "",
      policy_no: "",
      date_of_loss: "",
      claim_type: "",
      description: "",
    });
    setFiles({
      acord: [],
      police: [],
      assessment: [],
      healthEvidence: [],
      bills: [],
      prescriptions: [],
      vehiclePhotos: [],
      repairEstimates: [],
    });
    toast.info("Form reset");
  }, [files]);

  // Memoized file upload section component to prevent unnecessary re-renders
  const FileUploadSection = React.memo(
    ({
      section,
      title,
      required = false,
      files: sectionFiles,
      onAdd,
      onRemove,
      onDragOver,
      onDrop,
      inputRef,
    }: {
      section: keyof FileSection;
      title: string;
      required?: boolean;
      files: FileWithPreview[];
      onAdd: (files: FileList | null) => void;
      onRemove: (fileId: string) => void;
      onDragOver: (e: React.DragEvent) => void;
      onDrop: (e: React.DragEvent) => void;
      inputRef: (el: HTMLInputElement | null) => void;
    }) => (
      <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
        <label className="block text-sm font-semibold text-[#f3f4f6] mb-4">
          {title}
          {required && <span className="text-[#a855f7] ml-1">*</span>}
        </label>

        {/* File List */}
        {sectionFiles.length > 0 && (
          <div className="space-y-2 mb-4">
            {sectionFiles.map((fileWithPreview) => (
              <div
                key={fileWithPreview.id}
                className="flex items-center justify-between p-3 bg-[#0b0b0f] border border-[#2a2a32] rounded-lg group hover:border-[#a855f7]/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-[#a855f7] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#f3f4f6] truncate group-hover:text-[#a855f7] transition-colors">
                      {fileWithPreview.file.name}
                    </p>
                    <p className="text-xs text-[#9ca3af]">
                      {formatFileSize(fileWithPreview.file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={fileWithPreview.preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#a855f7] hover:text-[#c084fc] hover:bg-[#a855f7]/10 rounded transition-all duration-300"
                    title="Open preview"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemove(fileWithPreview.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all duration-300"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Zone */}
        <label
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="border-2 border-dashed border-[#2a2a32] rounded-lg p-8 text-center hover:border-[#a855f7] hover:bg-[#a855f7]/5 transition-all duration-300 cursor-pointer block"
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={(e) => onAdd(e.target.files)}
            className="hidden"
          />
          <Upload className="w-12 h-12 mx-auto text-[#6b7280] mb-3 group-hover:text-[#a855f7] transition-colors" />
          <p className="text-[#f3f4f6] font-medium mb-1">
            Drag and drop PDF files here
          </p>
          <p className="text-[#9ca3af] text-sm">or click to browse</p>
          <p className="text-[#6b7280] text-xs mt-2">
            Maximum 20MB per file
          </p>
        </label>
      </div>
    )
  );

  // Conditional sections based on claim type
  const showHealthSections = form.claim_type === "Health";
  const showVehicleSections = form.claim_type === "Vehicle";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#121216] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 text-[#a855f7] animate-spin mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-[#f3f4f6] mb-4">
            Uploading Your Claim...
          </h2>
          <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#9ca3af]">Progress</span>
              <span className="text-sm font-bold text-[#a855f7]">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-[#0b0b0f] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#a855f7] to-[#ec4899] h-2 rounded-full transition-all duration-300 shadow-lg shadow-[#a855f7]/30"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <p className="text-[#9ca3af] text-sm">
            Please don't close this page
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#121216] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <CheckCircle2 className="w-24 h-24 text-[#a855f7] animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold text-[#f3f4f6] mb-2">
            Claim Submitted Successfully!
          </h1>
          <p className="text-[#9ca3af] mb-6">
            Your insurance claim has been received and is being processed by our
            AI system.
          </p>
          <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 mb-8">
            <p className="text-sm text-[#9ca3af] mb-2">Your Claim ID</p>
            <p className="text-2xl font-bold text-[#a855f7] font-mono">
              {claimId}
            </p>
            <p className="text-xs text-[#6b7280] mt-2">
              Save this ID for your records
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20 hover:shadow-[#a855f7]/40"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#121216]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f3f4f6] mb-2">
            File Your Claim
          </h1>
          <p className="text-[#9ca3af]">
            Complete the form below to submit your insurance claim
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Claimant Details Section */}
          <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
            <h2 className="text-xl font-semibold text-[#f3f4f6] mb-6">
              Claimant Details <span className="text-[#a855f7]">*</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Full Name <span className="text-[#a855f7]">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Email <span className="text-[#a855f7]">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Phone <span className="text-[#6b7280]">(optional)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Policy Number <span className="text-[#a855f7]">*</span>
                </label>
                <input
                  type="text"
                  name="policy_no"
                  required
                  value={form.policy_no}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                  placeholder="POL-123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Date of Loss <span className="text-[#a855f7]">*</span>
                </label>
                <input
                  type="date"
                  name="date_of_loss"
                  required
                  value={form.date_of_loss}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Claim Type <span className="text-[#a855f7]">*</span>
                </label>
                <select
                  name="claim_type"
                  required
                  value={form.claim_type}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
                >
                  <option value="">Select claim type</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Health">Health</option>
                  <option value="Property">Property</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                Description <span className="text-[#a855f7]">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={4}
                value={form.description}
                onChange={handleFormChange}
                className="w-full px-4 py-2 rounded-lg bg-[#0d0f14] border border-gray-700 text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300 resize-none"
                placeholder="Describe what happened..."
              />
            </div>
          </div>

          {/* Always Visible Upload Sections */}
          <FileUploadSection
            section="acord"
            title="ACORD / FNOL Form"
            required
            files={files.acord}
            onAdd={(fileList) =>
              handleFileAdd("acord", fileList, fileInputRefs.current.acord || undefined)
            }
            onRemove={(fileId) => handleFileRemove("acord", fileId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "acord")}
            inputRef={(el) => {
              fileInputRefs.current.acord = el;
            }}
          />

          <FileUploadSection
            section="police"
            title="Police Report"
            files={files.police}
            onAdd={(fileList) =>
              handleFileAdd("police", fileList, fileInputRefs.current.police || undefined)
            }
            onRemove={(fileId) => handleFileRemove("police", fileId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "police")}
            inputRef={(el) => {
              fileInputRefs.current.police = el;
            }}
          />

          <FileUploadSection
            section="assessment"
            title="Loss Assessment / Survey Report"
            files={files.assessment}
            onAdd={(fileList) =>
              handleFileAdd(
                "assessment",
                fileList,
                fileInputRefs.current.assessment || undefined
              )
            }
            onRemove={(fileId) => handleFileRemove("assessment", fileId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "assessment")}
            inputRef={(el) => {
              fileInputRefs.current.assessment = el;
            }}
          />

          {/* Health Claim Type Sections */}
          {showHealthSections && (
            <>
              <FileUploadSection
                section="healthEvidence"
                title="Health Evidence (Medical Scans, Lab Reports)"
                files={files.healthEvidence}
                onAdd={(fileList) =>
                  handleFileAdd(
                    "healthEvidence",
                    fileList,
                    fileInputRefs.current.healthEvidence || undefined
                  )
                }
                onRemove={(fileId) => handleFileRemove("healthEvidence", fileId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "healthEvidence")}
                inputRef={(el) => {
                  fileInputRefs.current.healthEvidence = el;
                }}
              />

              <FileUploadSection
                section="bills"
                title="Bills / Invoices"
                files={files.bills}
                onAdd={(fileList) =>
                  handleFileAdd("bills", fileList, fileInputRefs.current.bills || undefined)
                }
                onRemove={(fileId) => handleFileRemove("bills", fileId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "bills")}
                inputRef={(el) => {
                  fileInputRefs.current.bills = el;
                }}
              />

              <FileUploadSection
                section="prescriptions"
                title="Prescriptions"
                files={files.prescriptions}
                onAdd={(fileList) =>
                  handleFileAdd(
                    "prescriptions",
                    fileList,
                    fileInputRefs.current.prescriptions || undefined
                  )
                }
                onRemove={(fileId) => handleFileRemove("prescriptions", fileId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "prescriptions")}
                inputRef={(el) => {
                  fileInputRefs.current.prescriptions = el;
                }}
              />
            </>
          )}

          {/* Vehicle Claim Type Sections */}
          {showVehicleSections && (
            <>
              <FileUploadSection
                section="vehiclePhotos"
                title="Vehicle Photos"
                files={files.vehiclePhotos}
                onAdd={(fileList) =>
                  handleFileAdd(
                    "vehiclePhotos",
                    fileList,
                    fileInputRefs.current.vehiclePhotos || undefined
                  )
                }
                onRemove={(fileId) => handleFileRemove("vehiclePhotos", fileId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "vehiclePhotos")}
                inputRef={(el) => {
                  fileInputRefs.current.vehiclePhotos = el;
                }}
              />

              <FileUploadSection
                section="repairEstimates"
                title="Repair Estimates"
                files={files.repairEstimates}
                onAdd={(fileList) =>
                  handleFileAdd(
                    "repairEstimates",
                    fileList,
                    fileInputRefs.current.repairEstimates || undefined
                  )
                }
                onRemove={(fileId) => handleFileRemove("repairEstimates", fileId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "repairEstimates")}
                inputRef={(el) => {
                  fileInputRefs.current.repairEstimates = el;
                }}
              />
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 px-6 py-3 border border-[#2a2a32] text-[#f3f4f6] rounded-lg hover:bg-[#1a1a22] hover:border-[#a855f7]/50 transition-all duration-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-6 py-3 border border-[#2a2a32] text-[#9ca3af] rounded-lg hover:bg-[#1a1a22] hover:text-[#f3f4f6] transition-all duration-300 font-medium"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20 hover:shadow-[#a855f7]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Claim
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;