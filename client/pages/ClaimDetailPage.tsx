import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Badge from "@/components/shared/Badge";
import PdfViewerModal from "@/components/shared/PdfViewerModal";
import ReassignModal from "@/components/claims/ReassignModal";
import { fetchClaim, ClaimDetailResponse } from "@/api/claims";

const ClaimDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<ClaimDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{
    filename: string;
    url: string;
  } | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<boolean>(true);

  useEffect(() => {
    loadClaim();
  }, [id]);

  const loadClaim = async () => {
    if (!id) {
      navigate("/team");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchClaim(id);
      setClaim(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load claim";
      toast.error(errorMessage);
      navigate("/team");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#1a1a22] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-t-[#a855f7] border-[#a855f7]/20 mx-auto mb-4"></div>
          <p className="text-[#9ca3af]">Loading claim...</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#1a1a22] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] text-lg mb-4">Claim not found</p>
          <button
            onClick={() => navigate("/team")}
            className="mt-4 text-[#a855f7] hover:text-[#c084fc] transition-colors duration-300 underline"
          >
            Back to Claims
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#1a1a22]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate("/team")}
          className="flex items-center gap-2 text-[#9ca3af] hover:text-[#a855f7] mb-6 transition-all duration-300 ease-in-out"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Claims
        </button>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#f3f4f6] mb-2">
                {claim.id}
              </h1>
              <p className="text-[#9ca3af]">{claim.claimant}</p>
            </div>
            <button
              onClick={() => setShowReassignModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20 hover:shadow-[#a855f7]/40"
            >
              Reassign Claim
            </button>
          </div>

          {/* Status Bar */}
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="severity" severity={claim.severity}>
              {claim.severity} Severity
            </Badge>
            <Badge variant="status" status={claim.status}>
              {claim.status}
            </Badge>
            <Badge variant="queue">{claim.queue}</Badge>
            <span className="text-sm text-[#9ca3af]">
              Created {formatDate(claim.created_at)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Claim Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claimant Information */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">
                Claimant Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#9ca3af] mb-1">Name</p>
                  <p className="text-[#f3f4f6] font-medium">{claim.claimant}</p>
                </div>
                <div>
                  <p className="text-sm text-[#9ca3af] mb-1">Email</p>
                  <p className="text-[#f3f4f6] font-medium">{claim.email}</p>
                </div>
                <div>
                  <p className="text-sm text-[#9ca3af] mb-1">
                    Policy Number
                  </p>
                  <p className="text-[#f3f4f6] font-medium">
                    {claim.policyNumber || claim.policy_no}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#9ca3af] mb-1">
                    Loss Type
                  </p>
                  <p className="text-[#f3f4f6] font-medium">{claim.loss_type}</p>
                </div>
              </div>
            </div>

            {/* Claim Description */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">
                Description
              </h2>
              <p className="text-[#f3f4f6] leading-relaxed">
                {claim.description}
              </p>
            </div>

            {/* AI Rationale */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">
                AI Analysis & Rationale
              </h2>
              <p className="text-[#f3f4f6] leading-relaxed">
                {claim.rationale}
              </p>
            </div>

            {/* Evidence Section */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <button
                onClick={() => setExpandedEvidence(!expandedEvidence)}
                className="w-full flex items-center justify-between mb-4 hover:text-[#a855f7] transition-colors"
              >
                <h2 className="text-xl font-semibold text-[#f3f4f6]">
                  Evidence & Sources
                </h2>
                <ChevronDown
                  className={`w-5 h-5 text-[#9ca3af] transition-transform duration-300 ${
                    expandedEvidence ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedEvidence && (
                <div className="space-y-3">
                  {claim.evidence && claim.evidence.length > 0 ? (
                    claim.evidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-[#0b0b0f] rounded-lg border border-[#2a2a32]/50 hover:border-[#a855f7]/30 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-[#f3f4f6]">
                              {item.source}
                            </p>
                            <p className="text-xs text-[#9ca3af]">
                              Page {item.page}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-[#f3f4f6] italic border-l-2 border-[#a855f7] pl-3">
                          "{item.span}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#9ca3af]">
                      No evidence items available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Analysis & Attachments */}
          <div className="space-y-6">
            {/* Confidence Score */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                Confidence Score
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#9ca3af]">
                      AI Confidence
                    </span>
                    <span className="text-2xl font-bold text-[#a855f7]">
                      {(claim.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0b0b0f] rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#a855f7] to-[#ec4899] h-3 rounded-full transition-all shadow-lg shadow-[#a855f7]/30"
                      style={{ width: `${claim.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-[#9ca3af]">
                  Based on AI analysis of uploaded documents and form data
                </p>
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                Attachments
              </h3>
              <div className="space-y-2">
                {claim.attachments && claim.attachments.length > 0 ? (
                  claim.attachments.map((attachment) => (
                    <button
                      key={attachment.filename}
                      onClick={() =>
                        setSelectedPdf({
                          filename: attachment.filename,
                          url: attachment.url,
                        })
                      }
                      className="w-full flex items-center justify-between p-3 hover:bg-[#0b0b0f] rounded-lg transition-all duration-300 text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-5 h-5 text-[#a855f7] flex-shrink-0 group-hover:text-[#c084fc] transition-colors" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f3f4f6] truncate group-hover:text-[#a855f7] transition-colors">
                            {attachment.filename}
                          </p>
                          {attachment.size && (
                            <p className="text-xs text-[#9ca3af]">
                              {attachment.size}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[#a855f7] text-sm flex-shrink-0 group-hover:text-[#c084fc] transition-colors">
                        View
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-[#9ca3af] text-sm">
                    No attachments available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {selectedPdf && (
        <PdfViewerModal
          isOpen={true}
          onClose={() => setSelectedPdf(null)}
          filename={selectedPdf.filename}
          url={selectedPdf.url}
        />
      )}

      {/* Reassign Modal */}
      <ReassignModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        claimId={id || ""}
        onSuccess={loadClaim}
      />
    </div>
  );
};

export default ClaimDetailPage;
