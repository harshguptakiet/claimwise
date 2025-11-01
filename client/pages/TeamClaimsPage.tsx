import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import Badge from "@/components/shared/Badge";
import ReassignModal from "@/components/claims/ReassignModal";
import { fetchClaims, ClaimResponse } from "@/api/claims";
import { useClaimsWebSocket } from "@/hooks/useClaimsWebSocket";

const TeamClaimsPage = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedQueue, setSelectedQueue] = useState("");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  useClaimsWebSocket({
    onClaimCreated: (newClaim) => {
      setClaims((prev) => [newClaim, ...prev]);
    },
    onClaimUpdated: (updatedClaim) => {
      setClaims((prev) =>
        prev.map((claim) =>
          claim.id === updatedClaim.id ? updatedClaim : claim,
        ),
      );
    },
  });

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await fetchClaims({
        limit: 25,
        offset: 0,
        severity: selectedSeverity || undefined,
        queue: selectedQueue || undefined,
        search: searchTerm || undefined,
      });
      setClaims(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load claims";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSeverityFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeverity(e.target.value);
  };

  const handleQueueFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedQueue(e.target.value);
  };

  const handleReassign = (claimId: string) => {
    setSelectedClaimId(claimId);
    setShowReassignModal(true);
  };

  const handleReassignSuccess = () => {
    loadClaims();
  };

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
      case "Critical":
        return "border-red-500/30 hover:border-red-500/50";
      case "Medium":
        return "border-yellow-500/30 hover:border-yellow-500/50";
      case "Low":
        return "border-green-500/30 hover:border-green-500/50";
      default:
        return "border-border hover:border-primary/50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0f] to-[#1a1a22]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#f3f4f6] hover:text-[#a855f7] mb-6 transition-all duration-300 ease-in-out"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f3f4f6] mb-2">
            All Submitted Claims
          </h1>
          <p className="text-[#9ca3af]">
            Manage and review all submitted claims
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search claims by ID, claimant name, policy number..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-2 rounded-lg bg-[#1a1a22] border border-[#2a2a32] text-[#f3f4f6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-[#a855f7] transition-all duration-300"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="severity-filter" className="block text-xs font-medium text-[#9ca3af] mb-2">
                Severity
              </label>
              <select
                id="severity-filter"
                value={selectedSeverity}
                onChange={handleSeverityFilter}
                aria-label="Filter claims by severity"
                className="w-full px-4 py-2 rounded-lg bg-[#1a1a22] border border-[#2a2a32] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] transition-all duration-300"
              >
                <option value="">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="queue-filter" className="block text-xs font-medium text-[#9ca3af] mb-2">
                Queue
              </label>
              <select
                id="queue-filter"
                value={selectedQueue}
                onChange={handleQueueFilter}
                aria-label="Filter claims by queue"
                className="w-full px-4 py-2 rounded-lg bg-[#1a1a22] border border-[#2a2a32] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#a855f7] transition-all duration-300"
              >
                <option value="">All Queues</option>
                <option value="Fraud Detection">Fraud Detection</option>
                <option value="Auto Claims">Auto Claims</option>
                <option value="Standard">Standard</option>
                <option value="Priority">Priority</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadClaims}
                className="w-full px-6 py-2 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-lg hover:from-[#9333ea] hover:to-[#db2777] transition-all duration-300 ease-in-out font-medium shadow-lg shadow-[#a855f7]/20 hover:shadow-[#a855f7]/40"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Claims Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-t-[#a855f7] border-[#a855f7]/20 mx-auto mb-4"></div>
              <p className="text-[#9ca3af]">Loading claims...</p>
            </div>
          </div>
        ) : claims.length === 0 ? (
          <div className="border border-[#2a2a32] rounded-lg p-12 text-center bg-[#1a1a22]/50 backdrop-blur-sm">
            <div className="animate-pulse-glow">
              <FileText className="w-16 h-16 mx-auto text-[#6b7280] mb-4" />
            </div>
            <p className="text-[#9ca3af] text-lg">No claims found</p>
            <p className="text-[#6b7280] text-sm mt-2">
              Claims will appear here once users submit them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => (
              <div
                key={claim.id}
                onClick={() => navigate(`/team/claims/${claim.id}`)}
                className={`group relative bg-[#1a1a22] border ${getSeverityColor(
                  claim.severity,
                )} rounded-lg p-6 cursor-pointer transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-[#a855f7]/20 hover:-translate-y-1`}
              >
                {/* Claim Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-mono text-[#a855f7] truncate mb-1 group-hover:text-[#c084fc] transition-colors">
                      {claim.id}
                    </h3>
                    <p className="text-lg font-semibold text-[#f3f4f6] truncate">
                      {claim.claimant}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6b7280] group-hover:text-[#a855f7] transition-all duration-300 group-hover:translate-x-1 flex-shrink-0" />
                </div>

                {/* Claim Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9ca3af]">Policy Number</span>
                    <span className="text-sm font-medium text-[#f3f4f6]">
                      {claim.policy_no}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9ca3af]">Claim Type</span>
                    <span className="text-sm text-[#f3f4f6]">
                      {claim.loss_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9ca3af]">Created</span>
                    <span className="text-sm text-[#9ca3af]">
                      {formatDate(claim.created_at)}
                    </span>
                  </div>
                </div>

                {/* Scores and Status */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2a2a32]">
                  <div>
                    <p className="text-xs text-[#9ca3af] mb-1">Severity</p>
                    <Badge variant="severity" severity={claim.severity}>
                      {claim.severity}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#9ca3af] mb-1">Confidence</p>
                    <span className="text-sm font-bold text-[#a855f7]">
                      {(claim.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Badge variant="queue">{claim.queue}</Badge>
                  <Badge variant="status" status={claim.status}>
                    {claim.status}
                  </Badge>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#a855f7]/0 via-[#a855f7]/5 to-[#a855f7]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      {selectedClaimId && (
        <ReassignModal
          isOpen={showReassignModal}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedClaimId(null);
          }}
          claimId={selectedClaimId}
          onSuccess={handleReassignSuccess}
        />
      )}
    </div>
  );
};

export default TeamClaimsPage;
