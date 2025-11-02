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
                {(claim as any).claim_number || claim.id}
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

            {/* Extracted Document Data - Better Format */}
            {(() => {
              // Get analyses data from claim
              const analyses = (claim as any).analyses || {};
              const extractedDataByDoc: Record<string, Record<string, any>> = {};
              
              // Organize extracted data by document type
              for (const [docType, analysis] of Object.entries(analyses)) {
                const extraction = (analysis as any)?.extraction || {};
                if (extraction && Object.keys(extraction).length > 0) {
                  extractedDataByDoc[docType] = extraction;
                }
              }
              
              // Also check if description exists but parse it better
              if (Object.keys(extractedDataByDoc).length === 0 && claim.description) {
                // Parse description if it exists but analyses are missing
                // This is a fallback for old claims
                const descLines = claim.description.split('\n');
                let currentDoc = '';
                extractedDataByDoc['parsed'] = {};
                for (const line of descLines) {
                  if (line.includes('Document:') && !line.startsWith('Extracted')) {
                    currentDoc = line.replace('Document:', '').trim().toLowerCase();
                    if (!extractedDataByDoc[currentDoc]) {
                      extractedDataByDoc[currentDoc] = {};
                    }
                  } else if (line.trim().startsWith('-') && currentDoc) {
                    const parts = line.trim().substring(1).split(':');
                    if (parts.length >= 2) {
                      const key = parts[0].trim().replace(/\s+/g, '_').toLowerCase();
                      const value = parts.slice(1).join(':').trim();
                      extractedDataByDoc[currentDoc][key] = value;
                    }
                  }
                }
              }
              
              if (Object.keys(extractedDataByDoc).length > 0) {
                return (
                  <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
                    <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#a855f7]" />
                      Extracted Document Data
                    </h2>
                    <div className="space-y-4">
                      {Object.entries(extractedDataByDoc).map(([docType, data]) => (
                        <div
                          key={docType}
                          className="bg-[#0b0b0f] border border-[#2a2a32] rounded-lg p-4"
                        >
                          <h3 className="text-sm font-semibold text-[#a855f7] mb-3 uppercase tracking-wide">
                            {docType === 'parsed' ? 'Extracted Data' : `${docType.toUpperCase()} Document`}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(data).map(([key, value]) => {
                              if (!value || value === null || value === '') return null;
                              
                              // Format field name nicely
                              const fieldName = key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l) => l.toUpperCase());
                              
                              // Format value based on type
                              let displayValue = String(value);
                              if (typeof value === 'object') {
                                displayValue = JSON.stringify(value);
                              }
                              
                              return (
                                <div
                                  key={key}
                                  className="bg-[#1a1a22] border border-[#2a2a32] rounded p-3 hover:border-[#a855f7]/30 transition-colors"
                                >
                                  <p className="text-xs font-medium text-[#9ca3af] mb-1 uppercase tracking-wide">
                                    {fieldName}
                                  </p>
                                  <p className="text-sm font-medium text-[#f3f4f6] break-words">
                                    {displayValue}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* AI Analysis */}
            {(claim as any).ai_analysis && (
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">
                  AI Analysis
              </h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#9ca3af] mb-1">Fraud Risk</p>
                      <p className={`text-sm font-medium ${
                        (claim as any).ai_analysis.fraud_risk === "High" ? "text-red-400" :
                        (claim as any).ai_analysis.fraud_risk === "Medium" ? "text-yellow-400" :
                        "text-green-400"
                      }`}>
                        {(claim as any).ai_analysis.fraud_risk} ({(claim as any).ai_analysis.fraud_score * 100}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#9ca3af] mb-1">Complexity</p>
                      <p className={`text-sm font-medium ${
                        (claim as any).ai_analysis.complexity_assessment === "High" ? "text-red-400" :
                        (claim as any).ai_analysis.complexity_assessment === "Medium" ? "text-yellow-400" :
                        "text-green-400"
                      }`}>
                        {(claim as any).ai_analysis.complexity_assessment} (Score: {(claim as any).ai_analysis.complexity_score})
              </p>
            </div>
                  </div>
                  {(claim as any).ai_analysis.risk_factors && (claim as any).ai_analysis.risk_factors.length > 0 && (
                    <div className="pt-3 border-t border-[#2a2a32]">
                      <p className="text-xs text-[#9ca3af] mb-2">Risk Factors</p>
                      <ul className="list-disc list-inside space-y-1">
                        {(claim as any).ai_analysis.risk_factors.map((factor: string, idx: number) => (
                          <li key={idx} className="text-sm text-[#f3f4f6]">{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Rationale */}
            {claim.rationale && (
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">
                AI Analysis & Rationale
              </h2>
                <div className="text-sm text-[#9ca3af] whitespace-pre-line">
                {claim.rationale}
                </div>
            </div>
            )}

            {/* Evidence & Sources Section */}
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
                <div className="space-y-4">
                  {/* Evidence from Extracted Data */}
                  {claim.evidence && claim.evidence.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-[#f3f4f6] mb-3">Evidence from Documents</h4>
                <div className="space-y-3">
                        {claim.evidence.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 bg-[#0b0b0f] rounded-lg border border-[#2a2a32]/50 hover:border-[#a855f7]/30 transition-all duration-300"
                      >
                            {item.source && (
                              <p className="text-sm font-medium text-[#f3f4f6] mb-2">
                              {item.source}
                            </p>
                            )}
                            {item.type && (
                              <p className="text-xs text-[#9ca3af] mb-2">Type: {item.type}</p>
                            )}
                            {item.fields && item.fields.length > 0 ? (
                              <div className="space-y-1">
                                {item.fields.map((field: any, fieldIdx: number) => (
                                  <div key={fieldIdx} className="text-sm text-[#9ca3af]">
                                    <span className="text-[#a855f7]">
                                      {field.field || field.key || "Field"}:
                                    </span>{" "}
                                    {field.value || field.data || "N/A"}
                          </div>
                                ))}
                        </div>
                            ) : item.span ? (
                              <div>
                                {item.page && (
                                  <p className="text-xs text-[#9ca3af] mb-2">Page {item.page}</p>
                                )}
                        <p className="text-sm text-[#f3f4f6] italic border-l-2 border-[#a855f7] pl-3">
                          "{item.span}"
                        </p>
                      </div>
                            ) : (
                              <p className="text-sm text-[#9ca3af]">No fields available</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Sources (PDF Documents) */}
                  {(claim as any).sources && (claim as any).sources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-[#f3f4f6] mb-3">Document Sources</h4>
                      <div className="space-y-2">
                        {(claim as any).sources.map((source: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#0b0b0f] rounded-lg border border-[#2a2a32]/50 hover:border-[#a855f7]/30 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#f3f4f6]">
                                  {source.filename || source.document_type?.toUpperCase() || `Source ${idx + 1}`}
                                </p>
                                <p className="text-xs text-[#9ca3af] mt-1">
                                  {source.source || "Uploaded PDF Document"}
                                </p>
                                {source.extraction_status && (
                                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                                    source.extraction_status === "Completed" 
                                      ? "bg-green-500/20 text-green-400" 
                                      : "bg-yellow-500/20 text-yellow-400"
                                  }`}>
                                    {source.extraction_status}
                                  </span>
                                )}
                              </div>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 text-[#a855f7] hover:text-[#c084fc] text-sm font-medium"
                                >
                                  View PDF →
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!claim.evidence || claim.evidence.length === 0) && 
                   (!(claim as any).sources || (claim as any).sources.length === 0) && (
                    <p className="text-[#9ca3af]">
                      No evidence items or sources available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Claim Details, ML Scores, Routing, & Documents */}
          <div className="space-y-6">
            {/* Claim Information Card */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                Claim Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#9ca3af] mb-1">Claim Type</p>
                  <p className="text-sm font-medium text-[#f3f4f6] capitalize">
                    {(claim as any).claim_type || claim.loss_type || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9ca3af] mb-1">Claim ID</p>
                  <p className="text-sm font-mono text-[#a855f7] font-medium">
                    {(claim as any).claim_number || claim.id || "N/A"}
                  </p>
                </div>
                {(claim as any).ml_scores && (
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-1">Damage Amount</p>
                    <p className="text-sm font-medium text-[#f3f4f6]">
                      {(() => {
                        const analyses = (claim as any).analyses || {};
                        const lossAnalysis = analyses.loss || {};
                        const damage = lossAnalysis.damage_estimate || lossAnalysis.estimated_damage || "N/A";
                        return typeof damage === "number" ? `$${damage.toLocaleString()}` : damage;
                      })()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ML Model Scores */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                ML Model Scores
              </h3>
              <div className="space-y-4">
                {/* Fraud Score */}
                {(() => {
                  const mlScores = (claim as any).ml_scores || {};
                  const fraudScore = (claim as any).fraud_score ?? mlScores.fraud_score ?? null;
                  return fraudScore !== null && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#9ca3af]">Fraud Score</span>
                        <span className={`text-lg font-bold ${
                          fraudScore >= 0.6 ? "text-red-400" :
                          fraudScore > 0.3 ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {(fraudScore * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#0b0b0f] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            fraudScore >= 0.6 ? "bg-red-500" :
                            fraudScore > 0.3 ? "bg-yellow-500" :
                            "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(fraudScore * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Complexity Score */}
                {(() => {
                  const mlScores = (claim as any).ml_scores || {};
                  const complexityScore = (claim as any).complexity_score ?? mlScores.complexity_score ?? null;
                  return complexityScore !== null && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#9ca3af]">Complexity Score</span>
                        <span className="text-lg font-bold text-[#a855f7]">
                          {complexityScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-[#0b0b0f] rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all bg-gradient-to-r from-[#a855f7] to-[#ec4899]"
                          style={{ width: `${Math.min((complexityScore / 5) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#9ca3af] mt-1">
                        {complexityScore >= 3.5 ? "High Complexity" :
                         complexityScore >= 2 ? "Medium Complexity" :
                         "Low Complexity"}
                      </p>
                    </div>
                  );
                })()}

                {/* Severity Level */}
                {(() => {
                  const mlScores = (claim as any).ml_scores || {};
                  const severityLevel = (claim as any).severity_level ?? mlScores.severity_level ?? claim.severity ?? null;
                  return severityLevel && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#9ca3af]">Severity Level</span>
                        <span className={`text-lg font-bold ${
                          severityLevel === "High" ? "text-red-400" :
                          severityLevel === "Medium" ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {severityLevel}
                        </span>
                      </div>
                      <div className="w-full bg-[#0b0b0f] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            severityLevel === "High" ? "bg-red-500" :
                            severityLevel === "Medium" ? "bg-yellow-500" :
                            "bg-green-500"
                          }`}
                          style={{
                            width: severityLevel === "High" ? "100%" :
                                   severityLevel === "Medium" ? "66%" : "33%"
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Litigation Score */}
                {(() => {
                  const mlScores = (claim as any).ml_scores || {};
                  const litigationScore = mlScores.litigation_score ?? null;
                  const litigationFlag = mlScores.litigation_flag ?? false;
                  const litigationReasons = mlScores.litigation_reasons || [];
                  return litigationScore !== null && (
                    <div className="pt-4 border-t border-[#2a2a32]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#9ca3af]">Litigation Score</span>
                          {litigationFlag && (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
                              Flagged
                            </span>
                          )}
                        </div>
                        <span className={`text-lg font-bold ${
                          litigationScore >= 0.5 ? "text-orange-400" :
                          litigationScore >= 0.3 ? "text-yellow-400" :
                          "text-[#9ca3af]"
                        }`}>
                          {(litigationScore * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#0b0b0f] rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            litigationScore >= 0.5 ? "bg-orange-500" :
                            litigationScore >= 0.3 ? "bg-yellow-500" :
                            "bg-[#4b5563]"
                          }`}
                          style={{ width: `${Math.min(litigationScore * 100, 100)}%` }}
                        />
                      </div>
                      {litigationReasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-[#9ca3af] mb-1.5 font-medium">Reasons:</p>
                          <ul className="space-y-1">
                            {litigationReasons.map((reason: string, idx: number) => (
                              <li key={idx} className="text-xs text-[#f3f4f6] flex items-start gap-2">
                                <span className="text-orange-400 mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Subrogation Score */}
                {(() => {
                  const mlScores = (claim as any).ml_scores || {};
                  const subrogationScore = mlScores.subrogation_score ?? null;
                  const subrogationFlag = mlScores.subrogation_flag ?? false;
                  const subrogationReasons = mlScores.subrogation_reasons || [];
                  return subrogationScore !== null && (
                    <div className="pt-4 border-t border-[#2a2a32]">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#9ca3af]">Subrogation Score</span>
                          {subrogationFlag && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                              Flagged
                            </span>
                          )}
                        </div>
                        <span className={`text-lg font-bold ${
                          subrogationScore >= 0.5 ? "text-blue-400" :
                          subrogationScore >= 0.3 ? "text-cyan-400" :
                          "text-[#9ca3af]"
                        }`}>
                          {(subrogationScore * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#0b0b0f] rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            subrogationScore >= 0.5 ? "bg-blue-500" :
                            subrogationScore >= 0.3 ? "bg-cyan-500" :
                            "bg-[#4b5563]"
                          }`}
                          style={{ width: `${Math.min(subrogationScore * 100, 100)}%` }}
                        />
                      </div>
                      {subrogationReasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-[#9ca3af] mb-1.5 font-medium">Reasons:</p>
                          <ul className="space-y-1">
                            {subrogationReasons.map((reason: string, idx: number) => (
                              <li key={idx} className="text-xs text-[#f3f4f6] flex items-start gap-2">
                                <span className="text-blue-400 mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Routing Information */}
            {(() => {
              const routing = (claim as any).routing || {};
              const routingTeam = (claim as any).routing_team || (claim as any).final_team || claim.queue || "";
              const adjuster = (claim as any).adjuster || (claim as any).final_adjuster || routing.adjuster || "";
              const routingReasons = routing.routing_reasons || routing.routing_reason || [];
              const reasons = Array.isArray(routingReasons) ? routingReasons : [routingReasons].filter(Boolean);

              if (routingTeam || adjuster || reasons.length > 0) {
                return (
                  <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
                    <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                      Routing Information
                    </h3>
                    <div className="space-y-3">
                      {routingTeam && (
                        <div>
                          <p className="text-xs text-[#9ca3af] mb-1">Assigned Team</p>
                          <p className="text-sm font-medium text-[#f3f4f6]">{routingTeam}</p>
                          <p className="text-xs text-[#6b7280] mt-1">
                            {routingTeam.includes("Health Dept") && routingTeam.includes("High") ? "Health Department - High Complexity Team" :
                             routingTeam.includes("Health Dept") && routingTeam.includes("Mid") ? "Health Department - Medium Complexity Team" :
                             routingTeam.includes("Health Dept") ? "Health Department - Standard Processing Team" :
                             routingTeam.includes("Accident Dept") && routingTeam.includes("High") ? "Accident Department - High Complexity Team" :
                             routingTeam.includes("Accident Dept") && routingTeam.includes("Mid") ? "Accident Department - Medium Complexity Team" :
                             routingTeam.includes("Accident Dept") ? "Accident Department - Standard Processing Team" :
                             routingTeam.includes("SIU") || routingTeam.includes("Fraud") ? "Special Investigation Unit" :
                             ""}
                          </p>
                        </div>
                      )}
                      {adjuster && (
                        <div>
                          <p className="text-xs text-[#9ca3af] mb-1">Assigned Adjuster</p>
                          <p className="text-sm font-medium text-[#f3f4f6]">{adjuster}</p>
                        </div>
                      )}
                      {reasons.length > 0 && (
                        <div>
                          <p className="text-xs text-[#9ca3af] mb-2">Transfer Reason</p>
                          <ul className="list-disc list-inside space-y-1">
                            {reasons.map((reason: string, idx: number) => (
                              <li key={idx} className="text-sm text-[#a855f7]">{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Proof / Documents with PDF Data */}
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#a855f7]" />
                Proof / Documents
              </h3>
              <div className="space-y-4">
                {(() => {
                  const files = (claim as any).files || {};
                  const analyses = (claim as any).analyses || {};
                  // Ensure attachments is always an array
                  const attachments = Array.isArray(claim.attachments) 
                    ? claim.attachments 
                    : (claim.attachments && typeof claim.attachments === 'object' 
                        ? Object.values(claim.attachments).filter((item: any) => item && typeof item === 'object')
                        : []);
                  
                  // Combine files from both sources
                  const allFiles: Array<{ 
                    filename: string; 
                    url: string; 
                    type?: string;
                    analysis?: any;
                    extraction?: any;
                  }> = [];
                  
                  // Add files from claim.files object with analyses
                  if (files && typeof files === 'object' && !Array.isArray(files)) {
                    Object.entries(files).forEach(([key, value]) => {
                      if (value && typeof value === "string") {
                        const analysis = analyses[key];
                        allFiles.push({
                          filename: `${key.toUpperCase()}.pdf`,
                          url: value,
                          type: key,
                          analysis: analysis,
                          extraction: analysis?.extraction || {}
                        });
                      }
                    });
                  }
                  
                  // Add attachments (ensure it's an array before forEach)
                  if (Array.isArray(attachments)) {
                    attachments.forEach((att: any) => {
                      if (att && (att.filename || att.url)) {
                        const fileType = att.type || 
                          ((att.filename || att.url || '').toLowerCase().includes("acord") ? "acord" :
                          (att.filename || att.url || '').toLowerCase().includes("loss") ? "loss" :
                          (att.filename || att.url || '').toLowerCase().includes("hospital") ? "hospital" :
                          (att.filename || att.url || '').toLowerCase().includes("fir") ? "fir" :
                          (att.filename || att.url || '').toLowerCase().includes("rc") ? "rc" :
                          (att.filename || att.url || '').toLowerCase().includes("dl") ? "dl" :
                          "other");
                        
                        const analysis = analyses[fileType];
                        allFiles.push({
                          filename: att.filename || att.url?.split('/').pop() || 'document.pdf',
                          url: att.url || att,
                          type: fileType,
                          analysis: analysis,
                          extraction: analysis?.extraction || {}
                        });
                      }
                    });
                  }

                  if (allFiles.length > 0) {
                    return allFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0b0b0f] border border-[#2a2a32] rounded-lg p-4 hover:border-[#a855f7]/50 transition-all duration-300"
                      >
                        {/* Document Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-6 h-6 text-[#a855f7] flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#f3f4f6] truncate">
                                {file.filename}
                              </p>
                              {file.type && (
                                <p className="text-xs text-[#9ca3af] capitalize mt-0.5">
                                  {file.type} Document
                                  {file.analysis?.document_type && ` • ${file.analysis.document_type}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setSelectedPdf({
                                filename: file.filename,
                                url: file.url,
                              })
                            }
                            className="px-3 py-1.5 bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#a855f7] text-xs font-medium rounded-lg transition-all duration-300 flex-shrink-0"
                          >
                            View PDF
                          </button>
                        </div>

                        {/* Extracted Data from PDF */}
                        {file.extraction && Object.keys(file.extraction).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#2a2a32]">
                            <p className="text-xs font-semibold text-[#9ca3af] mb-2 uppercase tracking-wide">
                              Extracted Data
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(file.extraction).slice(0, 8).map(([key, value]: [string, any]) => {
                                if (!value || value === null || value === '') return null;
                                return (
                                  <div key={key} className="bg-[#1a1a22] border border-[#2a2a32] rounded p-2">
                                    <p className="text-xs text-[#9ca3af] mb-0.5 truncate">
                                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                    <p className="text-xs font-medium text-[#f3f4f6] truncate">
                                      {String(value)}
                                    </p>
                                  </div>
                                );
                              })}
                              {Object.keys(file.extraction).length > 8 && (
                                <div className="col-span-2 text-xs text-[#9ca3af] pt-1">
                                  +{Object.keys(file.extraction).length - 8} more fields
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Analysis Status */}
                        {file.analysis && (
                          <div className="mt-3 pt-3 border-t border-[#2a2a32] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                file.analysis.validation?.status === 'valid' ? 'bg-green-400' :
                                file.analysis.validation?.status === 'invalid' ? 'bg-red-400' :
                                'bg-yellow-400'
                              }`}></span>
                              <span className="text-xs text-[#9ca3af]">
                                {file.analysis.validation?.status === 'valid' ? 'Validated' :
                                 file.analysis.validation?.status === 'invalid' ? 'Validation Failed' :
                                 file.analysis.validation?.status === 'skipped' ? 'Validation Skipped' :
                                 'Pending Validation'}
                              </span>
                            </div>
                            {file.analysis.text_summary?.chars && (
                              <span className="text-xs text-[#6b7280]">
                                {file.analysis.text_summary.chars} chars extracted
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ));
                  }
                  return (
                    <p className="text-[#9ca3af] text-sm text-center py-4">
                      No documents available
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Confidence Score (Legacy - keeping for compatibility) */}
            {claim.confidence && (
            <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">
                Confidence Score
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[#9ca3af]">AI Confidence</span>
                    <span className="text-2xl font-bold text-[#a855f7]">
                      {(claim.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0b0b0f] rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#a855f7] to-[#ec4899] h-3 rounded-full transition-all shadow-lg shadow-[#a855f7]/30"
                      style={{ width: `${claim.confidence * 100}%` }}
                      />
                  </div>
                </div>
                <p className="text-xs text-[#9ca3af]">
                  Based on AI analysis of uploaded documents and form data
                </p>
              </div>
            </div>
            )}
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
