import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Badge from "@/components/shared/Badge";
import PdfViewerModal from "@/components/shared/PdfViewerModal";
import ReassignModal from "@/components/claims/ReassignModal";
import { fetchClaim, ClaimDetailResponse } from "@/api/claims";
import ClaimChat from "@/components/claims/ClaimChat";

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
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [showAllDocFields, setShowAllDocFields] = useState<boolean>(false);

  const scrollTo = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

        {/* Top Insights Strip */}
        {(() => {
          const ml = (claim as any).ml_scores || {};
          const fraudScore = (claim as any).fraud_score ?? ml.fraud_score ?? null;
          const complexityScore = (claim as any).complexity_score ?? ml.complexity_score ?? null;
          const severityLevel = (claim as any).severity_level ?? ml.severity_level ?? claim.severity ?? null;
          const routing = (claim as any).routing || {};
          const routingTeam = (claim as any).routing_team || (claim as any).final_team || routing.routing_team || claim.queue || null;
          const adjuster = (claim as any).adjuster || (claim as any).final_adjuster || routing.adjuster || null;
          const claimType = (claim as any).claim_type || claim.loss_type || null;

          const kpiClass = "bg-[#0b0b0f] border border-[#2a2a32] rounded-xl p-4 hover:border-[#a855f7]/30 transition-all";

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <div className={kpiClass}>
                <p className="text-xs text-[#9ca3af] mb-1">Claim ID</p>
                <p className="text-sm font-mono text-[#f3f4f6] truncate">{(claim as any).claim_number || claim.id}</p>
              </div>
              {fraudScore !== null && Number.isFinite(fraudScore) && (
                <div className={kpiClass}>
                  <p className="text-xs text-[#9ca3af] mb-1">Fraud</p>
                  <p className={`text-2xl font-bold ${fraudScore >= 0.6 ? "text-red-400" : fraudScore > 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                    {(fraudScore * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {complexityScore !== null && Number.isFinite(complexityScore) && (
                <div className={kpiClass}>
                  <p className="text-xs text-[#9ca3af] mb-1">Complexity</p>
                  <p className="text-2xl font-bold text-[#a855f7]">{complexityScore.toFixed(1)}</p>
                </div>
              )}
              {severityLevel && (
                <div className={kpiClass}>
                  <p className="text-xs text-[#9ca3af] mb-1">Severity</p>
                  <p className={`text-lg font-semibold ${severityLevel === "High" ? "text-red-400" : severityLevel === "Medium" ? "text-yellow-400" : "text-green-400"}`}>{severityLevel}</p>
                </div>
              )}
              {routingTeam && (
                <div className={kpiClass}>
                  <p className="text-xs text-[#9ca3af] mb-1">Routing Team</p>
                  <p className="text-sm font-medium text-[#f3f4f6] truncate">{routingTeam}</p>
                </div>
              )}
              <div className={kpiClass}>
                <p className="text-xs text-[#9ca3af] mb-1">Adjuster</p>
                <p className="text-sm font-medium text-[#f3f4f6] truncate">{adjuster || "—"}</p>
              </div>
              {claimType && (
                <div className={kpiClass + " xl:col-span-2 hidden xl:block"}>
                  <p className="text-xs text-[#9ca3af] mb-1">Claim Type</p>
                  <p className="text-sm font-medium text-[#f3f4f6] capitalize">{claimType}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Sticky Sub-navigation */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-[#0b0b0f]/80 backdrop-blur border-b border-[#2a2a32] mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "documents", label: "Documents" },
              { id: "ai", label: "AI & ML" },
              { id: "evidence", label: "Evidence" },
              { id: "routing", label: "Routing" },
              { id: "chat", label: "Chat" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="px-3 py-1.5 rounded-md text-sm text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-[#1a1a22] border border-transparent hover:border-[#2a2a32] transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Claim Details */}
          <div className="xl:col-span-8 space-y-6">
            {/* Overview Anchor */}
            <div id="overview" className="h-0" />
            {/* Key Details extracted from PDFs (at the top as requested) */}
            {(() => {
              const analyses: Record<string, any> = (claim as any).analyses || {};

              // Helper to safely read first non-empty value from possible keys
              const first = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

              const accord = analyses.acord || analyses.accord || {};
              const lossDoc = analyses.loss || {};
              const firDoc = analyses.fir || {};
              const hospitalDoc = analyses.hospital || {};

              const exAccord = accord.extraction || {};
              const exLoss = lossDoc.extraction || {};
              const exFir = firDoc.extraction || {};
              const exHospital = hospitalDoc.extraction || {};

              const claimNo = first(
                (claim as any).claim_number,
                claim.id,
                exAccord.claim_id,
                exLoss.claim_id,
                exFir.claim_id,
                exHospital.claim_id,
                claim.policy_no,
                claim.policyNumber
              );

              const incidentDate = first(
                exAccord.incident_date,
                exFir.incident_date,
                exLoss.loss_date
              );

              const insuranceStart = first(
                exAccord.insurance_start_date
              );

              const insuranceEnd = first(
                exAccord.insurance_expiry_date
              );

              const damageAmount = first(
                exLoss.approved_repair_amount,
                exLoss.estimated_damage_cost
              );

              const damageType = first(
                exLoss.total_loss === true ? "Total Loss" : undefined,
                exLoss.total_loss === false ? "Repairable" : undefined,
                (claim as any).loss_type
              );

              const patientOrVehicle = first(
                exHospital.patient_id,
                exAccord.patient_id,
                exAccord.registration
              );

              const hasAny = first(claimNo, incidentDate, insuranceStart, insuranceEnd, damageAmount, damageType, patientOrVehicle);

              if (!hasAny) return null;

              const fmtDate = (d?: string) => {
                try { return d ? new Date(d).toLocaleDateString() : undefined; } catch { return d; }
              };

              return (
                <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
                  <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">Key Details (from PDFs)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {claimNo && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Claim Number</p>
                        <p className="text-sm font-medium text-[#f3f4f6] break-words">{String(claimNo)}</p>
                      </div>
                    )}
                    {incidentDate && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Incident / Loss Date</p>
                        <p className="text-sm font-medium text-[#f3f4f6]">{fmtDate(String(incidentDate))}</p>
                      </div>
                    )}
                    {insuranceStart && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Insurance Start</p>
                        <p className="text-sm font-medium text-[#f3f4f6]">{fmtDate(String(insuranceStart))}</p>
                      </div>
                    )}
                    {insuranceEnd && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Insurance Expiry</p>
                        <p className="text-sm font-medium text-[#f3f4f6]">{fmtDate(String(insuranceEnd))}</p>
                      </div>
                    )}
                    {damageAmount !== undefined && damageAmount !== null && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Damage Amount</p>
                        <p className="text-sm font-medium text-[#f3f4f6]">{
                          typeof damageAmount === 'number' ? `$${damageAmount.toLocaleString()}` : String(damageAmount)
                        }</p>
                      </div>
                    )}
                    {damageType && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Type of Damage</p>
                        <p className="text-sm font-medium text-[#f3f4f6]">{String(damageType)}</p>
                      </div>
                    )}
                    {patientOrVehicle && (
                      <div>
                        <p className="text-xs text-[#9ca3af] mb-1">Patient ID / Registration</p>
                        <p className="text-sm font-medium text-[#f3f4f6] break-words">{String(patientOrVehicle)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
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


            {/* Documents Hub */}
            {(() => {
              const files = (claim as any).files || {};
              const analyses = (claim as any).analyses || {};
              const attachments = Array.isArray(claim.attachments)
                ? claim.attachments
                : (claim.attachments && typeof claim.attachments === "object"
                    ? Object.values(claim.attachments).filter((item: any) => item && typeof item === "object")
                    : []);

              const allFiles: Array<{ key: string; filename: string; url: string; type?: string; extraction?: any; analysis?: any }>= [];

              if (files && typeof files === "object" && !Array.isArray(files)) {
                Object.entries(files).forEach(([key, value]) => {
                  if (value && typeof value === "string") {
                    const analysis = analyses[key];
                    allFiles.push({
                      key,
                      filename: `${key.toUpperCase()}.pdf`,
                      url: value,
                      type: key,
                      extraction: analysis?.extraction || {},
                      analysis,
                    });
                  }
                });
              }

              if (Array.isArray(attachments)) {
                attachments.forEach((att: any, idx: number) => {
                  if (att && (att.filename || att.url)) {
                    const name = att.filename || att.url?.split("/").pop() || `document_${idx}.pdf`;
                    const fileType = att.type ||
                      (name.toLowerCase().includes("acord") ? "acord" :
                       name.toLowerCase().includes("loss") ? "loss" :
                       name.toLowerCase().includes("hospital") ? "hospital" :
                       name.toLowerCase().includes("fir") ? "fir" :
                       name.toLowerCase().includes("rc") ? "rc" :
                       name.toLowerCase().includes("dl") ? "dl" : "other");
                    const analysis = analyses[fileType];
                    allFiles.push({
                      key: `${fileType}_${idx}`,
                      filename: name,
                      url: att.url || att,
                      type: fileType,
                      extraction: analysis?.extraction || {},
                      analysis,
                    });
                  }
                });
              }

              if (allFiles.length === 0) return null;
              const selected = activeDoc || allFiles[0]?.key;
              const selectedDoc = allFiles.find((d) => d.key === selected) || allFiles[0];
              if (!activeDoc && allFiles[0]) setActiveDoc(allFiles[0].key);

              const fields = selectedDoc?.extraction ? Object.entries(selectedDoc.extraction) as Array<[string, any]> : [];
              const maxFields = showAllDocFields ? fields.length : Math.min(fields.length, 12);

              return (
                <div id="documents" className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
                  <h2 className="text-xl font-semibold text-[#f3f4f6] mb-4">Documents & Extracted Data</h2>
                  {/* Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
                    {allFiles.map((doc) => (
                      <button
                        key={doc.key}
                        onClick={() => { setActiveDoc(doc.key); setShowAllDocFields(false); }}
                        className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap border transition-colors ${
                          (selected === doc.key)
                            ? "bg-[#a855f7]/20 border-[#a855f7]/40 text-[#f3f4f6]"
                            : "bg-[#0b0b0f] border-[#2a2a32] text-[#9ca3af] hover:border-[#a855f7]/30"
                        }`}
                      >
                        {doc.type ? doc.type.toUpperCase() : doc.filename}
                      </button>
                    ))}
                  </div>

                  {/* Selected Doc Panel */}
                  <div className="mt-4 bg-[#0b0b0f] border border-[#2a2a32] rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#f3f4f6]">{selectedDoc.filename}</p>
                        {selectedDoc.type && (
                          <p className="text-xs text-[#9ca3af] capitalize">{selectedDoc.type} Document</p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedPdf({ filename: selectedDoc.filename, url: selectedDoc.url })}
                        className="px-3 py-1.5 bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#a855f7] text-xs font-medium rounded-lg transition-all duration-300"
                      >
                        View PDF
                      </button>
                    </div>

                    {/* Extracted fields */}
                    {fields.length > 0 ? (
                      <div className="mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {fields.slice(0, maxFields).map(([key, value]) => (
                            <div key={key} className="bg-[#1a1a22] border border-[#2a2a32] rounded p-2">
                              <p className="text-xs text-[#9ca3af] mb-0.5 truncate">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                              </p>
                              <p className="text-xs font-medium text-[#f3f4f6] break-words">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                        {fields.length > 12 && (
                          <div className="mt-2 text-right">
                            <button
                              onClick={() => setShowAllDocFields((v) => !v)}
                              className="text-xs text-[#a855f7] hover:text-[#c084fc]"
                            >
                              {showAllDocFields ? "Show less" : `Show all ${fields.length} fields`}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9ca3af] mt-3">No extracted fields available</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* AI & ML Insights (moved to main column) */}
            <div id="ai" className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
              <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">AI & ML Insights</h3>
              {(() => {
                const mlScores = (claim as any).ml_scores || {};
                const ai = (claim as any).ai_analysis || {};
                const fraudScore = (claim as any).fraud_score ?? mlScores.fraud_score ?? ai.fraud_score ?? null;
                const complexityScore = (claim as any).complexity_score ?? mlScores.complexity_score ?? ai.complexity_score ?? null;
                const severityLevel = (claim as any).severity_level ?? mlScores.severity_level ?? claim.severity ?? null;
                const litigationScore = mlScores.litigation_score ?? null;
                const litigationFlag = mlScores.litigation_flag ?? false;
                const litigationReasons = mlScores.litigation_reasons || [];
                const subrogationScore = mlScores.subrogation_score ?? null;
                const subrogationFlag = mlScores.subrogation_flag ?? false;
                const subrogationReasons = mlScores.subrogation_reasons || [];
                const fraudLabel = ai.fraud_risk;
                const complexityLabel = ai.complexity_assessment;
                const riskFactors = ai.risk_factors || [];

                return (
                  <div className="space-y-4">
                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {fraudScore !== null && Number.isFinite(fraudScore) && (
                        <div className="bg-[#0b0b0f] border border-[#2a2a32] rounded p-3">
                          <p className="text-xs text-[#9ca3af] mb-1">Fraud</p>
                          <p className={`text-lg font-bold ${fraudScore >= 0.6 ? "text-red-400" : fraudScore > 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                            {(fraudScore * 100).toFixed(1)}%
                          </p>
                          {fraudLabel && <p className="text-[11px] text-[#9ca3af] mt-0.5">{fraudLabel}</p>}
                        </div>
                      )}
                      {complexityScore !== null && Number.isFinite(complexityScore) && (
                        <div className="bg-[#0b0b0f] border border-[#2a2a32] rounded p-3">
                          <p className="text-xs text-[#9ca3af] mb-1">Complexity</p>
                          <p className="text-lg font-bold text-[#a855f7]">{complexityScore.toFixed(1)}</p>
                          {complexityLabel && <p className="text-[11px] text-[#9ca3af] mt-0.5">{complexityLabel}</p>}
                        </div>
                      )}
                      {severityLevel && (
                        <div className="bg-[#0b0b0f] border border-[#2a2a32] rounded p-3">
                          <p className="text-xs text-[#9ca3af] mb-1">Severity</p>
                          <p className={`text-lg font-bold ${
                            severityLevel === "High" ? "text-red-400" :
                            severityLevel === "Medium" ? "text-yellow-400" : "text-green-400"}`}>{severityLevel}</p>
                        </div>
                      )}
                    </div>

                    {/* Bars */}
                    {fraudScore !== null && Number.isFinite(fraudScore) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-[#9ca3af]">Fraud Score</span>
                          <span className={`text-sm font-bold ${fraudScore >= 0.6 ? "text-red-400" : fraudScore > 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                            {(fraudScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#0b0b0f] rounded-full h-2">
                          <div className={`h-2 rounded-full ${fraudScore >= 0.6 ? "bg-red-500" : fraudScore > 0.3 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(fraudScore * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {complexityScore !== null && Number.isFinite(complexityScore) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-[#9ca3af]">Complexity Score</span>
                          <span className="text-sm font-bold text-[#a855f7]">{complexityScore.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-[#0b0b0f] rounded-full h-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-[#a855f7] to-[#ec4899]" style={{ width: `${Math.min((complexityScore / 5) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {severityLevel && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-[#9ca3af]">Severity Level</span>
                          <span className={`text-sm font-bold ${severityLevel === "High" ? "text-red-400" : severityLevel === "Medium" ? "text-yellow-400" : "text-green-400"}`}>{severityLevel}</span>
                        </div>
                        <div className="w-full bg-[#0b0b0f] rounded-full h-2">
                          <div className={`h-2 rounded-full ${severityLevel === "High" ? "bg-red-500" : severityLevel === "Medium" ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: severityLevel === "High" ? "100%" : severityLevel === "Medium" ? "66%" : "33%" }} />
                        </div>
                      </div>
                    )}

                    {/* Litigation & Subrogation */}
                    {(litigationScore !== null || subrogationScore !== null) && (
                      <div className="grid grid-cols-1 gap-4 pt-2 border-t border-[#2a2a32]">
                        {litigationScore !== null && Number.isFinite(litigationScore) && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[#9ca3af]">Litigation Score</span>
                                {litigationFlag && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">Flagged</span>}
                              </div>
                              <span className={`text-sm font-bold ${litigationScore >= 0.5 ? "text-orange-400" : litigationScore >= 0.3 ? "text-yellow-400" : "text-[#9ca3af]"}`}>
                                {(litigationScore * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-[#0b0b0f] rounded-full h-2 mb-2">
                              <div className={`h-2 rounded-full ${litigationScore >= 0.5 ? "bg-orange-500" : litigationScore >= 0.3 ? "bg-yellow-500" : "bg-[#4b5563]"}`} style={{ width: `${Math.min(litigationScore * 100, 100)}%` }} />
                            </div>
                            {litigationReasons.length > 0 && (
                              <ul className="space-y-1">
                                {litigationReasons.map((r: string, i: number) => (
                                  <li key={i} className="text-xs text-[#f3f4f6] flex items-start gap-2">
                                    <span className="text-orange-400 mt-0.5">•</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        {subrogationScore !== null && Number.isFinite(subrogationScore) && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[#9ca3af]">Subrogation Score</span>
                                {subrogationFlag && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">Flagged</span>}
                              </div>
                              <span className={`text-sm font-bold ${subrogationScore >= 0.5 ? "text-blue-400" : subrogationScore >= 0.3 ? "text-cyan-400" : "text-[#9ca3af]"}`}>
                                {(subrogationScore * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-[#0b0b0f] rounded-full h-2 mb-2">
                              <div className={`h-2 rounded-full ${subrogationScore >= 0.5 ? "bg-blue-500" : subrogationScore >= 0.3 ? "bg-cyan-500" : "bg-[#4b5563]"}`} style={{ width: `${Math.min(subrogationScore * 100, 100)}%` }} />
                            </div>
                            {subrogationReasons.length > 0 && (
                              <ul className="space-y-1">
                                {subrogationReasons.map((r: string, i: number) => (
                                  <li key={i} className="text-xs text-[#f3f4f6] flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Rationale & Risk Factors */}
                    {(claim as any).rationale || (riskFactors.length > 0) ? (
                      <div className="pt-3 border-t border-[#2a2a32]">
                        {(claim as any).rationale && (
                          <div className="mb-3">
                            <p className="text-xs text-[#9ca3af] mb-1">AI Rationale</p>
                            <div className="text-sm text-[#9ca3af] whitespace-pre-line">
                              {(claim as any).rationale}
                            </div>
                          </div>
                        )}
                        {riskFactors.length > 0 && (
                          <div>
                            <p className="text-xs text-[#9ca3af] mb-1">Risk Factors</p>
                            <ul className="list-disc list-inside space-y-1">
                              {riskFactors.map((factor: string, idx: number) => (
                                <li key={idx} className="text-sm text-[#f3f4f6]">{factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>

            {/* Routing Information (moved to main column) */}
            <div id="routing" className="h-0" />
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

            {/* Confidence Score (moved to main column) */}
            {claim.confidence && (
              <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg p-6 hover:border-[#a855f7]/30 transition-all duration-300">
                <h3 className="text-lg font-semibold text-[#f3f4f6] mb-4">Confidence Score</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#9ca3af]">AI Confidence</span>
                      <span className="text-2xl font-bold text-[#a855f7]">{(claim.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-[#0b0b0f] rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-[#a855f7] to-[#ec4899] h-3 rounded-full transition-all shadow-lg shadow-[#a855f7]/30"
                        style={{ width: `${claim.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#9ca3af]">Based on AI analysis of uploaded documents and form data</p>
                </div>
              </div>
            )}

            {/* Evidence Anchor */}
            <div id="evidence" className="h-0" />

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

          {/* Right Column - Chat + Claim Info */}
          <div className="xl:col-span-4 space-y-6 sticky top-24 self-start">
            {/* Claim AI Assistant (Gemini) */}
            <div id="chat" />
            <ClaimChat
              claimId={claim.id}
              claimSummary={{
                claimant: claim.claimant,
                claim_number: (claim as any).claim_number || claim.id,
                policy_no: (claim as any).policy_no || (claim as any).policyNumber,
                loss_type: claim.loss_type,
              }}
            />
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
