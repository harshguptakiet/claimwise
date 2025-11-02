import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { reassignClaim, fetchClaim } from "@/api/claims";

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: string;
  onSuccess?: () => void;
}

// Department options based on routing logic
const DEPARTMENT_TEAMS = [
  { id: "health-dept-high", name: "Health Dept - High", adjusters: ["Senior Adjuster"] },
  { id: "health-dept-mid", name: "Health Dept - Mid", adjusters: ["Standard Adjuster"] },
  { id: "health-dept-low", name: "Health Dept - Low", adjusters: ["Junior Adjuster"] },
  { id: "accident-dept-high", name: "Accident Dept - High", adjusters: ["Senior Adjuster"] },
  { id: "accident-dept-mid", name: "Accident Dept - Mid", adjusters: ["Standard Adjuster"] },
  { id: "accident-dept-low", name: "Accident Dept - Low", adjusters: ["Junior Adjuster"] },
  { id: "siu-fraud", name: "SIU (Fraud)", adjusters: ["SIU Investigator"] },
];

const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  claimId,
  onSuccess,
}) => {
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [claim, setClaim] = useState<any>(null);

  useEffect(() => {
    if (isOpen && claimId) {
      loadClaim();
    }
  }, [isOpen, claimId]);

  const loadClaim = async () => {
    setLoadingClaim(true);
    try {
      const data = await fetchClaim(claimId);
      setClaim(data);
      
      // Auto-determine the correct team based on ML scores and claim type
      const recommendedTeam = getRecommendedTeam(data);
      setSelectedQueue(recommendedTeam);
      
      // Set default adjuster for the recommended team
      const team = DEPARTMENT_TEAMS.find(t => t.id === recommendedTeam);
      if (team && team.adjusters.length > 0) {
        setSelectedAssignee(team.adjusters[0]);
      }
    } catch (error) {
      toast.error("Failed to load claim details");
    } finally {
      setLoadingClaim(false);
    }
  };

  // Calculate recommended team based on ML scores and claim type
  const getRecommendedTeam = (claimData: any): string => {
    const claimType = claimData.claim_type || claimData.loss_type || "accident";
    const mlScores = claimData.ml_scores || {};
    const fraudScore = mlScores.fraud_score ?? claimData.fraud_score ?? 0.0;
    const complexityScore = mlScores.complexity_score ?? claimData.complexity_score ?? 1.0;
    const severityLevel = mlScores.severity_level ?? claimData.severity_level ?? "Low";
    
    // Check for high fraud first (overrides everything)
    if (fraudScore >= 0.6) {
      return "siu-fraud";
    }
    
    // Determine department
    const isHealth = claimType === "medical" || claimType === "health";
    const deptPrefix = isHealth ? "health-dept" : "accident-dept";
    
    // Determine level based on severity and complexity
    const severityCategory = severityLevel.toLowerCase();
    let complexityCategory = "low";
    if (complexityScore >= 3.5) {
      complexityCategory = "high";
    } else if (complexityScore >= 2.0) {
      complexityCategory = "mid";
    }
    
    // Use higher of severity or complexity
    let level = "low";
    if (severityCategory === "high" || complexityCategory === "high") {
      level = "high";
    } else if (severityCategory === "medium" || severityCategory === "mid" || complexityCategory === "mid") {
      level = "mid";
    }
    
    return `${deptPrefix}-${level}`;
  };

  const currentTeam = DEPARTMENT_TEAMS.find((t) => t.id === selectedQueue);
  const assignees = currentTeam?.adjusters || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQueue || !selectedAssignee) {
      toast.error("Please select a team and assignee");
      return;
    }

    setLoading(true);
    try {
      // Convert team ID to team name for backend
      const teamName = currentTeam?.name || selectedQueue;
      
      await reassignClaim(claimId, {
        queue: teamName,  // Send team name to backend
        assignee: selectedAssignee,
        note: note,
      });
      toast.success("Claim rerouted successfully");
      onSuccess?.();  // This will refresh the queue
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reroute claim";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a1a22] border border-[#2a2a32] rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#f3f4f6]">
            Reroute Claim
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2a2a32] rounded-lg transition-colors text-[#9ca3af] hover:text-[#f3f4f6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingClaim ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-t-[#a855f7] border-[#a855f7]/20 mx-auto mb-4"></div>
            <p className="text-[#9ca3af]">Loading claim details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {claim && (
              <div className="bg-[#0b0b0f] border border-[#2a2a32] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#9ca3af] mb-1">Current Claim Type</p>
                <p className="text-sm font-medium text-[#f3f4f6] capitalize">
                  {(claim.claim_type || claim.loss_type || "accident")}
                </p>
                {claim.ml_scores && (
                  <>
                    <p className="text-sm text-[#9ca3af] mt-2 mb-1">Severity</p>
                    <p className="text-sm font-medium text-[#f3f4f6]">
                      {claim.ml_scores.severity_level || claim.severity_level || "Low"}
                    </p>
                    <p className="text-sm text-[#9ca3af] mt-2 mb-1">Complexity Score</p>
                    <p className="text-sm font-medium text-[#f3f4f6]">
                      {claim.ml_scores.complexity_score?.toFixed(1) || claim.complexity_score?.toFixed(1) || "1.0"}
                    </p>
                  </>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-[#f3f4f6] mb-2">
                Route To Team *
              </label>
              <select
                value={selectedQueue}
                onChange={(e) => {
                  setSelectedQueue(e.target.value);
                  const team = DEPARTMENT_TEAMS.find(t => t.id === e.target.value);
                  if (team && team.adjusters.length > 0) {
                    setSelectedAssignee(team.adjusters[0]);
                  } else {
                    setSelectedAssignee("");
                  }
                }}
                disabled={loadingClaim}
                className="w-full px-4 py-2 rounded-lg bg-[#0b0b0f] border border-[#2a2a32] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] disabled:opacity-50"
              >
                <option value="">Select team</option>
                {DEPARTMENT_TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {selectedQueue && (
                <p className="text-xs text-[#9ca3af] mt-1">
                  {currentTeam?.name === "Health Dept - High" ? "Health Department - High Complexity Team" :
                   currentTeam?.name === "Health Dept - Mid" ? "Health Department - Medium Complexity Team" :
                   currentTeam?.name === "Health Dept - Low" ? "Health Department - Standard Processing Team" :
                   currentTeam?.name === "Accident Dept - High" ? "Accident Department - High Complexity Team" :
                   currentTeam?.name === "Accident Dept - Mid" ? "Accident Department - Medium Complexity Team" :
                   currentTeam?.name === "Accident Dept - Low" ? "Accident Department - Standard Processing Team" :
                   currentTeam?.name === "SIU (Fraud)" ? "Special Investigation Unit" :
                   ""}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f3f4f6] mb-2">
                Assignee *
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                disabled={assignees.length === 0 || loadingClaim}
                className="w-full px-4 py-2 rounded-lg bg-[#0b0b0f] border border-[#2a2a32] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] disabled:opacity-50"
              >
                <option value="">Select assignee</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f3f4f6] mb-2">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note for the assignee..."
                className="w-full px-4 py-2 rounded-lg bg-[#0b0b0f] border border-[#2a2a32] text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[#2a2a32] text-[#f3f4f6] rounded-lg hover:bg-[#2a2a32] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingClaim}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all disabled:opacity-50 font-medium"
              >
                {loading ? "Rerouting..." : "Reroute Claim"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReassignModal;
