import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Badge from "@/components/shared/Badge";
import { ClaimResponse } from "@/api/claims";

interface ClaimTableProps {
  claims: ClaimResponse[];
  isLoading: boolean;
  onReassign: (claimId: string) => void;
}

const ClaimTable: React.FC<ClaimTableProps> = ({
  claims,
  isLoading,
  onReassign,
}) => {
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-t-primary border-primary/20"></div>
        <p className="text-muted-foreground mt-4">Loading claims...</p>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No claims found</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-card border-b border-border">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Claim ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Claimant
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Policy No
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Loss Type
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Created At
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Severity
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Confidence
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Queue
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {claims.map((claim) => (
              <tr
                key={claim.id}
                className="hover:bg-card/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-mono text-primary cursor-pointer hover:underline">
                  <button
                    onClick={() => navigate(`/team/claims/${claim.id}`)}
                    className="hover:text-primary/80 transition-colors"
                  >
                    {claim.id}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {claim.claimant}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {claim.policy_no}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {claim.loss_type}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {formatDate(claim.created_at)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge variant="severity" severity={claim.severity}>
                    {claim.severity}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-foreground">
                  {(claim.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge variant="queue">{claim.queue}</Badge>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/team/claims/${claim.id}`)}
                      className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      View
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => onReassign(claim.id)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Reassign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClaimTable;
